#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");

const REPO = "REAIAN18/propra-app";
const BASE = "/Users/ianbaron/Documents/projects/propra";
const MSG = "feat: add Rent Clock page + sidebar nav + landing page redesign\n\nCo-Authored-By: Paperclip <noreply@paperclip.ing>";

function getSha(path) {
  try {
    return execSync(`gh api "/repos/${REPO}/contents/${path}" --jq '.sha'`, { encoding: "utf8" }).trim();
  } catch {
    return null; // file doesn't exist yet
  }
}

function pushFile(relPath) {
  const content = fs.readFileSync(`${BASE}/${relPath}`, "utf8");
  const b64 = Buffer.from(content, "utf8").toString("base64");
  const sha = getSha(relPath);
  const body = JSON.stringify({ message: MSG, content: b64, ...(sha ? { sha } : {}) });
  execSync(`gh api --method PUT "/repos/${REPO}/contents/${relPath}" --input -`, {
    input: body,
    maxBuffer: 10 * 1024 * 1024,
  });
  process.stdout.write(`  ${sha ? "updated" : "created"}  ${relPath}\n`);
}

const files = [
  "src/app/rent-clock/page.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/layout/TopBar.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/page.tsx",
];

console.log("Pushing to GitHub...");
for (const f of files) pushFile(f);
console.log("\nDone. Railway will auto-deploy.");
