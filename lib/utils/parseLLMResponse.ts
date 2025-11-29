import { TestCase } from "@/types/TestCase";

/**
 * Cleans and parses JSON response from LLM
 * Handles common issues like markdown code blocks and missing commas
 */
export function cleanLLMJsonResponse(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code blocks (```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
  }

  // Fix common JSON issues (missing commas between preconditions and steps)
  cleaned = cleaned.replace(/"preconditions":\s*"([^"]*)"\s*"steps"/g, '"preconditions": "$1", "steps"');
  
  return cleaned;
}

/**
 * Parses test cases array from LLM response
 * @throws Error if parsing fails or response is not a valid array
 */
export function parseTestCasesFromLLM(generatedText: string): TestCase[] {
  const cleanedText = cleanLLMJsonResponse(generatedText);
  const parsed = JSON.parse(cleanedText);

  if (!Array.isArray(parsed)) {
    throw new Error("LLM response is not a valid array of test cases");
  }

  return parsed as TestCase[];
}

/**
 * Parses a single test case object from LLM response
 * @throws Error if parsing fails or response is not a valid object
 */
export function parseTestCaseFromLLM(generatedText: string): TestCase {
  const cleanedText = cleanLLMJsonResponse(generatedText);
  const parsed = JSON.parse(cleanedText);

  if (Array.isArray(parsed)) {
    throw new Error("Expected single test case object, got array");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response is not a valid test case object");
  }

  return parsed as TestCase;
}

