# PHASE 5: EXPORT & REPORTING TICKETS (WEEK 9-10)
**IC Memo PDF + Excel Export Implementation**

---

## 📄 AGENT 9: Backend Engineer — IC Memo PDF Export

**Agent Profile:**
```yaml
name: "IC-Memo-Export-Agent"
type: "Backend Engineer"
specialization: "PDF Generation"
tools: ["TypeScript", "Puppeteer", "PDF Generation"]
autonomy_level: "High"
can_create_files: true
can_modify_files: ["api/dealscope/export/*"]
```

**Ticket: DEAL-009**

```markdown
# TICKET: DEAL-009 — IC Memo PDF Export

**Priority:** P2 ENHANCEMENT  
**Type:** Feature — PDF Export  
**Agent:** Agent 9  
**Time:** 4-5 days  
**Dependencies:** Phase 1 complete (need correct calculations)

---

## MISSION

Build PDF export that generates Investment Committee Memo from HTML template.

**Reference:** `.dealscope-specs/dealscope-complete-package/designs/ic-memo-template.html`

**Output:** Print-ready PDF (A4, 10-12 pages)

---

## FILES TO CREATE

```
api/dealscope/export/
├── ic-memo/
│   ├── route.ts              (API endpoint)
│   ├── generate.ts           (PDF generation logic)
│   ├── template.html         (Copy from design)
│   └── styles.css            (Print styles)
lib/dealscope/export/
├── pdf-generator.ts          (Puppeteer wrapper)
└── memo-data-builder.ts      (Prepare data for template)
```

---

## IMPLEMENTATION APPROACH

### **Technology Stack**

Use **Puppeteer** for HTML → PDF conversion (not jsPDF):
- Maintains exact design fidelity
- Handles complex layouts
- Supports page breaks
- Better for multi-page documents

```bash
npm install puppeteer
npm install @types/puppeteer --save-dev
```

---

## STEP 1: Copy HTML Template Exactly

**Source:** `designs/ic-memo-template.html`

**Create:** `api/dealscope/export/ic-memo/template.html`

**CRITICAL:** Copy the ENTIRE HTML file exactly. Do NOT modify:
- Layout structure
- CSS styling
- Page break logic
- Section ordering

**Only changes allowed:**
- Replace hardcoded "Regency House" data with {{variables}}
- Add template variable syntax (Handlebars or similar)

Example:
```html
<!-- BEFORE (hardcoded) -->
<h1>Regency House, Miles Gray Road, Basildon</h1>
<div class="price">£7,000,000</div>

<!-- AFTER (templated) -->
<h1>{{property.name}}</h1>
<div class="price">{{property.askingPrice | currency}}</div>
```

---

## STEP 2: Build API Endpoint

**File:** `api/dealscope/export/ic-memo/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateICMemoPDF } from './generate';
import { buildMemoData } from '@/lib/dealscope/export/memo-data-builder';

export async function POST(req: NextRequest) {
  try {
    const { propertyId } = await req.json();
    
    // Get property analysis data
    const property = await db.property.findUnique({
      where: { id: propertyId },
      include: {
        analysis: true,
        comparables: true,
        tenancies: true
      }
    });
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    // Build memo data object
    const memoData = buildMemoData(property);
    
    // Generate PDF
    const pdfBuffer = await generateICMemoPDF(memoData);
    
    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="IC-Memo-${property.slug}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('IC Memo generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate IC Memo' },
      { status: 500 }
    );
  }
}
```

---

## STEP 3: PDF Generation Logic

**File:** `api/dealscope/export/ic-memo/generate.ts`

```typescript
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Register Handlebars helpers
Handlebars.registerHelper('currency', (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0
  }).format(value);
});

Handlebars.registerHelper('percentage', (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
});

Handlebars.registerHelper('date', (value: Date) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value));
});

export async function generateICMemoPDF(memoData: any): Promise<Buffer> {
  // Load template
  const templatePath = path.join(process.cwd(), 'api/dealscope/export/ic-memo/template.html');
  const templateHTML = fs.readFileSync(templatePath, 'utf-8');
  
  // Compile template
  const template = Handlebars.compile(templateHTML);
  const html = template(memoData);
  
  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set content
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });
  
  await browser.close();
  
  return pdfBuffer;
}
```

---

## STEP 4: Data Builder

**File:** `lib/dealscope/export/memo-data-builder.ts`

```typescript
interface ICMemoData {
  // Cover page
  property: {
    name: string;
    address: string;
    type: string;
    askingPrice: number;
  };
  verdict: {
    type: 'PROCEED' | 'CONDITIONAL' | 'REJECT';
    recommendation: string;
  };
  generatedDate: Date;
  
  // Executive Summary
  executiveSummary: {
    dealOverview: string;
    keyMetrics: Array<{ label: string; value: string }>;
    investmentCase: string[];
    risks: string[];
  };
  
