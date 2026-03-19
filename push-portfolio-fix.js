#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");

const REPO = "REAIAN18/propra-app";
const BASE = "/Users/ianbaron/Documents/projects/propra";

const FILES = [
  "src/components/layout/NavContext.tsx",
  "src/components/layout/TopBar.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/insurance/page.tsx",
  "src/app/energy/page.tsx",
  "src/app/income/page.tsx",
  "src/app/compliance/page.tsx",
  "src/app/hold-sell/page.tsx",
  "src/app/scout/page.tsx",
  "src/app/ask/page.tsx",
];

function getSha(path) {
  const out = execSync(`gh api "/repos/${REPO}/contents/${path}" --jq '.sha'`, {
    encoding: "utf8",
  }).trim();
  return out;
}

function putFile(path, content, sha) {
  const b64 = Buffer.from(content, "utf8").toString("base64");
  const body = JSON.stringify({
    message: `feat: persist portfolio selection across all pages\n\nCo-Authored-By: Paperclip <noreply@paperclip.ing>`,
    content: b64,
    sha,
  });
  execSync(`gh api --method PUT "/repos/${REPO}/contents/${path}" --input -`, {
    input: body,
    maxBuffer: 10 * 1024 * 1024,
  });
}

for (const relPath of FILES) {
  process.stdout.write(`${relPath} ... `);
  const sha = getSha(relPath);
  const content = fs.readFileSync(`${BASE}/${relPath}`, "utf8");
  putFile(relPath, content, sha);
  console.log("✓");
}

console.log("\nAll files pushed. Railway will redeploy automatically.");
