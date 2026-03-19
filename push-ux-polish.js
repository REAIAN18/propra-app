#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");

const REPO = "REAIAN18/propra-app";
const BASE = "/Users/ianbaron/Documents/projects/propra";
const MSG = "feat: /ask graceful error, landing contact CTA, favicon\n\nCo-Authored-By: Paperclip <noreply@paperclip.ing>";

function getSha(path) {
  try {
    return execSync(`gh api "/repos/${REPO}/contents/${path}" --jq '.sha'`, { encoding: "utf8" }).trim();
  } catch { return null; }
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
  console.log(`  ${sha ? "updated" : "created"}  ${relPath}`);
}

const files = [
  "src/app/ask/page.tsx",
  "src/app/page.tsx",
  "src/app/icon.tsx",
];

for (const f of files) pushFile(f);
console.log("\nDone.");