  // Asset Overview
  assetOverview: {
    photos: string[]; // URLs to property images
    description: string;
    physicalCharacteristics: Array<{ label: string; value: string }>;
  };
  
  // Planning & Environmental
  planning: {
    epcRating: string;
    epcScore: number;
    floodRisk: string;
    useClass: string;
  };
  
  // Market Analysis
  marketAnalysis: {
    macroTrends: string;
    microMarket: string;
    submarket: {
      name: string;
      vacancy: number;
      rentTrend: string;
    };
  };
  
  // Rental Comparables
  rentalComps: Array<{
    address: string;
    size: number;
    rentPSF: number;
    incentive: string;
    date: string;
    distance: number;
  }>;
  
  // Yield Comparables
  yieldComps: Array<{
    property: string;
    price: number;
    niy: number;
    tenancy: string;
    wault: number;
    date: string;
  }>;
  
  // Assumption Gap Analysis
  assumptionGaps: Array<{
    assumption: string;
    ourModel: string;
    marketEvidence: string;
    gap: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  
  // Financial Summary
  financialSummary: {
    acquisitionCosts: Array<{ label: string; value: number }>;
    holdingCosts: Array<{ label: string; value: number }>;
    scenarios: Array<{
      name: string;
      irr: number;
      equityMultiple: number;
      cashOnCash: number;
    }>;
    sensitivity: Array<{
      variable: string;
      pessimistic: string;
      base: string;
      optimistic: string;
    }>;
  };
  
  // Decision Framework
  decisionFramework: {
    maxEntry: number;
    targetReturn: number;
    keyConditions: string[];
  };
}

export function buildMemoData(property: any): ICMemoData {
  return {
    property: {
      name: property.name,
      address: property.address,
      type: property.type,
      askingPrice: property.askingPrice
    },
    verdict: {
      type: property.analysis.verdict,
      recommendation: buildRecommendation(property.analysis)
    },
    generatedDate: new Date(),
    
    executiveSummary: {
      dealOverview: buildDealOverview(property),
      keyMetrics: extractKeyMetrics(property.analysis),
      investmentCase: buildInvestmentCase(property),
      risks: identifyRisks(property)
    },
    
    // ... build all other sections
    
    rentalComps: property.comparables
      .filter(c => c.type === 'rental')
      .map(c => ({
        address: c.address,
        size: c.size,
        rentPSF: c.rentPSF,
        incentive: c.incentive || 'None',
        date: c.date,
        distance: c.distance
      })),
    
    // ... etc
  };
}
```

---

## STEP 5: Print Styles

**File:** `api/dealscope/export/ic-memo/styles.css`

```css
/* Print-specific styles */
@media print {
  body {
    margin: 0;
    padding: 0;
  }
  
  .page-break {
    page-break-after: always;
  }
  
  .no-break {
    page-break-inside: avoid;
  }
  
  /* Ensure dark theme prints correctly */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}

/* Copy all styles from ic-memo-template.html */
```

---

## TESTING

### Test Cases

```typescript
describe('IC Memo PDF Export', () => {
  test('Generates PDF for Regency House', async () => {
    const response = await fetch('/api/dealscope/export/ic-memo', {
      method: 'POST',
      body: JSON.stringify({ propertyId: 'regency-house-id' })
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    
    const blob = await response.blob();
    expect(blob.size).toBeGreaterThan(100000); // At least 100KB
  });
  
  test('PDF contains all 10 sections', async () => {
    const pdf = await generateTestPDF();
    const text = await extractPDFText(pdf);
    
    expect(text).toContain('EXECUTIVE SUMMARY');
    expect(text).toContain('ASSET OVERVIEW');
    expect(text).toContain('RENTAL COMPARABLES');
    expect(text).toContain('FINANCIAL SUMMARY');
    // ... check all sections
  });
});
```

---

## ACCEPTANCE CRITERIA

**Visual:**
- [ ] PDF matches HTML design exactly
- [ ] All 10-12 sections present
- [ ] Page breaks in correct locations
- [ ] Dark theme renders correctly
- [ ] Property images included
- [ ] Tables formatted properly

**Functional:**
- [ ] Generates in <10 seconds
- [ ] File size <5MB
- [ ] Opens in all PDF readers
- [ ] Print-ready (A4, 300dpi equivalent)

**Data:**
- [ ] All calculations correct (uses Phase 1 fixes)
- [ ] Comparables populated
- [ ] Assumption gaps shown
- [ ] Confidence scores visible

---

## DEFINITION OF DONE

- [ ] API endpoint working
- [ ] PDF generation functional
- [ ] Template copied exactly
- [ ] All sections populated with real data
- [ ] Tests passing
- [ ] Works with Regency House
- [ ] PR created: "feat(export): IC Memo PDF generation"

**Timeline:** 4-5 days
- Day 1: Setup Puppeteer, copy template
- Day 2: Build data mapper
- Day 3: API endpoint + PDF generation
- Day 4: Test all sections
- Day 5: Polish + edge cases
```

---

## 📊 AGENT 10: Backend Engineer — Excel Export

**Ticket: DEAL-010**

```markdown
# TICKET: DEAL-010 — Excel Financial Model Export

**Priority:** P2 ENHANCEMENT  
**Agent:** Agent 10  
**Time:** 3 days  
**Dependencies:** Phase 1 complete

---

## MISSION

Export property analysis as Excel workbook with multiple sheets.

**Output:** `.xlsx file` with formatted financial model

---

## FILES TO CREATE

```
api/dealscope/export/
├── excel/
│   ├── route.ts              (API endpoint)
│   └── generate.ts           (Excel generation)
lib/dealscope/export/
└── excel-builder.ts          (ExcelJS wrapper)
```

---

## IMPLEMENTATION

### Technology Stack

Use **ExcelJS** (not xlsx.js):

```bash
npm install exceljs
npm install @types/exceljs --save-dev
```

---

## Workbook Structure

**Sheet 1: Summary**
- Property details
- Key metrics
- Verdict

**Sheet 2: Assumptions**
- All input assumptions
- ERV, yield, void period, etc.
- Confidence scores

**Sheet 3: Acquisition Costs**
- Purchase price
- SDLT, legal, survey
- Total cost in

**Sheet 4: Cash Flow Model**
- Year-by-year projection
- Rental income
- Operating expenses
- Exit proceeds

**Sheet 5: Returns Analysis**
- IRR calculation
- Equity multiple
- Cash-on-cash return
- Sensitivity table

**Sheet 6: Comparables**
- Rental comps
- Yield comps

---

## Code Implementation

```typescript
import ExcelJS from 'exceljs';

export async function generateExcelModel(property: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // SHEET 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  summarySheet.addRows([
    { metric: 'Property', value: property.name },
    { metric: 'Asking Price', value: property.askingPrice },
    { metric: 'IRR', value: property.analysis.irr / 100 }, // Format as %
    // ... more rows
  ]);
  
  // Format currency cells
  summarySheet.getColumn('value').eachCell((cell, rowNumber) => {
    if (rowNumber > 1) { // Skip header
      cell.numFmt = '£#,##0';
    }
  });
  
  // SHEET 2: Cash Flow
  const cashFlowSheet = workbook.addWorksheet('Cash Flow');
  cashFlowSheet.columns = [
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Rental Income', key: 'income', width: 15 },
    { header: 'OpEx', key: 'opex', width: 15 },
    { header: 'NOI', key: 'noi', width: 15 },
    { header: 'Cash Flow', key: 'cashFlow', width: 15 }
  ];
  
  // Add 10 years of projections
  for (let year = 0; year <= 10; year++) {
    const cashFlow = calculateYearCashFlow(property, year);
    cashFlowSheet.addRow({
      year,
      income: cashFlow.income,
      opex: cashFlow.opex,
      noi: cashFlow.noi,
      cashFlow: cashFlow.net
    });
  }
  
  // Format as currency
  ['income', 'opex', 'noi', 'cashFlow'].forEach(col => {
    cashFlowSheet.getColumn(col).numFmt = '£#,##0';
  });
  
  // Add formulas for totals
  const lastRow = cashFlowSheet.lastRow.number;
  cashFlowSheet.getCell(`C${lastRow + 2}`).value = {
    formula: `SUM(C2:C${lastRow + 1})`,
    result: 0
  };
  
  // SHEET 3: Sensitivity Analysis
  const sensitivitySheet = workbook.addWorksheet('Sensitivity');
  // Build 2-way sensitivity table (ERV vs Exit Yield)
  
  // ... continue for all sheets
  
  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
```

---

## API Endpoint

```typescript
// api/dealscope/export/excel/route.ts
export async function POST(req: NextRequest) {
  const { propertyId } = await req.json();
  
  const property = await getPropertyWithAnalysis(propertyId);
  const excelBuffer = await generateExcelModel(property);
  
  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${property.slug}-model.xlsx"`
    }
  });
}
```

---

## ACCEPTANCE CRITERIA

- [ ] Excel file generates successfully
- [ ] All 6 sheets present
- [ ] Formulas work correctly
- [ ] Currency formatted properly
- [ ] Opens in Excel/Google Sheets
- [ ] File size <2MB

**Timeline:** 3 days
```

---

## 🎯 PHASE 5 SUMMARY

**New Agents Required:** 2
- Agent 9: IC Memo PDF Export
- Agent 10: Excel Financial Model

**Timeline:** Week 9-10
**Dependencies:** Phase 1 (calculations) must be complete

**Deliverables:**
1. ✅ IC Memo PDF (10-12 pages, print-ready)
2. ✅ Excel Financial Model (6 sheets, fully formatted)

