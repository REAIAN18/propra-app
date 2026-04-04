#!/bin/bash
# DealScope Implementation — Execution Scripts
# Run these scripts in order before assigning Paperclip agents

set -e

echo "================================================="
echo "DEALSCOPE IMPLEMENTATION — SETUP SCRIPTS"
echo "================================================="
echo ""

# ============================================
# SCRIPT 1: Code Audit
# ============================================
echo "📋 STEP 1: Running Code Audit..."
echo ""

cd ~/propra-app  # Adjust to your repo location

cat > EXISTING_CODE_MAP.md << 'AUDIT'
# DealScope Existing Codebase — Audit Results
**Generated:** $(date)

## API Routes

### DealScope Routes
```
$(find . -path "*/api/dealscope/*" -type f | grep -v node_modules | sort)
```

### Other API Routes
```
$(find . -path "*/api/*" -name "*.ts" -o -name "*.js" | grep -v node_modules | grep -v dealscope | sort)
```

## Library Functions

### DealScope Libraries
```
$(find . -path "*/lib/dealscope/*" -type f | grep -v node_modules | sort)
```

### Calculation Files
```
$(find . \( -name "*calculation*" -o -name "*financial*" \) -type f | grep -v node_modules | sort)
```

### Extractor Files
```
$(find . \( -name "*extract*" -o -name "*enrich*" \) -type f | grep -v node_modules | sort)
```

## Components

### DealScope Components
```
$(find . -path "*/components/dealscope/*" -type f | grep -v node_modules | sort)
```

### Component Count
```
Total Components: $(find . -path "*/components/*" -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | wc -l)
```

## Database

### Prisma Models
```
Total Models: $(cat prisma/schema.prisma | grep "model " | wc -l)
```

### DealScope-Related Models
```
$(cat prisma/schema.prisma | grep -A 2 "model.*Property\|model.*Analysis\|model.*Comparable" | head -20)
```

## File Statistics

```
Total TypeScript files: $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l)
Total Lines of Code: $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l | tail -1)
```

## Critical Files for Phase 1

**IRR Calculation:** 
$(find . -name "*irr*" -o -name "*calculation*" | grep -v node_modules)

**Rent Extraction:**
$(find . -name "*rent*" -o -name "*extract*" | grep -v node_modules | grep -v node)

**CAPEX:**
$(find . -name "*capex*" -o -name "*capital*" | grep -v node_modules)

**Yields:**
$(find . -name "*yield*" -o -name "*niy*" | grep -v node_modules)

AUDIT

echo "✅ Code audit complete: EXISTING_CODE_MAP.md"
echo ""

# ============================================
# SCRIPT 2: Extract Package
# ============================================
echo "📦 STEP 2: Extracting Implementation Package..."
echo ""

mkdir -p .dealscope-specs
cd .dealscope-specs

# Assuming package is in Downloads or Desktop
PACKAGE_LOCATIONS=(
    ~/Downloads/dealscope-complete-package.zip
    ~/Desktop/dealscope-complete-package.zip
    /mnt/user-data/outputs/dealscope-complete-package.zip
)

FOUND=false
for location in "${PACKAGE_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        echo "Found package at: $location"
        unzip -q "$location"
        FOUND=true
        break
    fi
done

if [ "$FOUND" = false ]; then
    echo "❌ ERROR: Package not found in any location"
    echo "Please download dealscope-complete-package.zip first"
    exit 1
fi

echo "✅ Package extracted to: .dealscope-specs/"
echo ""

# ============================================
# SCRIPT 3: Create File Ownership Tracker
# ============================================
echo "📊 STEP 3: Creating File Ownership Tracker..."
echo ""

cd ~/propra-app

cat > FILE_OWNERSHIP.md << 'TRACKER'
# DealScope Implementation — File Ownership Tracker

**CRITICAL RULE:** Only the assigned owner can modify a file. No exceptions.

**Status Legend:**
- ⚪ Not Started
- 🟡 In Progress
- 🟢 PR Open / Review
- ✅ Merged to Main
- ❌ Blocked

---

## Phase 1: Critical Fixes (Week 1-2)

### Backend Agents

