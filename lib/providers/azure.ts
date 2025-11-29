import { AzureChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TokenUsage, GenerateResult, ChatMessages } from "./openai";

export interface AzureProviderConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

/**
 * Extracts instance name from Azure endpoint URL
 * Example: https://my-instance.openai.azure.com -> my-instance
 */
function extractInstanceName(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const hostname = url.hostname;
    // Extract instance name from hostname like "my-instance.openai.azure.com"
    const parts = hostname.split(".");
    if (parts.length >= 3 && parts[1] === "openai" && parts[2] === "azure") {
      return parts[0];
    }
    // Fallback: try to extract from the endpoint path or use the full hostname
    return hostname;
  } catch {
    // If endpoint is not a full URL, assume it's just the instance name
    return endpoint.replace(/^https?:\/\//, "").split(".")[0] || endpoint;
  }
}

/**
 * Creates an Azure OpenAI provider for generating test cases
 * @param apiKey - Azure OpenAI API key
 * @param endpoint - Azure OpenAI endpoint URL (e.g., "https://my-instance.openai.azure.com")
 * @param deployment - Deployment name
 * @param apiVersion - API version (e.g., "2024-02-15-preview")
 * @returns Provider with generate method that returns content and token usage
 */
export const azureProvider = (
  apiKey: string,
  endpoint: string,
  deployment: string,
  apiVersion: string
) => {
  const instanceName = extractInstanceName(endpoint);
  
  const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: apiKey,
    azureOpenAIApiInstanceName: instanceName,
    azureOpenAIApiDeploymentName: deployment,
    azureOpenAIApiVersion: apiVersion,
    temperature: 0.7,
  });

  return {
    /**
     * Generate response using chat messages (system + user)
     * This provides better instruction following and token efficiency
     */
    generate: async (messages: ChatMessages): Promise<GenerateResult> => {
      const chatMessages = [];
      
      // Add system message if provided
      if (messages.system) {
        chatMessages.push(new SystemMessage(messages.system));
      }
      
      // Add user message
      chatMessages.push(new HumanMessage(messages.user));
      
      const res = await llm.invoke(chatMessages);
      
      // Extract token usage from usage_metadata
      let tokenUsage: TokenUsage | undefined;
      if (res.usage_metadata) {
        tokenUsage = {
          promptTokens: res.usage_metadata.input_tokens ?? 0,
          completionTokens: res.usage_metadata.output_tokens ?? 0,
          totalTokens: res.usage_metadata.total_tokens ?? 0,
        };
      }
      
      return {
        content: res.content.toString(),
        tokenUsage,
      };
    },
  };
};

