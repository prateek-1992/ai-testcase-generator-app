/**
 * Extracts text content from a plain text file buffer
 * @param buffer - Text file buffer
 * @returns Extracted text content
 */
export function parseText(buffer: Buffer): string {
  try {
    return buffer.toString("utf-8");
  } catch (error) {
    throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

