import {
  TextractClient,
  DetectDocumentTextCommand,
  type Block,
} from "@aws-sdk/client-textract";

function getClient(): TextractClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION ?? "us-east-1";

  if (!accessKeyId || !secretAccessKey) return null;

  return new TextractClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Extract raw text from a PDF or image buffer using AWS Textract.
 * Returns concatenated line text, or null if AWS credentials are not configured.
 */
export async function extractTextFromDocument(
  fileBuffer: Buffer
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: fileBuffer },
    });

    const response = await client.send(command);
    const blocks: Block[] = response.Blocks ?? [];

    const lines = blocks
      .filter((b) => b.BlockType === "LINE" && b.Text)
      .map((b) => b.Text!);

    return lines.join("\n");
  } catch (err) {
    console.error("[textract] extraction failed:", err);
    return null;
  }
}
