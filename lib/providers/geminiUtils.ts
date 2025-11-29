/**
 * Lists available Gemini models from the API
 * @param apiKey - Google Gemini API key
 * @returns Array of available model names
 */
export async function listAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    // Use REST API directly to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter for models that support generateContent
    const availableModels: string[] = [];
    
    if (data.models && Array.isArray(data.models)) {
      for (const model of data.models) {
        // Check if model supports generateContent method
        if (model.supportedGenerationMethods?.includes("generateContent")) {
          // Extract model name (remove "models/" prefix if present)
          const modelName = model.name?.replace("models/", "") || model.name;
          if (modelName) {
            availableModels.push(modelName);
          }
        }
      }
    }
    
    return availableModels.sort();
  } catch (error) {
    console.error("Error listing Gemini models:", error);
    // Return common fallback models if API call fails
    return [
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest",
      "gemini-1.0-pro-latest",
      "gemini-pro",
    ];
  }
}

/**
 * Finds the best available Gemini model, trying preferred models first
 * @param apiKey - Google Gemini API key
 * @param preferredModel - Preferred model name (optional)
 * @returns Available model name
 */
export async function findAvailableGeminiModel(
  apiKey: string,
  preferredModel?: string
): Promise<string> {
  try {
    const availableModels = await listAvailableGeminiModels(apiKey);
    
    if (availableModels.length === 0) {
      throw new Error("No available Gemini models found");
    }
    
    // If preferred model is available, use it
    if (preferredModel && availableModels.includes(preferredModel)) {
      return preferredModel;
    }
    
    // Try to find a model matching the preferred pattern
    if (preferredModel) {
      // Try exact match first
      const exactMatch = availableModels.find(m => m === preferredModel);
      if (exactMatch) return exactMatch;
      
      // Try pattern matching (e.g., "gemini-1.5-flash" matches "gemini-1.5-flash-002")
      const patternMatch = availableModels.find(m => 
        m.startsWith(preferredModel.split("-latest")[0]) || 
        m.includes(preferredModel.replace("-latest", ""))
      );
      if (patternMatch) return patternMatch;
    }
    
    // Prefer flash models (faster, cheaper) over pro models
    const flashModel = availableModels.find(m => m.includes("flash"));
    if (flashModel) return flashModel;
    
    // Fall back to first available model
    return availableModels[0];
  } catch (error) {
    console.error("Error finding available Gemini model:", error);
    // Return a common fallback with -latest suffix (required for v1beta API)
    return preferredModel || "gemini-1.5-flash-latest";
  }
}