| Ticket | File Path | Owner | Status | PR | Test Pass | Notes |
|--------|-----------|-------|--------|-----|-----------|-------|
| DEAL-001 | `lib/dealscope/calculations/irr.ts` | Agent 1 | ⚪ | - | - | IRR formula fix |
| DEAL-002 | `lib/dealscope/extractors/rent.ts` | Agent 2 | ⚪ | - | - | Rent extraction |
| DEAL-003 | `lib/dealscope/calculations/capex.ts` | Agent 3 | ⚪ | - | - | CAPEX detection |
| DEAL-004 | `lib/dealscope/calculations/yields.ts` | Agent 4 | ⚪ | - | - | NIY & multiples |
| DEAL-005 | `tests/phase1-critical.test.ts` | Agent 5 | ⚪ | - | - | Integration tests |

---

## Phase 2: UI Redesign (Week 5-6)

### Frontend Agents

| Ticket | Component Path | Owner | Status | PR | Storybook | Notes |
|--------|----------------|-------|--------|-----|-----------|-------|
| DEAL-006 | `components/dealscope/HeroPanel.tsx` | Agent 6 | ⚪ | - | - | Hero panel |
| DEAL-006 | `components/dealscope/MetricCard.tsx` | Agent 6 | ⚪ | - | - | Metric cards |
| DEAL-006 | `components/dealscope/VerdictBadge.tsx` | Agent 6 | ⚪ | - | - | Verdict badge |
| DEAL-007 | `components/dealscope/TabNavigation.tsx` | Agent 7 | ⚪ | - | - | Tab nav |
| DEAL-007 | `components/dealscope/OverviewTab.tsx` | Agent 7 | ⚪ | - | - | Overview tab |
| DEAL-007 | `components/dealscope/FinancialsTab.tsx` | Agent 7 | ⚪ | - | - | Financials tab |
| DEAL-008 | `components/dealscope/ui/DataTable.tsx` | Agent 8 | ⚪ | - | - | Data table |
| DEAL-008 | `components/dealscope/ui/DataCard.tsx` | Agent 8 | ⚪ | - | - | Data card |
| DEAL-008 | `components/dealscope/ui/Callout.tsx` | Agent 8 | ⚪ | - | - | Callout |

---

## Update Instructions

**When starting work:**
```bash
# Update status to 🟡
sed -i 's/Agent 1 | ⚪/Agent 1 | 🟡/' FILE_OWNERSHIP.md
git add FILE_OWNERSHIP.md
git commit -m "chore: Agent 1 started DEAL-001"
```

**When creating PR:**
```bash
# Update status to 🟢 and add PR number
sed -i 's/Agent 1 | 🟡 | -/Agent 1 | 🟢 | #123/' FILE_OWNERSHIP.md
```

**When merged:**
```bash
# Update status to ✅
sed -i 's/Agent 1 | 🟢/Agent 1 | ✅/' FILE_OWNERSHIP.md
```

---

## Conflict Resolution

**If two agents claim same file:**
1. Check this tracker (source of truth)
2. First agent to update tracker wins
3. Second agent must wait or reassign

**If file doesn't exist:**
1. Agent searches EXISTING_CODE_MAP.md
2. If not found, agent asks before creating
3. Update tracker with new file path

TRACKER

echo "✅ File ownership tracker created: FILE_OWNERSHIP.md"
echo ""

# ============================================
# SCRIPT 4: Verify Package Contents
# ============================================
echo "🔍 STEP 4: Verifying Package Contents..."
echo ""

REQUIRED_FILES=(
    ".dealscope-specs/dealscope-complete-package/README.md"
    ".dealscope-specs/dealscope-complete-package/designs/property-analysis-page.html"
    ".dealscope-specs/dealscope-complete-package/designs/ic-memo-template.html"
    ".dealscope-specs/dealscope-complete-package/designs/design-system-complete.html"
    ".dealscope-specs/dealscope-complete-package/documentation/00_EXECUTIVE_SUMMARY.md"
    ".dealscope-specs/dealscope-complete-package/documentation/03_FINANCIAL_ENGINE_SPEC.md"
    ".dealscope-specs/dealscope-complete-package/documentation/04_LEARNING_INTELLIGENCE_SPEC.md"
    ".dealscope-specs/dealscope-complete-package/guides/PHASE_1_CRITICAL_FIXES.md"
    ".dealscope-specs/dealscope-complete-package/audit/CURRENT_STATE_AUDIT.md"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ MISSING: $file"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" = false ]; then
    echo ""
    echo "❌ ERROR: Some required files are missing"
    exit 1
