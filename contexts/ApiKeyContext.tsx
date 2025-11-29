"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Provider = "openai" | "azure" | "ollama" | "gemini";

type ProviderConfig = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
};

type ApiKeyContextType = {
  provider: Provider | null;
  providerConfig: ProviderConfig | null;
  setProviderConfig: (provider: Provider, config: ProviderConfig) => void;
  clearProviderConfig: () => void;
};

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerConfig, setProviderConfigState] = useState<ProviderConfig | null>(null);

  const setProviderConfig = (newProvider: Provider, config: ProviderConfig) => {
    setProvider(newProvider);
    setProviderConfigState(config);
  };

  const clearProviderConfig = () => {
    setProvider(null);
    setProviderConfigState(null);
  };

  return (
    <ApiKeyContext.Provider
      value={{
        provider,
        providerConfig,
        setProviderConfig,
        clearProviderConfig,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error("useApiKey must be used within an ApiKeyProvider");
  }
  return context;
}

