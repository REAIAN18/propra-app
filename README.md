# RealHQ

**Property Intelligence Platform** — Commercial property intelligence: G2N benchmarking, insurance placement, energy switching, and portfolio optimisation. Commission-only · No setup fees.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Linting:** ESLint (next/core-web-vitals) + Prettier
- **Deployment:** Vercel (recommended) or Railway

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type check |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

## Environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

## Brand

| Token | Value |
|---|---|
| Navy (background) | `#0B1622` |
| RealHQ Green | `#0A8A4C` |
| Signal Amber | `#F5A94A` |
| Decision Blue | `#1647E8` |
| Display font | Instrument Serif |
| Body font | Geist / Helvetica |

## MVP Scope

- Dashboard: G2N performance, income vs optimised, 3 opportunity buckets
- Insurance placement + energy switching
- Portfolio ticker with live portfolio + market data
- Additional Income / Wins screen
- Compliance tracker
- Hold vs Sell analyser
- AI Scout (acquisitions) with deal scoring and pipeline
- Two demo portfolios: FL Mixed + SE Logistics

See `PRODUCT_BRIEF.md` for full product context.
