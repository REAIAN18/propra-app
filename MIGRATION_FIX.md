# Migration Fix — PRO-786

## Problem
Prisma migration `20260329_transactions_v2_fields` failed during Vercel deployment and is blocking ALL future deployments.

**Error**: `P3009 - migrate found failed migrations in the target database`

## Why This Happened
The migration was pushed on branch `feat/pro-776-work-orders-v2` and attempted to deploy, but failed mid-execution. Prisma's migration system now considers it "failed" in the production database, preventing any new deployments.

## Why It's Safe to Resolve
The migration uses `IF NOT EXISTS` clauses for all schema changes:
```sql
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "assetName" TEXT;
ALTER TABLE "TransactionRoom" ADD COLUMN IF NOT EXISTS "dealAddress" TEXT;
-- ... etc
```

These statements are **idempotent** — they can be run multiple times safely.

## Fix Steps

### Option 1: Using Vercel CLI (Recommended)
```bash
# 1. Pull production env vars (requires Vercel authentication)
vercel env pull .env.local

# 2. Mark the migration as applied
npx prisma migrate resolve --applied 20260329_transactions_v2_fields

# 3. Verify migration status
npx prisma migrate status

# 4. Test that new deployments work
git push origin feat/pro-776-work-orders-v2
```

### Option 2: Manual Database Access
If you have direct Supabase access:
```bash
# 1. Set DATABASE_URL to Supabase direct connection (port 5432)
export DATABASE_URL="postgresql://postgres.[project-id]:[password]@db.[project-id].supabase.co:5432/postgres"

# 2. Mark migration as resolved
npx prisma migrate resolve --applied 20260329_transactions_v2_fields

# 3. Verify
npx prisma migrate status
```

### Option 3: Emergency Workaround (Last Resort)
If the migration can't be resolved, roll back the branch:
```bash
# Remove the problematic migration from the branch
git checkout feat/pro-776-work-orders-v2
git revert <commit-with-migration>
git push origin feat/pro-776-work-orders-v2
```

## Migration Content
See: `prisma/migrations/20260329_transactions_v2_fields/migration.sql` (on feat/pro-776-work-orders-v2 branch)

## Related
- Issue: PRO-786
- Branch: feat/pro-776-work-orders-v2
- Related ticket: PRO-776
