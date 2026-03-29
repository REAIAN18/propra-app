# Financing v2 Components (PRO-801)

Three new components for financing page enhancements:

## 1. CovenantMonitoring

Displays loan covenant status with LTV/DSCR vs thresholds.

**Props:**
```typescript
{
  loans: Loan[];  // Array of loans with covenant data
  currency: string;  // "GBP" or "USD"
}
```

**Features:**
- GREEN (>10% headroom), AMBER (<10%), RED (breach) alerts
- Shows LTV and DSCR vs covenant thresholds
- Warning summary at bottom

## 2. MaturityCalendar

Timeline view of loan maturities.

**Props:**
```typescript
{
  loans: Loan[];  // Array of loans with maturity dates
  currency: string;  // "GBP" or "USD"
}
```

**Features:**
- 4-year timeline view
- Color-coded bars: red (<18mo), amber (18-24mo), blue (24-36mo), green (>36mo)
- Action alerts for loans maturing within 18 months

## 3. RateSensitivity

SOFR scenario analysis showing impact on debt service and DSCR.

**Props:**
```typescript
{
  loans: Loan[];  // Array of loans with rate data
  currency: string;  // "GBP" or "USD"
  currentSOFR: number;  // Current SOFR rate (e.g., 5.32)
  portfolioNOI: number;  // Portfolio NOI for DSCR calculation
}
```

**Features:**
- 5 scenarios: −50bps, −25bps, current, +25bps, +50bps
- Shows impact on wtd avg rate, debt service, DSCR
- Floating vs fixed debt split

## Integration Example

```typescript
import { CovenantMonitoring } from "@/components/financing/CovenantMonitoring";
import { MaturityCalendar } from "@/components/financing/MaturityCalendar";
import { RateSensitivity } from "@/components/financing/RateSensitivity";

export default function FinancingPage() {
  const [loans, setLoans] = useState([]);
  const [sofrRate, setSOFRRate] = useState(5.32);

  useEffect(() => {
    async function fetchData() {
      // Fetch actual loans from new API
      const res = await fetch("/api/user/loans");
      const data = await res.json();
      setLoans(data.loans);

      // Fetch current SOFR
      const sofrRes = await fetch("/api/macro/sofr");
      const sofrData = await sofrRes.json();
      setSOFRRate(sofrData.rate);
    }
    fetchData();
  }, []);

  const portfolioNOI = loans.reduce((sum, l) => {
    // Calculate NOI from asset if available
    return sum + (l.asset?.netIncome || 0);
  }, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Existing KPIs... */}

        {/* NEW: Rate Sensitivity */}
        <RateSensitivity
          loans={loans}
          currency="USD"
          currentSOFR={sofrRate}
          portfolioNOI={portfolioNOI}
        />

        {/* NEW: Covenant Monitoring */}
        <CovenantMonitoring loans={loans} currency="USD" />

        {/* NEW: Maturity Calendar */}
        <MaturityCalendar loans={loans} currency="USD" />

        {/* Existing sections... */}
      </div>
    </AppShell>
  );
}
```

## API Integration

New API endpoints created:

- `GET /api/user/loans` - Fetch all user loans
- `POST /api/user/loans` - Create new loan
- `GET /api/user/loans/[loanId]` - Fetch single loan
- `PUT /api/user/loans/[loanId]` - Update loan
- `DELETE /api/user/loans/[loanId]` - Delete loan

## Database Models

Two new Prisma models:

**Loan:**
- Core fields: lender, outstandingBalance, rate, rateType, maturityDate
- Covenant fields: ltvCovenant, dscrCovenant, currentLTV, currentDSCR
- Relations: userId, assetId (optional)

**LenderRelationship:**
- Fields: lenderName, contactName, contactEmail, contactPhone, notes
- Stats: loansCount, avgRate, avgLTV
- Relations: userId

## Next Steps

1. Wire these components into the existing financing page
2. Add loan creation/edit modal
3. Connect to live SOFR API data
4. Add lender relationship management UI
