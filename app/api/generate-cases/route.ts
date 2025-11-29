import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";
import { generateTestCasePrompt } from "@/lib/prompt";
import { TestCase, PrdSummary } from "@/types/TestCase";
import { parseTestCasesFromLLM } from "@/lib/utils/parseLLMResponse";
import { normalizeTestCases } from "@/lib/utils/normalizeTestCase";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/generate-cases
 * Generates test cases from PRD text (can accept pre-generated summary)
 * 
 * Input: { text: string, summary?: string, provider: "openai" | "azure" | "ollama", config: {...} }
 * Output: { testCases: TestCase[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, summary, provider, config, count } = body;

    // Validate input
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

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

    // Generate test cases using chat messages (system + user)
    const { system, user } = generateTestCasePrompt(text, count);

    // Generate test cases using LLM
    let generatedText: string;
    let tokenUsage;
    try {
      const result = await providerInstance.generate({ system, user });
      generatedText = result.content;
      tokenUsage = result.tokenUsage;
    } catch (error) {
      console.error("Error generating test cases:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `LLM generation failed: ${error.message}`
              : "Failed to generate test cases",
        },
        { status: 500 }
      );
    }

    // Parse JSON response from LLM
    let testCases: TestCase[];
    try {
      const parsed = parseTestCasesFromLLM(generatedText);
      testCases = normalizeTestCases(parsed);
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
      testCases,
      count: testCases.length,
      tokenUsage,
      // Include summary if provided (for consistency with old API)
      ...(summary && { summary: { text: summary } as PrdSummary }),
    });
  } catch (error) {
    console.error("Error in generate-cases endpoint:", error);
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

