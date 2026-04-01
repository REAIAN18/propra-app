// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer, options?: Record<string, unknown>) => Promise<{ text: string; numpages: number }>;

import { extractAddressFromDescription, type ExtractedAddressData } from './dealscope-text-parser';

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    // Combine text from all pages
    const text = data.text;
    return text || '';
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract address and postcode from PDF text using the same logic as description parsing
 */
export async function extractAddressFromPDF(
  buffer: Buffer
): Promise<ExtractedAddressData | null> {
  try {
    const text = await extractTextFromPDF(buffer);
    if (!text) {
      return null;
    }

    // Use the text-parser utility to extract address from the extracted text
    const result = await extractAddressFromDescription(text);
    return result;
  } catch (error) {
    console.error('Error extracting address from PDF:', error);
    return null;
  }
}