fi

echo ""
echo "✅ All required files present"
echo ""

# ============================================
# SCRIPT 5: Create Agent Assignment Checklist
# ============================================
echo "👥 STEP 5: Creating Agent Assignment Checklist..."
echo ""

cat > AGENT_ASSIGNMENT_CHECKLIST.md << 'CHECKLIST'
# Paperclip Agent Assignment — Checklist

Before assigning agents to tickets, ensure ALL steps are complete:

## Pre-Flight Checklist

### Setup
- [ ] Code audit complete (`EXISTING_CODE_MAP.md` exists)
- [ ] Package extracted (`.dealscope-specs/` directory exists)
- [ ] File ownership tracker created (`FILE_OWNERSHIP.md`)
- [ ] All required files verified (see setup script output)

### Agent Configuration
- [ ] 8 Paperclip agents created (Agents 1-8)
- [ ] Each agent configured with correct specialization
- [ ] File permissions set (can_modify_files)
- [ ] Autonomy levels configured

### Ticket Assignment
- [ ] DEAL-001 assigned to Agent 1 (Backend — IRR)
- [ ] DEAL-002 assigned to Agent 2 (Backend — Rent)
- [ ] DEAL-003 assigned to Agent 3 (Backend — CAPEX)
- [ ] DEAL-004 assigned to Agent 4 (Backend — NIY)
- [ ] DEAL-005 assigned to Agent 5 (QA — Integration)
- [ ] DEAL-006 assigned to Agent 6 (Frontend — Hero Panel)
- [ ] DEAL-007 assigned to Agent 7 (Frontend — Tabs)
- [ ] DEAL-008 assigned to Agent 8 (Frontend — Components)

### Documentation Access
- [ ] All agents can read `.dealscope-specs/` folder
- [ ] All agents have reference to exact files
- [ ] All agents have test case requirements

## Launch Sequence

### Phase 1 Start (Week 1)
```bash
# Monday morning
1. Brief all agents on their tickets
2. Agents 1-4 start in parallel
3. Agent 5 waits for completion

# Daily standup
- Check FILE_OWNERSHIP.md for progress
- Resolve any conflicts immediately
- Update ticket statuses
```

### Phase 1 Completion (Week 2 end)
```bash
# Verify all complete
grep "Agent [1-4].*✅" FILE_OWNERSHIP.md | wc -l
# Should return: 4

# Deploy to staging
npm run deploy:staging
```

### Phase 2 Start (Week 5)
```bash
# Monday morning
1. Review Phase 1 results
2. Agents 6-8 start in parallel
3. Daily design reviews
```

## Monitoring

**Daily Checks:**
- [ ] FILE_OWNERSHIP.md updated
- [ ] No merge conflicts
- [ ] Tests passing
- [ ] Agents unblocked

**Weekly Reviews:**
- [ ] Demo to stakeholders
- [ ] Adjust timelines if needed
- [ ] Deploy to staging

CHECKLIST

echo "✅ Agent assignment checklist created: AGENT_ASSIGNMENT_CHECKLIST.md"
echo ""

# ============================================
# COMPLETION
# ============================================
echo "================================================="
echo "✅ SETUP COMPLETE"
echo "================================================="
echo ""
echo "📋 Files Created:"
echo "  • EXISTING_CODE_MAP.md (code audit)"
echo "  • FILE_OWNERSHIP.md (tracking)"
echo "  • AGENT_ASSIGNMENT_CHECKLIST.md (assignment guide)"
echo ""
echo "📦 Package Location:"
echo "  .dealscope-specs/dealscope-complete-package/"
echo ""
echo "🚀 Next Steps:"
echo "  1. Review EXISTING_CODE_MAP.md"
echo "  2. Create 8 Paperclip agents"
echo "  3. Assign tickets using AGENT_ASSIGNMENT_CHECKLIST.md"
echo "  4. Monitor via FILE_OWNERSHIP.md"
echo ""
echo "📖 Documentation:"
echo "  • Tickets: See /mnt/user-data/outputs/PAPERCLIP_COMPLETE_TICKETS.md"
echo "  • Phase 2: See /mnt/user-data/outputs/PHASE_2_UI_TICKETS.md"
echo ""
echo "Good luck! 🎯"
