import { parsePdf } from "./parsePdf";
import { parseDocx } from "./parseDocx";
import { parseText } from "./parseText";

/**
 * Extracts text from uploaded file based on its MIME type
 * @param buffer - File buffer
 * @param mimeType - File MIME type
 * @returns Extracted text content
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType === "application/pdf") {
    return await parsePdf(buffer);
  } else if (
    normalizedMimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedMimeType === "application/msword"
  ) {
    return await parseDocx(buffer);
  } else if (
    normalizedMimeType === "text/plain" ||
    normalizedMimeType === "text/markdown" ||
    normalizedMimeType === "text/x-markdown"
  ) {
    return parseText(buffer);
  } else {
    throw new Error(
      `Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, TXT, MD`
    );
  }
}

