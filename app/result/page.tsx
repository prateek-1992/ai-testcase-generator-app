"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TestCase, PrdSummary, TestCasePriority, TestCaseType } from "@/types/TestCase";
import { downloadAsJSON, downloadAsCSV, downloadAsExcel } from "@/lib/downloadUtils";

const ITEMS_PER_PAGE = 10;

export default function ResultPage() {
  const router = useRouter();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<PrdSummary | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [provider, setProvider] = useState<"openai" | "azure" | "ollama" | "gemini" | null>(null);
  const [providerConfig, setProviderConfig] = useState<any>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineTargetId, setRefineTargetId] = useState<string | null>(null);
  const [refineText, setRefineText] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  
  // Add more test cases state
  const [addMoreOpen, setAddMoreOpen] = useState(false);
  const [addMorePrompt, setAddMorePrompt] = useState("");
  const [addMoreCount, setAddMoreCount] = useState(5);
  const [addMoreLoading, setAddMoreLoading] = useState(false);
  const [addMoreError, setAddMoreError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter state
  const [filterType, setFilterType] = useState<TestCaseType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TestCasePriority | "all">("all");
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TestCase>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("testCases");
    const storedSummary = sessionStorage.getItem("prdSummary");
    const storedProviderConfig = sessionStorage.getItem("providerConfig");

    if (!stored) {
      router.push("/upload");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as TestCase[];
      setTestCases(parsed);
    } catch (error) {
      console.error("Failed to parse test cases:", error);
      router.push("/upload");
    }

    if (storedSummary) {
      try {
        const parsedSummary = JSON.parse(storedSummary) as PrdSummary;
        setSummary(parsedSummary);
      } catch (error) {
        console.error("Failed to parse PRD summary:", error);
      }
    }

    if (storedProviderConfig) {
      try {
        const parsedProvider = JSON.parse(storedProviderConfig) as {
          provider: "openai" | "azure" | "ollama" | "gemini";
          config: any;
        };
        setProvider(parsedProvider.provider);
        setProviderConfig(parsedProvider.config);
      } catch (error) {
        console.error("Failed to parse provider config:", error);
      }
    }
  }, [router]);

  // Filter and paginate test cases
  const filteredTestCases = useMemo(() => {
    return testCases.filter((tc) => {
      const typeMatch = filterType === "all" || tc.type === filterType;
      const priorityMatch = filterPriority === "all" || tc.priority === filterPriority;
      return typeMatch && priorityMatch;
    });
  }, [testCases, filterType, filterPriority]);

  const totalPages = Math.ceil(filteredTestCases.length / ITEMS_PER_PAGE);
  const paginatedTestCases = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredTestCases.slice(start, end);
  }, [filteredTestCases, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterPriority]);

  const toggleExpand = (testId: string) => {
    setExpandedId(expandedId === testId ? null : testId);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(testCases, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Functional":
        return "bg-blue-100 text-blue-800";
      case "Negative":
        return "bg-orange-100 text-orange-800";
      case "Edge":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openRefineDialog = (testId: string) => {
    setRefineTargetId(testId);
    setRefineText("");
    setRefineError(null);
    setRefineOpen(true);
  };

  const handleRefine = async () => {
    if (!refineTargetId || !provider || !providerConfig || !summary?.text) {
      setRefineError("Missing provider configuration or PRD summary. Please regenerate test cases.");
      return;
    }

    const target = testCases.find((tc) => tc.testId === refineTargetId);
    if (!target) {
      setRefineError("Selected test case not found.");
      return;
    }

    if (!refineText.trim()) {
      setRefineError("Please enter a follow-up instruction.");
      return;
    }

    setRefineLoading(true);
    setRefineError(null);

    try {
      const response = await fetch("/api/refine-test-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          config: providerConfig,
          summary: summary.text,
          testCase: target,
          followup: refineText,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to refine test case. Please try again.");
        } else {
          throw new Error(`Failed to refine test case: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      const updated: TestCase = data.testCase;

      const updatedList = testCases.map((tc) =>
        tc.testId === refineTargetId ? updated : tc
      );
      setTestCases(updatedList);
      sessionStorage.setItem("testCases", JSON.stringify(updatedList));
      setRefineOpen(false);
      setRefineTargetId(null);
      setRefineText("");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setRefineLoading(false);
    }
  };

  const startEdit = (testCase: TestCase) => {
    setEditingId(testCase.testId);
    setEditForm({
      title: testCase.title,
      description: testCase.description,
      preconditions: testCase.preconditions,
      steps: [...testCase.steps],
      expectedResult: testCase.expectedResult,
      priority: testCase.priority,
      type: testCase.type,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId) return;

    const updatedList = testCases.map((tc) =>
      tc.testId === editingId
        ? {
            ...tc,
            ...editForm,
            steps: Array.isArray(editForm.steps) ? editForm.steps : [],
          }
        : tc
    );
    setTestCases(updatedList);
    sessionStorage.setItem("testCases", JSON.stringify(updatedList));
    setEditingId(null);
    setEditForm({});
  };

  const updateEditForm = (field: keyof TestCase, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...(editForm.steps || [])];
    newSteps[index] = value;
    updateEditForm("steps", newSteps);
  };

  const addStep = () => {
    const newSteps = [...(editForm.steps || []), ""];
    updateEditForm("steps", newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = [...(editForm.steps || [])];
    newSteps.splice(index, 1);
    updateEditForm("steps", newSteps);
  };

  const openAddMoreDialog = () => {
    setAddMorePrompt("");
    setAddMoreCount(5);
    setAddMoreError(null);
    setAddMoreOpen(true);
  };

  const handleAddMore = async () => {
    if (!provider || !providerConfig || !summary?.text) {
      setAddMoreError("Missing provider configuration or PRD summary. Please regenerate test cases.");
      return;
    }

    if (!addMorePrompt.trim()) {
      setAddMoreError("Please enter a follow-up instruction (e.g., 'add more negative test cases').");
      return;
    }

    setAddMoreLoading(true);
    setAddMoreError(null);

    try {
      const response = await fetch("/api/add-more-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          config: providerConfig,
          summary: summary.text,
          existingTestCases: testCases,
          followUpPrompt: addMorePrompt,
          count: addMoreCount,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add more test cases. Please try again.");
        } else {
          throw new Error(`Failed to add more test cases: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      const newTestCases: TestCase[] = data.testCases;

      // Merge new test cases with existing ones
      const updatedList = [...testCases, ...newTestCases];
      setTestCases(updatedList);
      sessionStorage.setItem("testCases", JSON.stringify(updatedList));
      setAddMoreOpen(false);
      setAddMorePrompt("");
      setAddMoreCount(5);
    } catch (err) {
      setAddMoreError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setAddMoreLoading(false);
    }
  };

  if (testCases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading test cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Generated Test Cases
              </h1>
              <p className="text-gray-600">
                {filteredTestCases.length} of {testCases.length} test case
                {testCases.length !== 1 ? "s" : ""} shown
                {filterType !== "all" || filterPriority !== "all" ? " (filtered)" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative group">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    onClick={() => downloadAsJSON(testCases, "test-cases")}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download as JSON
                  </button>
                  <button
                    onClick={() => downloadAsCSV(testCases, "test-cases")}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download as CSV
                  </button>
                  <button
                    onClick={() => downloadAsExcel(testCases, "test-cases")}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download as Excel
                  </button>
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy JSON
                  </>
                )}
              </button>
              <button
                onClick={openAddMoreDialog}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add More Test Cases
              </button>
              <button
                onClick={() => router.push("/upload")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate New
              </button>
            </div>
          </div>
        </div>

        {/* PRD Summary - Collapsible */}
        {summary?.text && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold text-gray-900">PRD Summary</h2>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${summaryExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {summaryExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 whitespace-pre-line">{summary.text}</p>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Case Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TestCaseType | "all")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="all">All Types</option>
                <option value="Functional">Functional</option>
                <option value="Negative">Negative</option>
                <option value="Edge">Edge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as TestCasePriority | "all")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test Cases List */}
        <div className="space-y-4 mb-6">
          {paginatedTestCases.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-gray-600">No test cases match the selected filters.</p>
            </div>
          ) : (
            paginatedTestCases.map((testCase, index) => (
              <div
                key={testCase.testId || index}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  {editingId === testCase.testId ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={editForm.title || ""}
                          onChange={(e) => updateEditForm("title", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editForm.description || ""}
                          onChange={(e) => updateEditForm("description", e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preconditions
                        </label>
                        <textarea
                          value={editForm.preconditions || ""}
                          onChange={(e) => updateEditForm("preconditions", e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Steps *
                        </label>
                        {(editForm.steps || []).map((step, stepIndex) => (
                          <div key={stepIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={step}
                              onChange={(e) => updateStep(stepIndex, e.target.value)}
                              placeholder={`Step ${stepIndex + 1}`}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            />
                            <button
                              onClick={() => removeStep(stepIndex)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addStep}
                          className="mt-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
                        >
                          + Add Step
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expected Result
                        </label>
                        <textarea
                          value={editForm.expectedResult || ""}
                          onChange={(e) => updateEditForm("expectedResult", e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority
                          </label>
                          <select
                            value={editForm.priority || "Medium"}
                            onChange={(e) => updateEditForm("priority", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={editForm.type || "Functional"}
                            onChange={(e) => updateEditForm("type", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          >
                            <option value="Functional">Functional</option>
                            <option value="Negative">Negative</option>
                            <option value="Edge">Edge</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={saveEdit}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {testCase.testId}: {testCase.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(testCase.priority)}`}>
                              {testCase.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(testCase.type)}`}>
                              {testCase.type}
                            </span>
                          </div>
                          {testCase.description && (
                            <p className="text-gray-600 mb-2">{testCase.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <button
                            type="button"
                            onClick={() => toggleExpand(testCase.testId)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {expandedId === testCase.testId ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(testCase)}
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openRefineDialog(testCase.testId)}
                              className="text-xs text-purple-600 hover:text-purple-700 underline"
                            >
                              Refine
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedId === testCase.testId && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          {testCase.preconditions && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-1">Preconditions:</h4>
                              <p className="text-gray-600 text-sm">{testCase.preconditions}</p>
                            </div>
                          )}
                          {testCase.steps && testCase.steps.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Test Steps:</h4>
                              <ol className="list-decimal list-inside space-y-1">
                                {testCase.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="text-gray-600 text-sm">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {testCase.expectedResult && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-1">Expected Result:</h4>
                              <p className="text-gray-600 text-sm">{testCase.expectedResult}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTestCases.length)} of {filteredTestCases.length} test cases
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refine Dialog */}
        {refineOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Refine Test Case</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you like to refine this test case?
                </label>
                <textarea
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  placeholder="e.g., Make this a negative test case focusing on invalid inputs..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              {refineError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {refineError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleRefine}
                  disabled={refineLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {refineLoading ? "Refining..." : "Refine"}
                </button>
                <button
                  onClick={() => {
                    setRefineOpen(false);
                    setRefineText("");
                    setRefineError(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add More Test Cases Dialog */}
        {addMoreOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Add More Test Cases</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What kind of test cases would you like to add?
                </label>
                <textarea
                  value={addMorePrompt}
                  onChange={(e) => setAddMorePrompt(e.target.value)}
                  placeholder="e.g., Add more negative test cases focusing on invalid inputs and error handling..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The system will automatically prevent duplicates with existing test cases.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of test cases to generate
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={addMoreCount}
                    onChange={(e) => setAddMoreCount(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <span className="text-lg font-semibold text-purple-600 min-w-[3rem] text-center">
                    {addMoreCount}
                  </span>
                </div>
              </div>
              {addMoreError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {addMoreError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAddMore}
                  disabled={addMoreLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addMoreLoading ? "Generating..." : "Add Test Cases"}
                </button>
                <button
                  onClick={() => {
                    setAddMoreOpen(false);
                    setAddMorePrompt("");
                    setAddMoreCount(5);
                    setAddMoreError(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
