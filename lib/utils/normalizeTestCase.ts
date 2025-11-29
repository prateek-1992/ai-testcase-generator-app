import { TestCase } from "@/types/TestCase";

/**
 * Normalizes a test case to ensure all required fields exist with defaults
 */
export function normalizeTestCase(tc: Partial<TestCase>, index: number, existingIds?: Set<string>): TestCase {
  // Generate unique test ID
  let testId = tc.testId || `TC-${String(index + 1).padStart(3, "0")}`;
  
  // Ensure ID is unique if existingIds provided
  if (existingIds) {
    let counter = index + 1;
    while (existingIds.has(testId)) {
      testId = `TC-${String(counter).padStart(3, "0")}`;
      counter++;
    }
    existingIds.add(testId);
  }

  return {
    testId,
    title: tc.title || `Test Case ${index + 1}`,
    description: tc.description || "",
    preconditions: tc.preconditions || "",
    steps: Array.isArray(tc.steps) ? tc.steps : [],
    expectedResult: tc.expectedResult || "",
    priority: (tc.priority as TestCase["priority"]) || "Medium",
    type: (tc.type as TestCase["type"]) || "Functional",
  };
}

/**
 * Normalizes an array of test cases
 */
export function normalizeTestCases(testCases: Partial<TestCase>[], existingTestCases: TestCase[] = []): TestCase[] {
  const existingIds = new Set(existingTestCases.map(tc => tc.testId));
  
  return testCases.map((tc, index) => 
    normalizeTestCase(tc, existingTestCases.length + index + 1, existingIds)
  );
}

