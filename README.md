# RealHQ

Commercial property intelligence. Every asset earning what it should.

## What it does

One property profile that adapts for every audience. Add an address → get satellite imagery, owner info, market benchmarks, insurance analysis, energy optimisation, planning alerts, and actionable findings. Upload documents → leases, insurance schedules, and energy bills are extracted automatically.

## Architecture

5 systems, not 16 pages:

1. **Property Profile** — central data model (Google Maps, ATTOM, Land Registry)
2. **Document Generator** — AI extraction (AWS Textract + Claude) + PDF generation
3. **Portal System** — permissioned sharing with view tracking
4. **Action Engine** — CoverForce (insurance), Octopus (energy), Resend (email)
5. **Learning Loop** — every reaction improves recommendations

## Stack

- Next.js 14 (App Router) on Vercel
- Vercel Postgres (Neon)
- Prisma ORM (54 models)
- TypeScript throughout
- Resend for email (30 templates)

## Key files

- **DECISIONS.md** — Product rules. Highest authority.
- **CLAUDE.md** — Engineering rules. Read before writing code.
- **CODE_INVENTORY.md** — Maps all 23 libs, 70+ APIs, 21 components, 6 hooks, 54 models, 30 emails, 8 crons.
- **docs/designs/** — HTML design files. Pixel-perfect build targets.

## Setup

```bash
npm install
cp .env.example .env.local  # Fill in 19 env vars (see CODE_INVENTORY.md)
npx prisma generate
npx prisma db push
npm run dev
```

## Design

Dark theme. Instrument Serif (display), DM Sans (body), JetBrains Mono (data).

CSS variables: --bg:#09090b --s1:#111116 --acc:#7c6af0 --tx:#e4e4ec
# Vercel rebuild trigger
