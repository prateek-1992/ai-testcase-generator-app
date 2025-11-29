import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GenerateResult {
  content: string;
  tokenUsage?: TokenUsage;
}

export interface ChatMessages {
  system?: string;
  user: string;
}

/**
 * Creates an OpenAI provider for generating test cases
 * Uses chat message format with system/user separation for better instruction following
 * 
 * @param apiKey - OpenAI API key
 * @param model - Model name (default: "gpt-4o-mini")
 * @returns Provider with generate method that accepts system/user messages
 */
export const openaiProvider = (apiKey: string, model: string = "gpt-4o-mini") => {
  const llm = new ChatOpenAI({
    apiKey,
    model,
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

