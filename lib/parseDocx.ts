import mammoth from "mammoth";

/**
 * Extracts text content from a DOCX file buffer
 * @param buffer - DOCX file buffer
 * @returns Extracted text content
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

