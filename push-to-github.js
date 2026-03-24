#!/usr/bin/env node
/**
 * Push RealHQ MVP to REAIAN18/propra-app using GitHub Contents API
 * (works on empty repos unlike the Git Data API)
 */
const { execSync } = require("child_process");
const fs = require("fs");

const REPO = "REAIAN18/propra-app";
const BASE = "/Users/ianbaron/Documents/projects/propra";

function putFile(path, base64Content, message) {
  const body = JSON.stringify({ message, content: base64Content });
  const out = execSync(
    `gh api --method PUT "/repos/${REPO}/contents/${path}" --input -`,
    { input: body, maxBuffer: 20 * 1024 * 1024 }
  );
  return JSON.parse(out.toString());
}

function toB64(str) {
  return Buffer.from(str, "utf8").toString("base64");
}

function readTextB64(relPath) {
  const content = fs.readFileSync(`${BASE}/${relPath}`, "utf8");
  return Buffer.from(content, "utf8").toString("base64");
}

function readBinaryB64(relPath) {
  return fs.readFileSync(`${BASE}/${relPath}`).toString("base64");
}

// ── Config files (reconstructed) ────────────────────────────────────────────

const packageJson = JSON.stringify({
  name: "realhq",
  version: "0.1.0",
  private: true,
  scripts: {
    dev: "next dev --turbopack",
    build: "next build",
    start: "next start",
    lint: "next lint",
  },
  dependencies: {
    next: "15.5.13",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
  },
  devDependencies: {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    tailwindcss: "^4",
    typescript: "^5",
  },
}, null, 2);

const nextConfigTs = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
`;

const tsconfigJson = JSON.stringify({
  compilerOptions: {
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./src/*"] },
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
}, null, 2);

const postcssConfig = `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

const gitignore = `/node_modules
/.pnp
.pnp.js
/.next/
/out/
/build
.DS_Store
*.pem
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env*.local
.env
.vercel
*.tsbuildinfo
next-env.d.ts
`;

const nextEnvDts = `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`;

const railwayToml = `[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npx next start -p $PORT"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
`;

// ── File manifest ─────────────────────────────────────────────────────────────

const staticFiles = {
  "package.json": toB64(packageJson),
  "next.config.ts": toB64(nextConfigTs),
  "tsconfig.json": toB64(tsconfigJson),
  "postcss.config.mjs": toB64(postcssConfig),
  ".gitignore": toB64(gitignore),
  "next-env.d.ts": toB64(nextEnvDts),
  "railway.toml": toB64(railwayToml),
};

const diskSrcFiles = [
  "src/app/globals.css",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/insurance/page.tsx",
  "src/app/energy/page.tsx",
  "src/app/income/page.tsx",
  "src/app/compliance/page.tsx",
  "src/app/hold-sell/page.tsx",
  "src/app/scout/page.tsx",
  "src/app/ask/page.tsx",
  "src/app/api/ask/route.ts",
  "src/components/layout/AppShell.tsx",
  "src/components/layout/TopBar.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/layout/NavContext.tsx",
  "src/components/ui/Badge.tsx",
  "src/components/ui/MetricCard.tsx",
  "src/components/ui/BarChart.tsx",
  "src/components/ui/LineChart.tsx",
  "src/components/ui/SectionHeader.tsx",
  "src/components/ui/Skeleton.tsx",
  "src/hooks/useLoading.ts",
  "src/lib/data/types.ts",
  "src/lib/data/index.ts",
  "src/lib/data/fl-mixed.ts",
  "src/lib/data/se-logistics.ts",
  "src/lib/data/acquisitions.ts",
];

const fontFiles = [
  "public/fonts/geist-variable.woff2",
  "public/fonts/instrument-serif-regular.woff2",
  "public/fonts/instrument-serif-italic.woff2",
];

// ── Read disk files ────────────────────────────────────────────────────────────

console.log("Reading source files from disk cache...");
const allFiles = { ...staticFiles };

for (const f of diskSrcFiles) {
  try {
    allFiles[f] = readTextB64(f);
    process.stdout.write(".");
  } catch (e) {
    console.error(`\nFAIL reading ${f}: ${e.message}`);
  }
}

for (const f of fontFiles) {
  try {
    allFiles[f] = readBinaryB64(f);
    process.stdout.write("f");
  } catch (e) {
    console.error(`\nFAIL reading ${f}: ${e.message}`);
  }
}
console.log(`\nReady: ${Object.keys(allFiles).length} files`);

// ── Upload via Contents API ───────────────────────────────────────────────────

const total = Object.keys(allFiles).length;
let i = 0;
let failed = 0;

for (const [filePath, b64] of Object.entries(allFiles)) {
  i++;
  process.stdout.write(`[${i}/${total}] ${filePath}... `);
  try {
    putFile(filePath, b64, `feat: add ${filePath}`);
    console.log("✓");
  } catch (e) {
    console.error(`FAIL: ${e.message.split("\n")[0]}`);
    failed++;
  }
}

console.log(`\n${failed === 0 ? "✓" : "⚠"} Done — ${total - failed}/${total} files pushed`);
console.log(`https://github.com/${REPO}`);
