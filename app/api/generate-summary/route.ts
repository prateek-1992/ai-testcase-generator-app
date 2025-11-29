import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/providers";
import { generatePrdSummaryPrompt } from "@/lib/prompt";
import { PrdSummary } from "@/types/TestCase";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/generate-summary
 * Generates PRD summary only (quick, <10s typically)
 * 
 * Input: { text: string, provider: "openai" | "azure" | "ollama", config: {...} }
 * Output: { summary: PrdSummary }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, provider, config } = body;

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

    // Generate PRD summary using chat messages
    const { system, user } = generatePrdSummaryPrompt(text);
    let summaryText: string;
    let tokenUsage;
    try {
      const summaryResult = await providerInstance.generate({ system, user });
      summaryText = summaryResult.content.trim();
      tokenUsage = summaryResult.tokenUsage;
    } catch (error) {
      console.error("Error generating PRD summary:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Failed to generate PRD summary: ${error.message}`
              : "Failed to generate PRD summary",
        },
        { status: 500 }
      );
    }

    const prdSummary: PrdSummary = { text: summaryText };

    return NextResponse.json({
      summary: prdSummary,
      tokenUsage,
    });
  } catch (error) {
    console.error("Error in generate-summary endpoint:", error);
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

