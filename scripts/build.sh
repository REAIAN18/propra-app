#!/bin/bash
set -e

# Generate Prisma client
prisma generate

# Mark migrations that were applied elsewhere or partially applied as applied
prisma migrate resolve --applied "20260329234500_add_vendor_approach" || true
prisma migrate resolve --applied "20260401_add_dealscope_models" || true

# Mark migrations that failed as rolled back
prisma migrate resolve --rolled-back "1774998935_add_dealscope_pipeline_indexes" || true

# Deploy remaining pending migrations
prisma migrate deploy

# Type check
npm run type-check

# Build Next.js
npm run build
