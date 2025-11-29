import { NextRequest, NextResponse } from "next/server";
import { listAvailableGeminiModels } from "@/lib/providers/geminiUtils";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/list-gemini-models
 * Lists available Gemini models for the given API key
 * 
 * Input: { apiKey: string }
 * Output: { models: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    try {
      const models = await listAvailableGeminiModels(apiKey);
      return NextResponse.json({ models });
    } catch (error) {
      console.error("Error listing Gemini models:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Failed to list models: ${error.message}`
              : "Failed to list available Gemini models",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in list-gemini-models endpoint:", error);
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

