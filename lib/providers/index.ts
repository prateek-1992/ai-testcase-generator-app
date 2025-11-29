import { openaiProvider } from "./openai";
import { azureProvider } from "./azure";
import { ollamaProvider } from "./ollama";
import { geminiProvider } from "./gemini";

export type ProviderType = "openai" | "azure" | "ollama" | "gemini";

export interface ProviderConfig {
  provider: ProviderType;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
  baseUrl?: string;
}

/**
 * Creates a provider instance based on the provider type
 * @param config - Provider configuration
 * @returns Provider with generate method
 */
export function createProvider(config: ProviderConfig) {
  switch (config.provider) {
    case "openai":
      if (!config.apiKey) {
        throw new Error("OpenAI API key is required");
      }
      return openaiProvider(config.apiKey, config.model);

    case "azure":
      if (!config.apiKey || !config.endpoint || !config.deployment || !config.apiVersion) {
        throw new Error("Azure OpenAI requires apiKey, endpoint, deployment, and apiVersion");
      }
      return azureProvider(
        config.apiKey,
        config.endpoint,
        config.deployment,
        config.apiVersion
      );

    case "ollama":
      return ollamaProvider(config.model, config.baseUrl);

    case "gemini":
      if (!config.apiKey) {
        throw new Error("Google Gemini API key is required");
      }
      return geminiProvider(config.apiKey, config.model);

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export { openaiProvider, azureProvider, ollamaProvider, geminiProvider };

