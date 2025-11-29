/**
 * Simple encryption utilities for API keys
 * Note: This provides obfuscation, not true security
 * The server still needs to decrypt to use the key
 */

/**
 * Simple base64 encoding (obfuscation, not encryption)
 * This makes keys less visible in sessionStorage but doesn't provide real security
 */
export function obfuscateKey(key: string): string {
  if (!key) return "";
  // Simple base64 encoding with a prefix to identify obfuscated keys
  return `obf_${btoa(key)}`;
}

/**
 * Decode obfuscated key
 */
export function deobfuscateKey(obfuscated: string): string {
  if (!obfuscated || !obfuscated.startsWith("obf_")) {
    return obfuscated; // Not obfuscated, return as-is
  }
  try {
    return atob(obfuscated.replace("obf_", ""));
  } catch {
    return obfuscated; // Decode failed, return as-is
  }
}

/**
 * Mask API key for display (shows only first 4 and last 4 characters)
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 8) {
    return "••••••••";
  }
  return `${key.substring(0, 4)}${"•".repeat(key.length - 8)}${key.substring(key.length - 4)}`;
}

/**
 * Check if a string looks like an API key (basic validation)
 */
export function isValidApiKeyFormat(key: string, provider: "openai" | "azure" | "gemini"): boolean {
  if (!key || key.trim().length === 0) return false;
  
  const trimmed = key.trim();
  
  switch (provider) {
    case "openai":
      // OpenAI keys typically start with "sk-"
      return trimmed.startsWith("sk-") && trimmed.length > 20;
    case "azure":
      // Azure keys are typically 32+ character alphanumeric strings
      return trimmed.length >= 32;
    case "gemini":
      // Gemini keys typically start with "AIza"
      return trimmed.startsWith("AIza") && trimmed.length > 20;
    default:
      return trimmed.length > 10;
  }
}

