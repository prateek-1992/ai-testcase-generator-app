import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TokenUsage, GenerateResult, ChatMessages } from "./openai";

/**
 * Creates an Ollama provider for generating test cases (local model)
 * @param model - Model name (default: "llama3.1")
 * @param baseUrl - Ollama base URL (default: "http://localhost:11434")
 * @returns Provider with generate method that returns content and token usage
 */
export const ollamaProvider = (
  model: string = "llama3.1",
  baseUrl: string = "http://localhost:11434"
) => {
  const llm = new ChatOllama({
    baseUrl,
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
      
      // Ollama may not always provide usage_metadata, so we'll try to extract it
      // or fall back to approximation
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

