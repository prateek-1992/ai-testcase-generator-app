"use client";

import { TestCase } from "@/types/TestCase";
import { formatTokenCount } from "@/lib/tokenCounter";

type WorkflowStep = 
  | "extracting"
  | "summary"
  | "thinking"
  | "writing"
  | "finalizing"
  | "complete";

interface WorkflowModalProps {
  isOpen: boolean;
  currentStep: WorkflowStep;
  extractedText?: string;
  summary?: string;
  testCases?: TestCase[];
  tokenUsage?: {
    prdTokens: number;
    summaryTokens: { input: number; output: number; total: number };
    testCaseTokens: { input: number; output: number; total: number };
    totalTokens: number;
  };
  onViewResults: () => void;
  onClose?: () => void;
}

export default function WorkflowModal({
  isOpen,
  currentStep,
  extractedText,
  summary,
  testCases,
  tokenUsage,
  onViewResults,
  onClose,
}: WorkflowModalProps) {
  if (!isOpen) return null;

  const steps = [
    {
      id: "extracting" as WorkflowStep,
      label: "Extracting text from PRD",
      description: "Reading and parsing your document...",
    },
    {
      id: "summary" as WorkflowStep,
      label: "Generating PRD summary",
      description: "Analyzing and summarizing key requirements...",
    },
    {
      id: "thinking" as WorkflowStep,
      label: "Thinking of test cases",
      description: "Identifying test scenarios and coverage areas...",
    },
    {
      id: "writing" as WorkflowStep,
      label: "Writing test cases",
      description: "Creating detailed test case specifications...",
    },
    {
      id: "finalizing" as WorkflowStep,
      label: "Finalizing",
      description: "Formatting and validating results...",
    },
  ];

  const getStepStatus = (stepId: WorkflowStep) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    
    if (stepIndex < currentIndex) return "done";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Generating Test Cases
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Workflow Steps */}
        <div className="space-y-4 mb-6">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isActive = status === "active";
            const isDone = status === "done";

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : isDone
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {isDone ? (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
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
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">
                        {index + 1}
                      </span>
                    </div>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-1 ${
                      isActive
                        ? "text-blue-900"
                        : isDone
                        ? "text-green-900"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p
                    className={`text-sm ${
                      isActive
                        ? "text-blue-700"
                        : isDone
                        ? "text-green-700"
                        : "text-gray-400"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Token Usage */}
        {tokenUsage && (
          <div className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Token Usage
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Document Input:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenCount(tokenUsage.prdTokens)} tokens
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Summary Generation:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenCount(tokenUsage.summaryTokens.total)} tokens
                </span>
              </div>
              <div className="text-xs text-gray-500 pl-4">
                ({formatTokenCount(tokenUsage.summaryTokens.input)} input, {formatTokenCount(tokenUsage.summaryTokens.output)} output)
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Test Case Generation:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenCount(tokenUsage.testCaseTokens.total)} tokens
                </span>
              </div>
              <div className="text-xs text-gray-500 pl-4">
                ({formatTokenCount(tokenUsage.testCaseTokens.input)} input, {formatTokenCount(tokenUsage.testCaseTokens.output)} output)
              </div>
              <div className="border-t border-gray-300 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-bold text-base">Total Tokens Used:</span>
                  <span className="text-blue-600 font-bold text-lg">
                    {formatTokenCount(tokenUsage.totalTokens)} tokens
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {currentStep === "complete" && testCases && (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Generation Complete!
              </h3>
              <p className="text-gray-600">
                Successfully generated {testCases.length} test case
                {testCases.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={onViewResults}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View Test Cases
            </button>
          </div>
        )}

        {/* Active Processing State */}
        {currentStep !== "complete" && (
          <div className="text-center text-sm text-gray-500">
            Please wait while we process your PRD...
          </div>
        )}
      </div>
    </div>
  );
}

