/**
 * Client-side Gemini provider
 * Makes direct API calls from browser - keys never sent to backend
 */

export interface ClientGenerateResult {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ClientChatMessages {
  system?: string;
  user: string;
}

/**
 * Client-side Gemini provider
 * Calls Google Gemini API directly from browser
 */
export async function callGemini(
  apiKey: string,
  model: string,
  messages: ClientChatMessages
): Promise<ClientGenerateResult> {
  // Gemini API format
  const contents = [];
  
  // Combine system and user messages
  let combinedContent = "";
  if (messages.system) {
    combinedContent = `${messages.system}\n\n${messages.user}`;
  } else {
    combinedContent = messages.user;
  }
  
  contents.push({
    role: "user",
    parts: [{ text: combinedContent }],
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  return {
    content: text,
    tokenUsage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount || 0,
      completionTokens: data.usageMetadata.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata.totalTokenCount || 0,
    } : undefined,
  };
}

