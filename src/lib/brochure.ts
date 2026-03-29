/**
 * src/lib/brochure.ts
 * PDF generation using @sparticuz/chromium + puppeteer-core.
 * Falls back gracefully if chromium is not available (returns null).
 * Optimized for Vercel serverless with compressed binary.
 */

import { renderBrochureHTML, type BrochureData } from "./brochure-template";

export async function generateBrochurePDF(data: BrochureData): Promise<Buffer | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = await (async () => { try { return (await import("@sparticuz/chromium" as string) as { default: { args: string[]; executablePath: () => Promise<string>; headless: boolean } }).default; } catch { return null; } })();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = await (async () => { try { return (await import("puppeteer-core" as string) as { default: { launch: (opts: object) => Promise<{ newPage: () => Promise<{ setContent: (h: string, opts: object) => Promise<void>; pdf: (opts: object) => Promise<Uint8Array> }>; close: () => Promise<void> }> } }).default; } catch { return null; } })();

    if (!chromium || !puppeteer) return null;

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const html = renderBrochureHTML(data);
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  } catch {
    return null;
  }
}

export { renderBrochureHTML };
export type { BrochureData };
