# PHASE 2: UI REDESIGN TICKETS (WEEK 5-6)
**Frontend Component Implementation — Pixel-Perfect from HTML**

---

## 🎨 AGENT 6: Frontend Engineer — Hero Panel Component

**Agent Profile:**
```yaml
name: "HeroPanel-Agent"
type: "Frontend Engineer"
specialization: "React Components"
tools: ["React", "TypeScript", "Tailwind CSS", "Storybook"]
autonomy_level: "Medium"
can_create_files: true
can_modify_files: ["components/dealscope/*"]
must_copy_exactly: ["designs/property-analysis-page.html"]
```

**Ticket: DEAL-006**

```markdown
# TICKET: DEAL-006 — Build Hero Panel Component

**Priority:** P1 HIGH  
**Type:** Feature — UI Component  
**Agent:** Agent 6 (Frontend Engineer)  
**Time:** 3 days  
**Dependencies:** Phase 1 complete

---

## MISSION

Convert the Hero Panel from HTML design to React component with ZERO interpretation.

**Reference HTML:** `.dealscope-specs/dealscope-complete-package/designs/property-analysis-page.html`

**Lines to convert:** 30-135 (Hero Panel section)

---

## FILES TO CREATE

```
components/dealscope/
├── HeroPanel.tsx          (Main component)
├── HeroPanel.module.css   (Styles)
├── MetricCard.tsx         (Reusable metric card)
├── VerdictBadge.tsx       (Verdict badge component)
└── AISummary.tsx          (AI summary box)
```

---

## EXACT HTML TO CONVERT

**Open this file:** `designs/property-analysis-page.html`

**Find this section (lines 30-135):**

```html
<!-- HERO PANEL -->
<div class="hero-panel">
    <div class="property-header">
        <div class="property-title">
            <h1>Regency House, Miles Gray Road, Basildon</h1>
            <div class="property-meta">
                <span>Office</span>
                <span>30,150 sq ft NLA</span>
                <span>Freehold</span>
                <span>100% Vacant</span>
            </div>
        </div>
        <button class="back-btn">← Back to results</button>
    </div>
    
    <!-- AI SUMMARY -->
    <div class="ai-summary">
        <span class="ai-badge">AI SUMMARY</span>
        <h3>Deal Overview</h3>
        <p>...</p>
    </div>
    
    <!-- METRICS GRID -->
    <div class="metrics-grid">
        <div class="metric-card verdict-card">
            <span class="verdict-badge verdict-conditional">⚠️ CONDITIONAL</span>
            <h3 class="verdict-title">Discount Required</h3>
            <p class="verdict-subtitle">Pursue at £6.0m-£6.5m (7-14% off asking)</p>
        </div>
        
        <div class="metric-card">
            <div class="metric-label">Asking Price</div>
            <div class="metric-value">£7.0m</div>
            <div class="metric-subtitle">£183 psf</div>
        </div>
        <!-- ... more metric cards -->
    </div>
    
    <!-- ACTION BAR -->
    <div class="action-bar">
        <button class="btn btn-primary">📄 Export IC Memo PDF</button>
        <button class="btn btn-secondary">+ Add to Pipeline</button>
        <!-- ... more buttons -->
    </div>
</div>
```

---

## IMPLEMENTATION REQUIREMENTS

### **1. HeroPanel.tsx**

**CRITICAL RULES:**
- ✅ Copy HTML structure EXACTLY
- ✅ Use ALL the same class names
- ✅ Convert to React props for dynamic data
- ❌ Do NOT redesign layout
- ❌ Do NOT change colors
- ❌ Do NOT add new features

```typescript
// HeroPanel.tsx
import React from 'react';
import styles from './HeroPanel.module.css';
import { MetricCard } from './MetricCard';
import { VerdictBadge } from './VerdictBadge';
import { AISummary } from './AISummary';

interface HeroPanelProps {
  property: {
    name: string;
    type: string;
    size: number;
    tenure: string;
    occupancy: string;
  };
  verdict: {
    type: 'PROCEED' | 'CONDITIONAL' | 'REJECT';
    title: string;
    subtitle: string;
  };
  metrics: Array<{
    label: string;
    value: string;
    subtitle?: string;
  }>;
  aiSummary: string;
  onExportMemo: () => void;
  onAddToPipeline: () => void;
  onWatch: () => void;
  onContact: () => void;
}

