import { TestCase } from "@/types/TestCase";

/**
 * Professional Prompt Engineering for Test Case Generation
 * 
 * Uses Chat Message Format (System + User) for optimal instruction following
 * 
 * Best Practices Applied:
 * 1. System message: Role definition, constraints, output format (stable, reusable)
 * 2. User message: Task-specific content, context, data (dynamic)
 * 3. Clear separation of concerns
 * 4. Better token efficiency and instruction following
 */

export interface ChatPrompt {
  system: string;
  user: string;
}

/**
 * Generates system and user prompts for test case generation
 * System prompt contains role, constraints, and output format
 * User prompt contains the PRD and task
 * 
 * @param prdText - The extracted PRD text content
 * @param count - Optional number of test cases to generate (default: 10-20)
 * @returns Object with system and user prompts
 */
export const generateTestCasePrompt = (prdText: string, count?: number): ChatPrompt => {
  const systemPrompt = `You are an expert QA test designer with 10+ years of experience creating comprehensive test cases for software products.

Your role is to analyze Product Requirements Documents (PRDs) and generate complete, high-quality test cases that cover:
- Functional scenarios (happy paths)
- Negative scenarios (error cases, invalid inputs)
- Edge cases (boundary conditions, unusual states)

OUTPUT FORMAT REQUIREMENTS:
You MUST return ONLY valid JSON that can be parsed by JSON.parse().

JSON Schema:
- Type: Array of objects
- Each object must have these EXACT fields (all required):
  - testId: string (format: "TC-001", "TC-002", etc.)
  - title: string (concise, action-oriented)
  - description: string (detailed what is being tested)
  - preconditions: string (system state before test)
  - steps: array of strings (numbered steps: "1. Do X", "2. Verify Y")
  - expectedResult: string (what should happen)
  - priority: string (one of: "High", "Medium", "Low")
  - type: string (one of: "Functional", "Negative", "Edge")

JSON Syntax Rules (CRITICAL):
1. NO markdown code blocks (no \`\`\`json or \`\`\`)
2. NO explanatory text before or after JSON
3. Start with [ and end with ]
4. Escape quotes inside strings: use \\" not "
5. Separate all properties with commas
6. Separate all array elements with commas
7. All string values must be in double quotes

EXAMPLE OUTPUT FORMAT:
[
  {
    "testId": "TC-001",
    "title": "User login with valid credentials",
    "description": "Verify that a registered user can successfully log in using valid email and password",
    "preconditions": "User account exists and is active, user is on login page",
    "steps": [
      "1. Navigate to login page",
      "2. Enter valid email address",
      "3. Enter valid password",
      "4. Click 'Login' button",
      "5. Verify user is redirected to dashboard"
    ],
    "expectedResult": "User is successfully logged in and redirected to dashboard with welcome message displayed",
    "priority": "High",
    "type": "Functional"
  }
]

QUALITY REQUIREMENTS:
- Generate ${count ? `exactly ${count}` : '10-20'} test cases${count ? '' : ' minimum (more for complex PRDs)'}
- Cover all major features mentioned in PRD
- Include functional, negative, and edge case types
- Prioritize based on business criticality
- Make steps clear, actionable, and testable
- Ensure test cases are independent and can run in any order

VALIDATION:
Before responding, verify:
1. JSON is valid (can be parsed by JSON.parse())
2. All required fields are present in each object
3. All enum values (priority, type) are correct
4. No markdown formatting is included
5. All quotes inside strings are escaped

Return ONLY the JSON array, nothing else. Start your response with [ and end with ].`;

  const userPrompt = `Analyze the following Product Requirements Document (PRD) and generate a complete set of test cases.

THINKING PROCESS:
Before generating test cases, consider:
1. What are the main features and user flows described?
2. What are the critical business rules and constraints?
3. What are the edge cases and boundary conditions?
4. What could go wrong (negative scenarios)?
5. What are the different user roles or system states?

PRODUCT REQUIREMENTS DOCUMENT:
${prdText}

Generate comprehensive test cases covering all major functionality, edge cases, and negative scenarios described in the PRD above.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
};

/**
 * Generates system and user prompts for refining a single test case
 * 
 * @param summary - PRD summary text
 * @param testCase - Current test case to refine
 * @param followupInstruction - User's instruction for refinement
 * @returns Object with system and user prompts
 */
export const refineTestCasePrompt = (
  summary: string,
  testCase: any,
  followupInstruction: string
): ChatPrompt => {
  const systemPrompt = `You are an expert QA test designer specializing in refining and improving test cases.

Your role is to refine test cases based on user feedback while maintaining consistency with the PRD requirements.

OUTPUT FORMAT REQUIREMENTS:
You MUST return ONLY valid JSON that can be parsed by JSON.parse().

JSON Schema:
- Type: Single object (not an array)
- Must have these EXACT fields:
  - testId: string (keep original unless user requests change)
  - title: string
  - description: string
  - preconditions: string
  - steps: array of strings
  - expectedResult: string
  - priority: string ("High", "Medium", or "Low")
  - type: string ("Functional", "Negative", or "Edge")

JSON Syntax Rules (CRITICAL):
1. NO markdown code blocks (no \`\`\`json or \`\`\`)
2. NO explanatory text before or after JSON
3. Start with { and end with }
4. Escape quotes inside strings: use \\" not "
5. Separate all properties with commas
6. All string values must be in double quotes

EXAMPLE OUTPUT FORMAT:
{
  "testId": "TC-001",
  "title": "User login with valid credentials",
  "description": "Verify that a registered user can successfully log in using valid email and password",
  "preconditions": "User account exists and is active, user is on login page",
  "steps": [
    "1. Navigate to login page",
    "2. Enter valid email address",
    "3. Enter valid password",
    "4. Click 'Login' button",
    "5. Verify user is redirected to dashboard"
  ],
  "expectedResult": "User is successfully logged in and redirected to dashboard with welcome message displayed",
  "priority": "High",
  "type": "Functional"
}

VALIDATION:
Before responding, verify:
1. JSON is valid (can be parsed by JSON.parse())
2. All required fields are present
3. All enum values (priority, type) are correct
4. No markdown formatting is included
5. All quotes inside strings are escaped
6. Response is a single object, not an array

Return ONLY the JSON object, nothing else. Start your response with { and end with }.`;

  const userPrompt = `Refine the provided test case based on the user's instruction while maintaining consistency with the PRD summary.

THINKING PROCESS:
1. Understand what the user wants to change or improve
2. Ensure the refined test case aligns with the PRD summary
3. Maintain test case quality standards (clear steps, proper structure)
4. Preserve test case ID unless explicitly asked to change it

PRD SUMMARY:
${summary}

CURRENT TEST CASE:
${JSON.stringify(testCase, null, 2)}

USER'S REFINEMENT INSTRUCTION:
${followupInstruction}

Refine the test case according to the user's instruction while ensuring it remains consistent with the PRD summary.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
};

/**
 * Generates a correction prompt when JSON parsing fails
 * Uses system/user format for better error correction
 * 
 * @param invalidJson - The invalid JSON string
 * @param parseError - The error message from JSON.parse()
 * @param originalSystemPrompt - The original system prompt context
 * @returns Object with system and user prompts for correction
 */
export const generateJsonCorrectionPrompt = (
  invalidJson: string,
  parseError: string,
  originalSystemPrompt: string
): ChatPrompt => {
  const systemPrompt = `You are a JSON syntax expert. Your task is to fix invalid JSON syntax errors.

Your role is to:
1. Identify JSON syntax errors (missing commas, unescaped quotes, etc.)
2. Fix all syntax errors while preserving the original data
3. Return ONLY the corrected, valid JSON

COMMON JSON ERRORS TO FIX:
1. Missing commas between properties
2. Unescaped quotes inside strings (use \\" not ")
3. Trailing commas (not allowed in JSON)
4. Missing quotes around property names or string values
5. Invalid characters in strings
6. Mismatched brackets or braces

CORRECTION RULES:
1. Return ONLY the corrected JSON
2. NO markdown code blocks
3. NO explanatory text
4. Ensure JSON.parse() can successfully parse your response
5. Maintain the original data structure and content

VALIDATION:
Before responding, mentally verify:
- JSON starts with { or [
- JSON ends with } or ]
- All quotes are properly escaped
- All commas are in correct positions
- No trailing commas

Return ONLY the corrected JSON, nothing else.`;

  const userPrompt = `The previous response contained invalid JSON that failed to parse.

PARSING ERROR:
${parseError}

INVALID JSON RESPONSE (first 1000 characters):
${invalidJson.substring(0, 1000)}${invalidJson.length > 1000 ? '...' : ''}

ORIGINAL SYSTEM INSTRUCTIONS (for context):
${originalSystemPrompt.substring(0, 500)}...

Fix all JSON syntax errors in the invalid JSON above and return ONLY the corrected, valid JSON.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
};

/**
 * Generates system and user prompts for PRD summary generation
 * 
 * @param prdText - The extracted PRD text content
 * @returns Object with system and user prompts
 */
export const generatePrdSummaryPrompt = (prdText: string): ChatPrompt => {
  const systemPrompt = `You are an expert product analyst with expertise in distilling complex requirements into concise, actionable summaries.

Your role is to read Product Requirements Documents (PRDs) and create structured, concise summaries that capture essential information needed for test case generation.

SUMMARY STRUCTURE:
Organize your summary into these sections:

1. **System Overview** (2-3 sentences)
   - Overall goal and purpose
   - Target users

2. **Key Features** (bullet points)
   - Main features/modules
   - Core functionality

3. **User Flows** (brief descriptions)
   - Primary user journeys
   - Key interactions

4. **Business Rules** (bullet points)
   - Critical constraints
   - Validation rules
   - Business logic requirements

5. **Edge Cases & Risks** (if mentioned)
   - Boundary conditions
   - Error scenarios
   - Special cases

QUALITY REQUIREMENTS:
- Keep total length under 600 words
- Use clear, concise language
- Focus on information relevant for test case generation
- Maintain accuracy to original PRD
- Use markdown formatting (## for sections, - for bullets)

OUTPUT FORMAT:
- Plain text (not JSON)
- Use markdown formatting (## for sections, - for bullets)
- No code blocks or special formatting`;

  const userPrompt = `Read the following Product Requirements Document (PRD) and create a structured, concise summary that captures the essential information needed for test case generation.

PRODUCT REQUIREMENTS DOCUMENT:
${prdText}

Provide the structured summary following the format specified in your instructions.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
};

/**
 * Generates system and user prompts for adding more test cases
 * Includes existing test cases to prevent duplicates
 * 
 * IMPORTANT: Each API call is stateless - the LLM has no memory of previous requests.
 * We MUST explicitly include existing test cases in the prompt to prevent duplicates.
 * 
 * @param prdSummary - PRD summary text
 * @param existingTestCases - Array of existing test cases (or summary if too long)
 * @param followUpPrompt - User's instruction for what kind of test cases to add
 * @param count - Number of test cases to generate
 * @returns Object with system and user prompts
 */
export const generateAddMoreTestCasesPrompt = (
  prdSummary: string,
  existingTestCases: TestCase[] | string, // Can be array or summary string
  followUpPrompt: string,
  count: number = 5
): ChatPrompt => {
  const systemPrompt = `You are an expert QA test designer with 10+ years of experience creating comprehensive test cases for software products.

Your role is to generate additional test cases based on user instructions while ensuring NO DUPLICATES with existing test cases.

OUTPUT FORMAT REQUIREMENTS:
You MUST return ONLY valid JSON that can be parsed by JSON.parse().

JSON Schema:
- Type: Array of objects
- Each object must have these EXACT fields (all required):
  - testId: string (format: "TC-XXX" where XXX is a unique number NOT used in existing test cases)
  - title: string (concise, action-oriented, DIFFERENT from existing test cases)
  - description: string (detailed what is being tested)
  - preconditions: string (system state before test)
  - steps: array of strings (numbered steps: "1. Do X", "2. Verify Y")
  - expectedResult: string (what should happen)
  - priority: string (one of: "High", "Medium", "Low")
  - type: string (one of: "Functional", "Negative", "Edge")

JSON Syntax Rules (CRITICAL):
1. NO markdown code blocks (no \`\`\`json or \`\`\`)
2. NO explanatory text before or after JSON
3. Start with [ and end with ]
4. Escape quotes inside strings: use \\" not "
5. Separate all properties with commas
6. Separate all array elements with commas
7. All string values must be in double quotes

DUPLICATE PREVENTION (CRITICAL):
- Review ALL existing test cases carefully
- Generate test cases that are DISTINCTLY different
- Do NOT create test cases with similar titles, steps, or expected results
- Focus on NEW scenarios, edge cases, or variations not already covered
- If user asks for specific type (e.g., "negative test cases"), ensure they are truly different from existing negative test cases

QUALITY REQUIREMENTS:
- Generate exactly ${count} test cases
- Cover NEW scenarios not in existing test cases
- Follow the user's follow-up instruction carefully
- Include functional, negative, and edge case types as appropriate
- Prioritize based on business criticality
- Make steps clear, actionable, and testable
- Ensure test cases are independent and can run in any order

VALIDATION:
Before responding, verify:
1. JSON is valid (can be parsed by JSON.parse())
2. All required fields are present in each object
3. All enum values (priority, type) are correct
4. No markdown formatting is included
5. All quotes inside strings are escaped
6. Test cases are DIFFERENT from existing ones
7. Test IDs are unique and don't conflict with existing test cases

Return ONLY the JSON array, nothing else. Start your response with [ and end with ].`;

  // Format existing test cases for the prompt
  let existingTestCasesText: string;
  if (typeof existingTestCases === 'string') {
    // It's already a summary
    existingTestCasesText = `EXISTING TEST CASES SUMMARY:\n${existingTestCases}\n\nIMPORTANT: The above is a summary. Generate test cases that are clearly different from what's described.`;
  } else {
    // Format the array
    existingTestCasesText = `EXISTING TEST CASES (${existingTestCases.length} total):\n${JSON.stringify(existingTestCases, null, 2)}\n\nIMPORTANT: Review these carefully and generate test cases that are DISTINCTLY different.`;
  }

  const userPrompt = `Generate ${count} additional test cases based on the user's instruction, ensuring they are DIFFERENT from existing test cases.

THINKING PROCESS:
Before generating test cases, consider:
1. What test cases already exist? (review the list below)
2. What NEW scenarios can be tested that aren't already covered?
3. How can I follow the user's instruction while avoiding duplicates?
4. What are the gaps in test coverage?
5. What edge cases or negative scenarios are missing?

PRD SUMMARY:
${prdSummary}

${existingTestCasesText}

USER'S INSTRUCTION:
${followUpPrompt}

Generate exactly ${count} NEW test cases that:
- Follow the user's instruction
- Are DISTINCTLY different from existing test cases
- Cover scenarios not already tested
- Maintain high quality standards (clear steps, proper structure)
- Use unique test IDs that don't conflict with existing ones`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
};
