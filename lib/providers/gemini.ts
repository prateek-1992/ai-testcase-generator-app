import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TokenUsage, GenerateResult, ChatMessages } from "./openai";
import { findAvailableGeminiModel } from "./geminiUtils";

/**
 * Creates a Google Gemini provider for generating test cases
 * Uses chat message format with system/user separation for better instruction following
 * Auto-detects available models on first use if the specified model is not found
 * 
 * @param apiKey - Google Gemini API key
 * @param model - Model name (default: "gemini-1.5-flash-latest")
 * @returns Provider with generate method that accepts system/user messages
 */
export const geminiProvider = (apiKey: string, model: string = "gemini-1.5-flash-latest") => {
  let llm: ChatGoogleGenerativeAI | null = null;
  let actualModel = model;
  let modelDetectionPromise: Promise<void> | null = null;

  // Lazy initialization: detect model on first use
  const ensureModel = async () => {
    if (llm) return; // Already initialized
    
    if (!modelDetectionPromise) {
      modelDetectionPromise = (async () => {
        try {
          actualModel = await findAvailableGeminiModel(apiKey, model);
          if (actualModel !== model) {
            console.log(`Gemini model "${model}" not available, using "${actualModel}" instead`);
          }
        } catch (error) {
          console.warn("Could not auto-detect Gemini model, using provided model:", error);
          actualModel = model; // Use provided model, will fail with clear error if invalid
        }
        
        llm = new ChatGoogleGenerativeAI({
          apiKey,
          model: actualModel,
          temperature: 0.7,
          convertSystemMessageToHumanContent: false,
        });
      })();
    }
    
    await modelDetectionPromise;
  };

  return {
    /**
     * Generate response using chat messages (system + user)
     * This provides better instruction following and token efficiency
     */
    generate: async (messages: ChatMessages): Promise<GenerateResult> => {
      await ensureModel();
      
      if (!llm) {
        throw new Error("Failed to initialize Gemini model");
      }

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