export const HeroPanel: React.FC<HeroPanelProps> = ({
  property,
  verdict,
  metrics,
  aiSummary,
  onExportMemo,
  onAddToPipeline,
  onWatch,
  onContact
}) => {
  return (
    <div className={styles.heroPanel}>
      {/* Property Header */}
      <div className={styles.propertyHeader}>
        <div className={styles.propertyTitle}>
          <h1>{property.name}</h1>
          <div className={styles.propertyMeta}>
            <span>{property.type}</span>
            <span>{property.size.toLocaleString()} sq ft NLA</span>
            <span>{property.tenure}</span>
            <span>{property.occupancy}</span>
          </div>
        </div>
        <button className={styles.backBtn}>← Back to results</button>
      </div>
      
      {/* AI Summary */}
      <AISummary content={aiSummary} />
      
      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {/* Verdict Card (spans 2 columns) */}
        <div className={`${styles.metricCard} ${styles.verdictCard}`}>
          <VerdictBadge type={verdict.type} />
          <h3 className={styles.verdictTitle}>{verdict.title}</h3>
          <p className={styles.verdictSubtitle}>{verdict.subtitle}</p>
        </div>
        
        {/* Other Metrics */}
        {metrics.map((metric, i) => (
          <MetricCard key={i} {...metric} />
        ))}
      </div>
      
      {/* Action Bar */}
      <div className={styles.actionBar}>
        <button className="btn btn-primary" onClick={onExportMemo}>
          📄 Export IC Memo PDF
        </button>
        <button className="btn btn-secondary" onClick={onAddToPipeline}>
          + Add to Pipeline
        </button>
        <button className="btn btn-secondary" onClick={onWatch}>
          👁 Watch
        </button>
        <button className="btn btn-secondary" onClick={onContact}>
          📧 Contact Agent
        </button>
      </div>
    </div>
  );
};
```

### **2. HeroPanel.module.css**

**Copy CSS EXACTLY from design:**

```css
/* Copy from property-analysis-page.html <style> section */
/* Lines with .hero-panel, .metrics-grid, .metric-card, etc. */

