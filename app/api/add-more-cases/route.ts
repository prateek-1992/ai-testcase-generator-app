import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";
import { generateAddMoreTestCasesPrompt } from "@/lib/prompt";
import { TestCase } from "@/types/TestCase";
import { estimateTokens } from "@/lib/tokenCounter";
import { parseTestCasesFromLLM } from "@/lib/utils/parseLLMResponse";
import { normalizeTestCases } from "@/lib/utils/normalizeTestCase";

export const runtime = "nodejs";
export const maxDuration = 60;

// Token limit threshold - if existing test cases exceed this, we'll summarize them
const TOKEN_LIMIT_THRESHOLD = 5000; // ~20k characters

/**
 * Summarizes existing test cases to save tokens
 * Only called if existing test cases are too large
 */
async function summarizeExistingTestCases(
  existingTestCases: TestCase[],
  providerInstance: any
): Promise<string> {
  const testCasesJson = JSON.stringify(existingTestCases, null, 2);
  
  // Create a summary prompt
  const summaryPrompt = `You are a test case analyst. Summarize the following test cases in a concise format that helps prevent generating duplicates.

Focus on:
- Test case titles and types
- Key scenarios covered
- Main test flows
- Edge cases and negative scenarios already tested

Keep the summary under 500 words. Format as a structured list.`;

  const userPrompt = `Summarize these test cases to help prevent generating duplicates:

${testCasesJson.substring(0, 10000)}${testCasesJson.length > 10000 ? '...' : ''}`;

  try {
    const result = await providerInstance.generate({
      system: summaryPrompt,
      user: userPrompt,
    });
    return result.content.trim();
  } catch (error) {
    console.error("Error summarizing test cases, falling back to JSON:", error);
    // Fallback: return a truncated JSON
    return `Summary of ${existingTestCases.length} existing test cases:\n${testCasesJson.substring(0, 2000)}...`;
  }
}

/**
 * POST /api/add-more-cases
 * Adds more test cases based on user instruction, preventing duplicates
 * 
 * Input: { 
 *   summary: string, 
 *   existingTestCases: TestCase[], 
 *   followUpPrompt: string,
 *   count: number,
 *   provider: "openai" | "azure" | "ollama" | "gemini", 
 *   config: {...} 
 * }
 * Output: { testCases: TestCase[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summary, existingTestCases, followUpPrompt, count, provider, config } = body;

    // Validate input
    if (!summary || summary.trim().length === 0) {
      return NextResponse.json(
        { error: "PRD summary is required" },
        { status: 400 }
      );
    }

    if (!existingTestCases || !Array.isArray(existingTestCases) || existingTestCases.length === 0) {
      return NextResponse.json(
        { error: "Existing test cases are required" },
        { status: 400 }
      );
    }

    if (!followUpPrompt || followUpPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Follow-up prompt is required" },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    const testCaseCount = count || 5; // Default to 5 if not specified

    // Create provider instance
    let providerInstance;
    try {
      providerInstance = createProvider({
        provider,
        apiKey: config?.apiKey,
        model: config?.model,
        endpoint: config?.endpoint,
        deployment: config?.deployment,
        apiVersion: config?.apiVersion,
        baseUrl: config?.baseUrl,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to create provider",
        },
        { status: 400 }
      );
    }

    // Check token usage for existing test cases
    const existingTestCasesJson = JSON.stringify(existingTestCases, null, 2);
    const existingTokens = estimateTokens(existingTestCasesJson);

    let existingTestCasesForPrompt: TestCase[] | string;
    
    if (existingTokens > TOKEN_LIMIT_THRESHOLD) {
      // Too large - summarize them
      console.log(`Existing test cases too large (${existingTokens} tokens), summarizing...`);
      const summary = await summarizeExistingTestCases(existingTestCases, providerInstance);
      existingTestCasesForPrompt = summary;
    } else {
      // Small enough - send full list
      existingTestCasesForPrompt = existingTestCases;
    }

    // Generate prompts for adding more test cases
    const { system, user } = generateAddMoreTestCasesPrompt(
      summary,
      existingTestCasesForPrompt,
      followUpPrompt,
      testCaseCount
    );

    // Generate test cases using LLM
    let generatedText: string;
    let tokenUsage;
    try {
      const result = await providerInstance.generate({ system, user });
      generatedText = result.content;
      tokenUsage = result.tokenUsage;
    } catch (error) {
      console.error("Error generating additional test cases:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `LLM generation failed: ${error.message}`
              : "Failed to generate additional test cases",
        },
        { status: 500 }
      );
    }

    // Parse JSON response from LLM
    let newTestCases: TestCase[];
    try {
      const parsed = parseTestCasesFromLLM(generatedText);
      newTestCases = normalizeTestCases(parsed, existingTestCases);
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      console.error("Generated text:", generatedText);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Failed to parse LLM response: ${error.message}`
              : "Failed to parse test cases from LLM response",
          rawResponse: generatedText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      testCases: newTestCases,
      count: newTestCases.length,
      tokenUsage,
    });
  } catch (error) {
    console.error("Error in add-more-cases endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

