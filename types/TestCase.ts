export type TestCasePriority = "High" | "Medium" | "Low";
export type TestCaseType = "Functional" | "Negative" | "Edge";

export interface TestCase {
  testId: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: TestCasePriority;
  type: TestCaseType;
}

// A reusable summary of the PRD used to keep context small for follow-up prompts
export interface PrdSummary {
  text: string;
}

export interface GenerateTestCaseRequest {
  text: string;
  provider: "openai" | "azure" | "ollama" | "gemini";
  config: {
    apiKey?: string;
    model?: string;
    endpoint?: string;
    deployment?: string;
    apiVersion?: string;
    baseUrl?: string;
  };
  // Optional pre-computed summary; if omitted the API will generate one
  summary?: string;
}

export interface GenerateTestCaseResponse {
  testCases: TestCase[];
  summary: PrdSummary;
}

