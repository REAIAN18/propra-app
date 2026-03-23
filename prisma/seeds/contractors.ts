/**
 * prisma/seeds/contractors.ts
 * Seed 15 contractors into the Contractor table.
 *
 * Run: npx ts-node --project tsconfig.json prisma/seeds/contractors.ts
 *
 * Idempotent: skips records whose name+region already exist.
 */

import { PrismaClient } from "../../src/generated/prisma";

const prisma = new PrismaClient();

const CONTRACTORS = [
  // SE UK — 8 contractors
  {
    name: "Apex FM Ltd",
    region: "se_uk",
    trades: ["HVAC", "MECHANICAL"],
    email: "jobs@apexfm.co.uk",
    phone: "01732 440100",
    rating: 4.7,
    jobCount: 84,
    verified: true,
  },
  {
    name: "Greenfield Electrical",
    region: "se_uk",
    trades: ["ELECTRICAL"],
    email: "contact@greenfieldelectrical.co.uk",
    phone: "01273 550200",
    rating: 4.9,
    jobCount: 127,
    verified: true,
  },
  {
    name: "Southern Roofing Group",
    region: "se_uk",
    trades: ["ROOFING", "WATERPROOFING"],
    email: "enquiries@southernroofing.co.uk",
    phone: "01892 660300",
    rating: 4.6,
    jobCount: 41,
    verified: true,
  },
  {
    name: "EcoWorks Ltd",
    region: "se_uk",
    trades: ["SOLAR", "INSULATION", "GREEN_ESG"],
    email: "info@ecoworks.co.uk",
    phone: "020 7890 1234",
    rating: 4.8,
    jobCount: 63,
    verified: true,
  },
  {
    name: "Kent Plumbing & Drainage",
    region: "se_uk",
    trades: ["PLUMBING", "DRAINAGE"],
    email: "hello@kentplumbing.co.uk",
    phone: "01634 770400",
    rating: 4.5,
    jobCount: 98,
    verified: true,
  },
  {
    name: "ProPaint Commercial",
    region: "se_uk",
    trades: ["PAINTING", "DECORATING", "CLADDING"],
    email: "quotes@propaint.co.uk",
    phone: "01737 880500",
    rating: 4.4,
    jobCount: 55,
    verified: true,
  },
  {
    name: "FireGuard Safety Systems",
    region: "se_uk",
    trades: ["FIRE_SAFETY", "COMPLIANCE"],
    email: "service@fireguardsafety.co.uk",
    phone: "01293 990600",
    rating: 4.8,
    jobCount: 72,
    verified: true,
  },
  {
    name: "SteelFrame Structures",
    region: "se_uk",
    trades: ["STRUCTURAL", "FIT_OUT"],
    email: "tender@steelframe.co.uk",
    phone: "01483 110700",
    rating: 4.3,
    jobCount: 29,
    verified: true,
  },

  // FL US — 7 contractors
  {
    name: "Sunshine HVAC Services",
    region: "fl_us",
    trades: ["HVAC"],
    email: "dispatch@sunshinehvac.com",
    phone: "305-555-0101",
    rating: 4.6,
    jobCount: 112,
    verified: true,
  },
  {
    name: "Florida Roofing Pros",
    region: "fl_us",
    trades: ["ROOFING"],
    email: "bids@flroofingpros.com",
    phone: "813-555-0202",
    rating: 4.5,
    jobCount: 88,
    verified: true,
  },
  {
    name: "Gulf Coast Plumbing",
    region: "fl_us",
    trades: ["PLUMBING"],
    email: "service@gulfcoastplumbing.com",
    phone: "954-555-0303",
    rating: 4.2,
    jobCount: 143,
    verified: true,
  },
  {
    name: "Volt Electric FL",
    region: "fl_us",
    trades: ["ELECTRICAL"],
    email: "work@voltelectricfl.com",
    phone: "407-555-0404",
    rating: 4.7,
    jobCount: 95,
    verified: true,
  },
  {
    name: "BugOff Pest Control",
    region: "fl_us",
    trades: ["PEST_CONTROL"],
    email: "schedule@bugoff.com",
    phone: "561-555-0505",
    rating: 4.4,
    jobCount: 201,
    verified: true,
  },
  {
    name: "FireSafe FL",
    region: "fl_us",
    trades: ["FIRE_SUPPRESSION", "COMPLIANCE"],
    email: "compliance@firesafefl.com",
    phone: "786-555-0606",
    rating: 4.8,
    jobCount: 67,
    verified: true,
  },
  {
    name: "Concrete Concepts FL",
    region: "fl_us",
    trades: ["CONCRETE", "STRUCTURAL"],
    email: "quotes@concreteconcepts.com",
    phone: "904-555-0707",
    rating: 4.3,
    jobCount: 34,
    verified: true,
  },
];

async function main() {
  console.log("Seeding contractors…");
  let created = 0;
  let skipped = 0;

  for (const c of CONTRACTORS) {
    const exists = await prisma.contractor.findFirst({
      where: { name: c.name, region: c.region },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.contractor.create({ data: c });
    created++;
    console.log(`  ✓ ${c.name} (${c.region})`);
  }

  console.log(`Done — created: ${created}, skipped (already exist): ${skipped}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
