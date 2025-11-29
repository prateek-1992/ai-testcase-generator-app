import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";
import { TestCase } from "@/types/TestCase";
import { refineTestCasePrompt, generateJsonCorrectionPrompt } from "@/lib/prompt";
import { parseTestCaseFromLLM } from "@/lib/utils/parseLLMResponse";
import { normalizeTestCase } from "@/lib/utils/normalizeTestCase";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RefineTestCaseRequest {
  provider: "openai" | "azure" | "ollama" | "gemini";
  config: {
    apiKey?: string;
    model?: string;
    endpoint?: string;
    deployment?: string;
    apiVersion?: string;
    baseUrl?: string;
  };
  summary: string;
  testCase: TestCase;
  followup: string;
}

/**
 * POST /api/refine-test-case
 * Refines a single test case using PRD summary + follow-up instruction.
 *
 * Input: { provider, config, summary, testCase, followup }
 * Output: { testCase }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RefineTestCaseRequest;

    const { provider, config, summary, testCase, followup } = body;

    if (!summary || summary.trim().length === 0) {
      return NextResponse.json(
        { error: "PRD summary is required" },
        { status: 400 }
      );
    }

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case is required" },
        { status: 400 }
      );
    }

    if (!followup || followup.trim().length === 0) {
      return NextResponse.json(
        { error: "Follow-up instruction is required" },
        { status: 400 }
      );
    }

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

    // Use improved prompt from prompt.ts (chat messages format)
    const { system, user } = refineTestCasePrompt(summary, testCase, followup);

    let generatedText: string;
    try {
      const result = await providerInstance.generate({ system, user });
      generatedText = result.content;
    } catch (error) {
      console.error("Error refining test case:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `LLM refinement failed: ${error.message}`
              : "Failed to refine test case",
        },
        { status: 500 }
      );
    }

    // Multi-step validation: Try to parse, if fails, ask model to fix it
    let parsed: TestCase | null = null;
    let cleanedText = generatedText.trim();
    let parseAttempts = 0;
    const maxAttempts = 2; // Try original + one correction

    try {
      while (parseAttempts < maxAttempts) {
        try {
          // Try to extract JSON object if there's extra text around it
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedText = jsonMatch[0];
          }

          // Use shared utility for cleaning and parsing
          parsed = parseTestCaseFromLLM(cleanedText);
          break; // Success! Exit the loop
        } catch (parseError) {
          parseAttempts++;
          
          if (parseAttempts >= maxAttempts) {
            // All attempts failed
            console.error("All JSON parse attempts failed:", {
              error: parseError instanceof Error ? parseError.message : String(parseError),
              cleanedText: cleanedText.substring(0, 500),
            });
            throw parseError;
          } else {
            // Ask the model to fix the JSON
            console.log(`JSON parse failed (attempt ${parseAttempts}), asking model to fix...`);
            const correctionPrompts = generateJsonCorrectionPrompt(
              cleanedText,
              parseError instanceof Error ? parseError.message : String(parseError),
              system // Pass system prompt for context
            );
            
            try {
              const correctionResult = await providerInstance.generate(correctionPrompts);
              generatedText = correctionResult.content;
              // Loop will retry with the corrected response
            } catch (correctionError) {
              console.error("Error getting JSON correction from model:", correctionError);
              // Fall through to regex fixes
              break;
            }
          }
        }
      }

      // Check if parsing succeeded
      if (!parsed) {
        throw new Error("Failed to parse JSON after all attempts");
      }

      // Normalize the parsed test case, preserving original testId
      const refined = normalizeTestCase(
        { ...parsed, testId: parsed.testId || testCase.testId },
        0
      );

      return NextResponse.json({ testCase: refined });
    } catch (error) {
      console.error("Error parsing refined test case:", error);
      console.error("Refine response text:", generatedText);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Failed to parse refined test case: ${error.message}`
              : "Failed to parse refined test case from LLM response",
          rawResponse: generatedText,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in refine-test-case endpoint:", error);
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


