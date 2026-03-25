#!/bin/bash
# Migration script: Neon → Supabase
# Supabase project: okyqtkmfxuyjilmxgrcy.supabase.co
#
# REQUIRED ENV VARS (set these before running):
# - VERCEL_TOKEN: Your Vercel API token (get from vercel.com/account/tokens)
# - VERCEL_PROJECT_ID: Your Vercel project ID
# - SUPABASE_DATABASE_URL: Pooler connection (port 6543)
# - SUPABASE_DIRECT_URL: Direct connection (port 5432)
#
# Example Supabase URLs:
# SUPABASE_DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
# SUPABASE_DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

set -e

echo "=== Neon → Supabase Migration Script ==="
echo ""

# Check required env vars
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN is not set"
  echo "   Get it from: https://vercel.com/account/tokens"
  exit 1
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
  echo "❌ VERCEL_PROJECT_ID is not set"
  echo "   Get it from: vercel.com → your project → Settings → General"
  exit 1
fi

if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "❌ SUPABASE_DATABASE_URL is not set (pooler, port 6543)"
  exit 1
fi

if [ -z "$SUPABASE_DIRECT_URL" ]; then
  echo "❌ SUPABASE_DIRECT_URL is not set (direct, port 5432)"
  exit 1
fi

echo "✅ All required env vars are set"
echo ""

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

echo "🗑️  Removing old Neon env vars..."
vercel env rm DATABASE_URL production --yes || true
vercel env rm POSTGRES_URL production --yes || true
vercel env rm POSTGRES_PRISMA_URL production --yes || true
vercel env rm POSTGRES_URL_NON_POOLING production --yes || true
vercel env rm POSTGRES_URL_NO_SSL production --yes || true

echo ""
echo "➕ Adding new Supabase env vars..."
echo "$SUPABASE_DATABASE_URL" | vercel env add DATABASE_URL production
echo "$SUPABASE_DIRECT_URL" | vercel env add DIRECT_URL production

echo ""
echo "✅ Vercel env vars updated successfully"
echo ""
echo "Next steps:"
echo "1. Run: npm run build (verify local build works)"
echo "2. Run: npx prisma migrate deploy (verify migrations apply to Supabase)"
echo "3. Trigger Vercel redeployment"
echo "4. Smoke test production dashboard"
