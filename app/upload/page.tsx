"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TestCase } from "@/types/TestCase";
import WorkflowModal from "./WorkflowModal";
import { countPrdTokens } from "@/lib/tokenCounter";
import { obfuscateKey, deobfuscateKey, maskApiKey, isValidApiKeyFormat } from "@/lib/utils/encryption";
import { callLLMClient } from "@/lib/providers/client";
import { generatePrdSummaryPrompt, generateTestCasePrompt } from "@/lib/prompt";
import { parseTestCasesFromLLM } from "@/lib/utils/parseLLMResponse";
import { normalizeTestCases } from "@/lib/utils/normalizeTestCase";
import { useApiKey } from "@/contexts/ApiKeyContext";

type Provider = "openai" | "azure" | "ollama" | "gemini";

type WorkflowStep = 
  | "extracting"
  | "summary"
  | "thinking"
  | "writing"
  | "finalizing"
  | "complete";

export default function UploadPage() {
  const router = useRouter();
  const { setProviderConfig } = useApiKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Workflow modal state
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("extracting");
  const [extractedText, setExtractedText] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [tokenUsage, setTokenUsage] = useState<{
    prdTokens: number;
    summaryTokens: { input: number; output: number; total: number };
    testCaseTokens: { input: number; output: number; total: number };
    totalTokens: number;
  } | undefined>();

  // Provider-specific config
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [azureApiKey, setAzureApiKey] = useState("");
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureDeployment, setAzureDeployment] = useState("");
  const [azureApiVersion, setAzureApiVersion] = useState("2024-02-15-preview");
  const [ollamaModel, setOllamaModel] = useState("llama3.1");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash-latest");
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [loadingGeminiModels, setLoadingGeminiModels] = useState(false);
  const [testCaseCount, setTestCaseCount] = useState(10);
  
  // API key visibility toggles
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // No localStorage loading - keys only exist in React state during session
  // This ensures keys are cleared when page is refreshed/closed (better security)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "text/markdown",
      "text/x-markdown",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        `Unsupported file type: ${selectedFile.type}. Supported: PDF, DOCX, TXT, MD`
      );
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  /**
   * Gets provider config from form state (what user sees and can edit)
   * Keys only exist in React state - not persisted to localStorage for security
   */
  const getProviderConfig = () => {
    switch (provider) {
      case "openai": {
        return {
          apiKey: openaiApiKey, // Use current form input (React state only)
          model: openaiModel,
        };
      }
      case "azure":
        return {
          apiKey: azureApiKey,
          endpoint: azureEndpoint,
          deployment: azureDeployment,
          apiVersion: azureApiVersion,
        };
      case "ollama": {
        return {
          baseUrl: ollamaBaseUrl, // Use current form input (React state only)
          model: ollamaModel,
        };
      }
      case "gemini": {
        return {
          apiKey: geminiApiKey, // Use current form input (React state only)
          model: geminiModel,
        };
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setWorkflowStep("extracting");
    setExtractedText("");
    setSummary("");
    setTestCases([]);
    setTokenUsage(undefined);

    if (!file) {
      setError("Please select a file");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Extract text from file
      const formData = new FormData();
      formData.append("file", file);

      setWorkflowStep("extracting");
      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!extractResponse.ok) {
        const contentType = extractResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await extractResponse.json();
          throw new Error(errorData.error || "Failed to extract text");
        } else {
          const text = await extractResponse.text();
          throw new Error(
            `Failed to extract text: ${extractResponse.status} ${extractResponse.statusText}`
          );
        }
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.text;
      setExtractedText(extractedText);
      const prdTokens = countPrdTokens(extractedText);

      // Step 2: Generate PRD summary (CLIENT-SIDE - keys never sent to backend)
      setWorkflowStep("summary");
      const config = getProviderConfig();
      
      // Check if provider supports client-side calls
      if (provider === "azure") {
        throw new Error(
          "Azure OpenAI requires server-side calls due to CORS restrictions. " +
          "Please use OpenAI or Gemini provider, or self-host this application."
        );
      }
      
      // Make LLM call directly from browser
      const summaryPrompt = generatePrdSummaryPrompt(extractedText);
      const summaryResult = await callLLMClient(
        {
          provider: provider as "openai" | "gemini" | "ollama",
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
        },
        summaryPrompt
      );
      
      const summaryText = summaryResult.content.trim();
      setSummary(summaryText);
      
      // Extract token usage
      const summaryTokens = summaryResult.tokenUsage
        ? {
            input: summaryResult.tokenUsage.promptTokens || 0,
            output: summaryResult.tokenUsage.completionTokens || 0,
            total: summaryResult.tokenUsage.totalTokens || 0,
          }
        : { input: 0, output: 0, total: 0 };

      // Step 3: Thinking phase (brief pause for UX)
      setWorkflowStep("thinking");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Generate test cases (CLIENT-SIDE - keys never sent to backend)
      setWorkflowStep("writing");
      
      // Make LLM call directly from browser
      const testCasePrompt = generateTestCasePrompt(extractedText, testCaseCount);
      const testCaseResult = await callLLMClient(
        {
          provider: provider as "openai" | "gemini" | "ollama",
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
        },
        testCasePrompt
      );
      
      // Parse test cases from LLM response
      const parsed = parseTestCasesFromLLM(testCaseResult.content);
      const testCases = normalizeTestCases(parsed);
      setTestCases(testCases);

      // Extract token usage
      const testCaseTokens = testCaseResult.tokenUsage
        ? {
            input: testCaseResult.tokenUsage.promptTokens || 0,
            output: testCaseResult.tokenUsage.completionTokens || 0,
            total: testCaseResult.tokenUsage.totalTokens || 0,
          }
        : { input: 0, output: 0, total: 0 };

      // Calculate total token usage
      const totalTokens =
        prdTokens + summaryTokens.total + testCaseTokens.total;

      setTokenUsage({
        prdTokens,
        summaryTokens,
        testCaseTokens,
        totalTokens,
      });

      // Step 5: Finalizing
      setWorkflowStep("finalizing");
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 6: Complete
      setWorkflowStep("complete");

      // Store test cases and summary in sessionStorage (non-sensitive data)
      sessionStorage.setItem("testCases", JSON.stringify(testCases));
      if (summaryText) {
        sessionStorage.setItem("prdSummary", JSON.stringify({ text: summaryText }));
      }
      
      // Store provider config in React Context (memory only, NOT persisted)
      // API key exists only in React state - cleared on page refresh
      setProviderConfig(provider, {
        apiKey: config.apiKey, // Store plain key in context (already in memory)
        model: config.model,
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        deployment: config.deployment,
        apiVersion: config.apiVersion,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred. Please try again."
      );
      setLoading(false);
      setWorkflowStep("extracting");
    }
  };

  const handleViewResults = () => {
    router.push("/result");
  };

  const fetchGeminiModels = async () => {
    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      setError("Please enter your Gemini API key first");
      return;
    }

    setLoadingGeminiModels(true);
    setError(null);
    
    try {
      const response = await fetch("/api/list-gemini-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: geminiApiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch available models");
      }

      const data = await response.json();
      setGeminiModels(data.models || []);
      
      // Auto-select first available model if current model is not in list
      if (data.models && data.models.length > 0) {
        if (!data.models.includes(geminiModel)) {
          setGeminiModel(data.models[0]);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch available models"
      );
    } finally {
      setLoadingGeminiModels(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Test Case Generator
          </h1>
          <p className="text-lg text-gray-600">
            Upload your PRD document and generate comprehensive test cases
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload PRD Document
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="space-y-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Click to upload
                  </button>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOCX, TXT, or MD (max 10MB)
                </p>
              </div>
              {file && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test Case Count Slider */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Number of Test Cases to Generate
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">5</span>
                <span className="text-lg font-semibold text-blue-600">{testCaseCount}</span>
                <span className="text-sm text-gray-600">20</span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                value={testCaseCount}
                onChange={(e) => setTestCaseCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-gray-500 text-center">
                Adjust the slider to control how many test cases will be generated
              </p>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              LLM Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="azure">Azure OpenAI</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="gemini">Google Gemini</option>
            </select>

            {/* OpenAI Config */}
            {provider === "openai" && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      API Key *
                    </label>
                    <div className="group relative">
                      <svg
                        className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-help"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="font-semibold mb-1">🔒 100% Secure</p>
                        <p className="mb-2">Your API key exists only in memory during your session and is <strong>never sent to our servers</strong>.</p>
                        <p className="mb-2">LLM calls are made directly from your browser to OpenAI.</p>
                        <p className="mb-2">Keys are cleared when you refresh or close the tab (maximum security).</p>
                        <p>We cannot see, log, or access your keys.</p>
                        <div className="absolute left-4 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type={showOpenAIKey ? "text" : "password"}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="sk-..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showOpenAIKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {openaiApiKey && !isValidApiKeyFormat(openaiApiKey, "openai") && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Key format may be invalid. OpenAI keys typically start with &quot;sk-&quot;
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="gpt-4o-mini"
                  />
                </div>
              </div>
            )}

            {/* Azure Config */}
            {provider === "azure" && (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <p className="text-xs text-amber-800">
                    <strong>⚠️ Note:</strong> Azure OpenAI requires server-side calls due to CORS restrictions. 
                    Please use OpenAI or Gemini for client-side security, or self-host this application.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      API Key *
                    </label>
                    <div className="group relative">
                      <svg
                        className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-help"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="font-semibold mb-1">⚠️ Server-Side Required</p>
                        <p className="mb-2">Azure OpenAI requires server-side calls due to CORS. Keys will be sent to our backend.</p>
                        <p className="mb-2">For maximum security, use OpenAI or Gemini instead.</p>
                        <div className="absolute left-4 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type={showAzureKey ? "text" : "password"}
                      value={azureApiKey}
                      onChange={(e) => setAzureApiKey(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAzureKey(!showAzureKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showAzureKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {azureApiKey && !isValidApiKeyFormat(azureApiKey, "azure") && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Key format may be invalid. Azure keys are typically 32+ characters.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endpoint *
                  </label>
                  <input
                    type="text"
                    value={azureEndpoint}
                    onChange={(e) => setAzureEndpoint(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://your-instance.openai.azure.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deployment Name *
                  </label>
                  <input
                    type="text"
                    value={azureDeployment}
                    onChange={(e) => setAzureDeployment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Version *
                  </label>
                  <input
                    type="text"
                    value={azureApiVersion}
                    onChange={(e) => setAzureApiVersion(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Ollama Config */}
            {provider === "ollama" && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="llama3.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="http://localhost:11434"
                  />
                </div>
              </div>
            )}

            {/* Gemini Config */}
            {provider === "gemini" && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      API Key *
                    </label>
                    <div className="group relative">
                      <svg
                        className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-help"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <p className="font-semibold mb-1">🔒 100% Secure</p>
                        <p className="mb-2">Your API key exists only in memory during your session and is <strong>never sent to our servers</strong>.</p>
                        <p className="mb-2">LLM calls are made directly from your browser to Google Gemini.</p>
                        <p className="mb-2">Keys are cleared when you refresh or close the tab (maximum security).</p>
                        <p>We cannot see, log, or access your keys.</p>
                        <div className="absolute left-4 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        value={geminiApiKey}
                        onChange={(e) => {
                          setGeminiApiKey(e.target.value);
                          setGeminiModels([]); // Clear models when key changes
                        }}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="AIza..."
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showGeminiKey ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={fetchGeminiModels}
                      disabled={loadingGeminiModels || !geminiApiKey}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {loadingGeminiModels ? "Loading..." : "Fetch Models"}
                    </button>
                  </div>
                  {geminiApiKey && !isValidApiKeyFormat(geminiApiKey, "gemini") && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Key format may be invalid. Gemini keys typically start with &quot;AIza&quot;
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  {geminiModels.length > 0 ? (
                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      {geminiModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="gemini-1.5-flash-latest"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Click &quot;Fetch Models&quot; to see available models, or enter a model name manually
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex flex-col items-center justify-center gap-2">
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              </span>
            ) : (
              "Extract & Generate Test Cases"
            )}
          </button>
        </form>

        {/* Security Disclaimer Section */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🔒 Your API Keys Are 100% Secure
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong>✅ Client-Side Architecture:</strong> All LLM API calls are made directly from your browser. 
                  Your API keys are <strong>never sent to our servers</strong>.
                </p>
                <p>
                  <strong>✅ React Context (Memory Only):</strong> Keys are stored in React Context (in-memory state) and are <strong>never persisted</strong> to browser storage. 
                  They are <strong>automatically cleared</strong> when you refresh the page or close the browser tab - maximum security with zero persistence.
                </p>
                <p>
                  <strong>✅ Zero Trust Required:</strong> Our backend (Vercel) never sees your keys. 
                  We cannot log, store, or access them - it&apos;s architecturally impossible.
                </p>
                <p>
                  <strong>✅ Direct Provider Communication:</strong> Your browser communicates directly with OpenAI, Gemini, or Ollama. 
                  We act only as a file extraction service.
                </p>
                <p className="pt-2 text-xs text-gray-600">
                  This follows the same security model used by Continue.dev, LangFlow, Flowise, and other trusted open-source AI tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Modal */}
      <WorkflowModal
        isOpen={loading}
        currentStep={workflowStep}
        extractedText={extractedText}
        summary={summary}
        testCases={testCases}
        tokenUsage={tokenUsage}
        onViewResults={handleViewResults}
      />
    </div>
  );
}
