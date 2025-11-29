/**
 * In-memory temporary store for passing data between pages during navigation
 * This is NOT persisted - it's cleared after the result page reads it
 * Keys exist only in memory during navigation, never stored in browser storage
 */

type ProviderConfig = {
  provider: "openai" | "azure" | "ollama" | "gemini";
  config: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    endpoint?: string;
    deployment?: string;
    apiVersion?: string;
  };
};

// In-memory store (not persisted, cleared after read)
let navigationState: ProviderConfig | null = null;

/**
 * Store provider config temporarily for navigation
 * This is in-memory only - not persisted to any browser storage
 */
export function setNavigationState(config: ProviderConfig): void {
  navigationState = config;
}

/**
 * Get and clear navigation state (one-time read)
 * After reading, the state is cleared from memory
 */
export function getAndClearNavigationState(): ProviderConfig | null {
  const state = navigationState;
  navigationState = null; // Clear immediately after reading
  return state;
}

/**
 * Check if navigation state exists (without clearing it)
 */
export function hasNavigationState(): boolean {
  return navigationState !== null;
}

