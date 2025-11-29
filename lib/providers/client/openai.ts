/**
 * Client-side OpenAI provider
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
 * Client-side OpenAI provider
 * Calls OpenAI API directly from browser
 */
export async function callOpenAI(
  apiKey: string,
  model: string,
  messages: ClientChatMessages
): Promise<ClientGenerateResult> {
  const chatMessages = [];
  
  // Add system message if provided
  if (messages.system) {
    chatMessages.push({
      role: "system",
      content: messages.system,
    });
  }
  
  // Add user message
  chatMessages.push({
    role: "user",
    content: messages.user,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    tokenUsage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}

