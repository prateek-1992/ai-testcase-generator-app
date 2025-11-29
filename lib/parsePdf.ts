import pdfParse from "pdf-parse";

/**
 * Extracts text content from a PDF file buffer
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

