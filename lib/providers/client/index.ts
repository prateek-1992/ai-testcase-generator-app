/**
 * Client-side LLM providers
 * All calls made directly from browser - API keys never sent to backend
 */

import { callOpenAI } from "./openai";
import { callGemini } from "./gemini";

export type ClientProvider = "openai" | "gemini" | "ollama" | "azure";

export interface ClientProviderConfig {
  provider: ClientProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
  baseUrl?: string;
}

export interface ClientChatMessages {
  system?: string;
  user: string;
}

export interface ClientGenerateResult {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call LLM provider directly from client
 * Keys never leave the browser
 */
export async function callLLMClient(
  config: ClientProviderConfig,
  messages: ClientChatMessages
): Promise<ClientGenerateResult> {
  switch (config.provider) {
    case "openai":
      if (!config.apiKey) {
        throw new Error("OpenAI API key is required");
      }
      return callOpenAI(config.apiKey, config.model || "gpt-4o-mini", messages);

    case "gemini":
      if (!config.apiKey) {
        throw new Error("Gemini API key is required");
      }
      return callGemini(config.apiKey, config.model || "gemini-1.5-flash-latest", messages);

    case "ollama":
      // Ollama calls from browser (CORS must be enabled on Ollama server)
      if (!config.baseUrl) {
        throw new Error("Ollama base URL is required");
      }
      return callOllama(config.baseUrl, config.model || "llama3.1", messages);

    case "azure":
      // Azure might have CORS restrictions - may need to keep on backend
      // For now, throw error suggesting to use OpenAI or self-host
      throw new Error(
        "Azure OpenAI requires server-side calls due to CORS restrictions. " +
        "Please use OpenAI provider or self-host this application."
      );

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * Client-side Ollama provider
 */
async function callOllama(
  baseUrl: string,
  model: string,
  messages: ClientChatMessages
): Promise<ClientGenerateResult> {
  // Combine system and user messages
  let combinedContent = "";
  if (messages.system) {
    combinedContent = `${messages.system}\n\n${messages.user}`;
  } else {
    combinedContent = messages.user;
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: combinedContent,
      stream: false,
      options: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`Ollama API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.response || "",
    // Ollama doesn't provide token usage in standard format
    tokenUsage: undefined,
  };
}