.heroPanel {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(180deg, #09090b 0%, #0d0d0f 100%);
  border-bottom: 1px solid #27272a;
  padding: 20px 32px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.propertyHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.propertyTitle h1 {
  font-size: 22px;
  font-weight: 500;
  color: #fafafa;
}

.propertyMeta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #a1a1aa;
  margin-top: 4px;
}

/* [COPY ALL OTHER STYLES FROM HTML FILE] */
```

---

## STORYBOOK STORIES

Create `HeroPanel.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { HeroPanel } from './HeroPanel';

const meta: Meta<typeof HeroPanel> = {
  title: 'DealScope/HeroPanel',
  component: HeroPanel,
};

export default meta;
type Story = StoryObj<typeof HeroPanel>;

export const RegencyHouse: Story = {
  args: {
    property: {
      name: 'Regency House, Miles Gray Road, Basildon',
      type: 'Office',
      size: 30150,
      tenure: 'Freehold',
      occupancy: '100% Vacant'
    },
    verdict: {
      type: 'CONDITIONAL',
      title: 'Discount Required',
      subtitle: 'Pursue at £6.0m-£6.5m (7-14% off asking)'
    },
    metrics: [
      { label: 'Asking Price', value: '£7.0m', subtitle: '£183 psf' },
      { label: 'Market Range', value: '£6.2-7.1m', subtitle: 'Based on comps' },
      { label: 'Max Entry (15% IRR)', value: '£6.0-6.5m', subtitle: 'Conservative case' }
    ],
    aiSummary: 'Leasing execution play on recently refurbished vacant office...',
    onExportMemo: () => alert('Export Memo'),
    onAddToPipeline: () => alert('Add to Pipeline'),
    onWatch: () => alert('Watch'),
    onContact: () => alert('Contact')
  }
};
```

---

## TESTING REQUIREMENTS

### Visual Regression Test

```typescript
import { render } from '@testing-library/react';
import { HeroPanel } from './HeroPanel';

describe('HeroPanel Visual Tests', () => {
  test('matches design snapshot', () => {
    const { container } = render(<HeroPanel {...testProps} />);
    expect(container).toMatchSnapshot();
  });
  
  test('hero panel is sticky', () => {
    const { container } = render(<HeroPanel {...testProps} />);
    const panel = container.querySelector('.heroPanel');
    expect(panel).toHaveStyle({ position: 'sticky', top: '0' });
  });
  
  test('verdict badge color matches design', () => {
    const { getByText } = render(<HeroPanel {...testProps} />);
    const badge = getByText('⚠️ CONDITIONAL');
    expect(badge).toHaveStyle({
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#fbbf24'
    });
  });
});
```

---

## ACCEPTANCE CRITERIA

**Visual Checks (Compare to HTML):**
- [ ] Layout matches pixel-perfect (use browser DevTools overlay)
- [ ] Colors match exactly (#7c6af0, #f59e0b, etc.)
- [ ] Spacing matches (20px, 32px, 16px, etc.)
- [ ] Fonts match (DM Sans, JetBrains Mono)
- [ ] Sticky behavior works
- [ ] Responsive on mobile

**Functional Checks:**
- [ ] All buttons work (onClick handlers fire)
- [ ] Props update component correctly
- [ ] Storybook renders all variations
- [ ] Tests pass (100%)

**Code Quality:**
- [ ] TypeScript compiles with no errors
- [ ] No ESLint warnings
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Performance: Renders in <16ms

---

## DEFINITION OF DONE

- [ ] Component created and styled
- [ ] Storybook stories complete
- [ ] Visual regression tests pass
- [ ] Pixel-perfect match to design
- [ ] PR created: "feat(ui): implement hero panel component"
- [ ] Design review approved
- [ ] Code review approved
- [ ] Merged to main

**Timeline:** 3 days
- Day 1: Component structure + basic styling
- Day 2: Polish + pixel-perfect matching
- Day 3: Tests + Storybook + PR

---

## PIXEL-PERFECT CHECKLIST

Use this checklist to verify exact match:

```
[ ] Background gradient: linear-gradient(180deg, #09090b 0%, #0d0d0f 100%)
[ ] Border bottom: 1px solid #27272a
[ ] Padding: 20px 32px
[ ] Box shadow: 0 4px 20px rgba(0,0,0,0.4)
[ ] Property title font: 22px, weight 500
[ ] Meta text color: #a1a1aa
[ ] Meta font size: 13px
[ ] Verdict badge background: rgba(245, 158, 11, 0.15)
[ ] Verdict badge color: #fbbf24
[ ] Verdict badge border: 1px solid #f59e0b
[ ] Metric card background: #18181b
[ ] Metric card border: 1px solid #27272a
[ ] Metric value font: JetBrains Mono, 24px
[ ] Button primary background: #7c6af0
[ ] Button secondary background: #18181b with 1px solid #3f3f46
```

All items must be ✅ before PR approval.
```

---

## 🎨 AGENT 7: Frontend Engineer — Tab Navigation

**Ticket: DEAL-007**

```markdown
# TICKET: DEAL-007 — Build Tab Navigation & Content Tabs

**Priority:** P1 HIGH  
**Agent:** Agent 7  
**Time:** 3 days  
**Dependencies:** None (parallel with Agent 6)

---

## MISSION

Convert Tab Navigation system from HTML to React.

**Reference:** `designs/property-analysis-page.html` lines 200-500

---

## FILES TO CREATE

```
components/dealscope/
├── TabNavigation.tsx
├── TabContent.tsx
├── OverviewTab.tsx
├── FinancialsTab.tsx
├── ComparablesTab.tsx
└── DueDiligenceTab.tsx
```

---

## EXACT HTML TO CONVERT

Find in `property-analysis-page.html`:

```html
<!-- TAB NAVIGATION -->
<div class="tab-nav">
    <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
    <button class="tab-btn" onclick="switchTab('financials')">Financials</button>
    <button class="tab-btn" onclick="switchTab('comparables')">Comparables</button>
    <button class="tab-btn" onclick="switchTab('due-diligence')">Due Diligence</button>
</div>

<!-- CONTENT -->
<div class="content">
    <div class="tab-content active" id="overview">
        <!-- Overview content -->
    </div>
    <div class="tab-content" id="financials">
        <!-- Financials content -->
    </div>
    <!-- etc -->
</div>
```

---

## IMPLEMENTATION

```typescript
import React, { useState } from 'react';

type TabType = 'overview' | 'financials' | 'comparables' | 'due-diligence';

interface TabNavigationProps {
  defaultTab?: TabType;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  defaultTab = 'overview' 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  
  return (
    <>
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`}
          onClick={() => setActiveTab('financials')}
        >
          Financials
        </button>
        <button 
          className={`tab-btn ${activeTab === 'comparables' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparables')}
        >
          Comparables
        </button>
        <button 
          className={`tab-btn ${activeTab === 'due-diligence' ? 'active' : ''}`}
          onClick={() => setActiveTab('due-diligence')}
        >
          Due Diligence
        </button>
      </div>
      
      <div className="content">
        <TabContent activeTab={activeTab} />
      </div>
    </>
  );
};
```

---

## ACCEPTANCE CRITERIA

- [ ] Tab switching works smoothly
- [ ] Active tab styling correct (purple underline)
- [ ] Sticky behavior (stays below hero panel)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] URL updates with tab (?tab=financials)
- [ ] Pixel-perfect match to design

**Timeline:** 3 days
```

---

## 🎨 AGENT 8: Frontend Engineer — Data Components

**Ticket: DEAL-008**

```markdown
# TICKET: DEAL-008 — Build Reusable Data Components

**Priority:** P1 HIGH  
**Agent:** Agent 8  
**Time:** 3 days  
**Dependencies:** None

---

## MISSION

Create reusable table, card, and callout components from design system.

**Reference:** `designs/design-system-complete.html`

---

## FILES TO CREATE

```
components/dealscope/ui/
├── DataTable.tsx
├── DataCard.tsx
├── Callout.tsx
├── Badge.tsx
├── MetricCard.tsx (if not done by Agent 6)
└── [component].module.css files
```

---

## COMPONENTS TO BUILD

### 1. DataTable

```typescript
interface DataTableProps {
  headers: string[];
  rows: Array<Record<string, any>>;
  hoverable?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  hoverable = true
}) => {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {headers.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={hoverable ? 'hoverable' : ''}>
              {Object.values(row).map((val, j) => (
                <td key={j}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 2. DataCard

```typescript
interface DataCardProps {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
}

export const DataCard: React.FC<DataCardProps> = ({ title, rows }) => {
  return (
    <div className="card">
      <h4>{title}</h4>
      {rows.map(({ label, value }) => (
        <div className="card-row" key={label}>
          <span className="card-label">{label}</span>
          <span className="card-value">{value}</span>
        </div>
      ))}
    </div>
  );
};
```

### 3. Callout

```typescript
interface CalloutProps {
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  children: React.ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({ type, title, children }) => {
  return (
    <div className={`callout callout-${type}`}>
      <h4>{title}</h4>
      {children}
    </div>
  );
};
```

---

## ACCEPTANCE CRITERIA

- [ ] All components pixel-perfect to design
- [ ] Fully typed with TypeScript
- [ ] Storybook stories for each
- [ ] Unit tests pass
- [ ] Works with real data

**Timeline:** 3 days
```

---

## 📊 PHASE 2 EXECUTION PLAN

```
Week 5:
  Day 1: Code review of Phase 1 + Setup
  Day 2-4: Agents 6, 7, 8 work in parallel
  
Week 6:
  Day 1-2: Integration + polish
  Day 3: Design review + fixes
  Day 4-5: Deploy to staging + QA
```

---

## ✅ COMPLETE TICKET SUMMARY

**Phase 1 (Backend - Week 1-2):**
- ✅ DEAL-001: IRR Fix (Agent 1)
- ✅ DEAL-002: Rent Extraction (Agent 2)
- ✅ DEAL-003: CAPEX Detection (Agent 3)
- ✅ DEAL-004: NIY & Multiples (Agent 4)
- ✅ DEAL-005: Integration Testing (Agent 5)

**Phase 2 (Frontend - Week 5-6):**
- ✅ DEAL-006: Hero Panel (Agent 6)
- ✅ DEAL-007: Tab Navigation (Agent 7)
- ✅ DEAL-008: Data Components (Agent 8)

**All tickets include:**
- Exact files to modify/create
- Exact code to copy
- Pixel-perfect acceptance criteria
- Clear test requirements
- No interpretation needed
