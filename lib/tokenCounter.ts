/**
 * Token counting utilities
 * Uses approximation: ~4 characters per token (rough estimate for English text)
 * For more accurate counting, consider using tiktoken library
 */

/**
 * Estimates token count for a given text string
 * Approximation: 1 token ≈ 4 characters for English text
 * This is a rough estimate - actual tokenization varies by model
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Rough approximation: 1 token per 4 characters
  // This is a conservative estimate for English text
  // Actual tokenization can vary (punctuation, special chars count differently)
  return Math.ceil(text.length / 4);
}

/**
 * Counts tokens for PRD text input
 */
export function countPrdTokens(prdText: string): number {
  return estimateTokens(prdText);
}

/**
 * Counts tokens for summary output
 */
export function countSummaryTokens(summaryText: string): number {
  return estimateTokens(summaryText);
}

/**
 * Counts tokens for test case generation (prompt + response)
 */
export function countTestCaseTokens(
  prdText: string,
  testCasesJson: string
): { input: number; output: number; total: number } {
  // Input: PRD text + prompt template overhead (~200 tokens)
  const promptOverhead = 200;
  const inputTokens = estimateTokens(prdText) + promptOverhead;
  
  // Output: Generated test cases JSON
  const outputTokens = estimateTokens(testCasesJson);
  
  return {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens,
  };
}

/**
 * Counts tokens for summary generation (prompt + response)
 */
export function countSummaryGenerationTokens(
  prdText: string,
  summaryText: string
): { input: number; output: number; total: number } {
  const promptOverhead = 150; // Summary prompt is shorter
  const inputTokens = estimateTokens(prdText) + promptOverhead;
  const outputTokens = estimateTokens(summaryText);
  
  return {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens,
  };
}

/**
 * Formats token count for display
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

