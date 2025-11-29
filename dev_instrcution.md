📘 Phase 1 – Development Instructions (Cursor-Friendly)

This document defines exactly how to build Phase 1 of the Test Case Generator using Next.js + LangChain.js.

Paste this entire file into Cursor or keep it in your /docs folder.

🚀 Project Goal (Phase 1)

Build an MVP where a user can:

Upload a PRD document (PDF, DOCX, TXT, MD) in the UI

Extract text from the uploaded file

Send extracted text to an LLM (OpenAI / Azure OpenAI / Ollama) using LangChain.js

Display generated test cases in the UI

No DB, no authentication, no connectors, no knowledge base.

🏗 Tech Stack (Phase 1)

Frontend: Next.js (App Router) + TypeScript

LLM Layer: LangChain.js

Local Models (optional): Ollama

Styling: TailwindCSS (optional)

Backend: Next.js API routes

File Parsing: pdf-parse, mammoth

📁 Folder Structure (Create This Exactly)

Cursor should generate the following structure:

/app
  /upload
    page.tsx               ← UI to upload PRD
  /result
    page.tsx               ← Display test cases
/api
  /extract
    route.ts               ← Extract PRD text
  /generate
    route.ts               ← Generate test cases via LangChain.js
/lib
  /providers
    openai.ts              ← OpenAI provider
    azure.ts               ← Azure OpenAI provider
    ollama.ts              ← Ollama provider (local)
  parsePdf.ts              ← PDF parsing helper
  parseDocx.ts             ← DOCX parsing helper
  prompt.ts                ← Test case prompt template
/types
  TestCase.ts              ← TS interface for test cases

⚙️ API Endpoints (Cursor should implement these)
1. POST /api/extract

Handles file upload + text extraction.

Input:

multipart/form-data

file: PDF / DOCX / TXT / MD

Output:

{
  "text": "Extracted PRD text..."
}

2. POST /api/generate

Calls selected model through LangChain.js.

Input:

{
  "text": "Extracted PRD text...",
  "provider": "openai | azure | ollama",
  "config": { ... }
}


Output:

{
  "testCases": [...]
}

🤖 LangChain.js Providers (Cursor should implement these)

Create files under /lib/providers/.

1. OpenAI Provider (openai.ts)
import { ChatOpenAI } from "@langchain/openai";

export const openaiProvider = (apiKey: string, model: string) => {
  const llm = new ChatOpenAI({ apiKey, model });

  return {
    generate: async (prompt: string) => {
      const res = await llm.invoke(prompt);
      return res.content.toString();
    }
  };
};

2. Azure Provider (azure.ts)
import { ChatOpenAI } from "@langchain/openai";

export const azureProvider = (apiKey, endpoint, deployment, apiVersion) => {
  const llm = new ChatOpenAI({
    apiKey,
    model: deployment,
    azure: { apiKey, endpoint },
    apiVersion
  });

  return {
    generate: async (prompt) => {
      const res = await llm.invoke(prompt);
      return res.content.toString();
    }
  };
};

3. Ollama Provider (ollama.ts)

(Local model support)

import { ChatOllama } from "@langchain/ollama";

export const ollamaProvider = (model = "llama3.1") => {
  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model,
  });

  return {
    generate: async (prompt) => {
      const res = await llm.invoke(prompt);
      return res.content.toString();
    }
  };
};

🧩 Parse Helpers (Cursor should generate)
/lib/parsePdf.ts

Use pdf-parse

Extract text

/lib/parseDocx.ts

Use mammoth

Extract text

✍️ Prompt Template (/lib/prompt.ts)
export const generateTestCasePrompt = (prdText: string) => `
You are an expert QA test designer.

Generate structured test cases based on this PRD:

${prdText}

Output JSON only, as an array of objects with fields:
- testId
- title
- description
- preconditions
- steps (array)
- expectedResult
- priority (High/Medium/Low)
- type (Functional | Negative | Edge)

Make the cases clear, actionable, and high quality.
`;

🖥 UI Pages (Cursor should scaffold)
/app/upload/page.tsx

File upload drag-drop UI

Dropdown to choose provider

Fields for API keys

Button → "Extract & Generate"

After extraction → redirect to /result?data=...

/app/result/page.tsx

Receives generated test cases

Display in table

Expand steps

Copy JSON button (optional)

🔄 Flow Summary (Cursor must follow)
User selects provider + API key
      ↓
User uploads PRD file
      ↓
POST /api/extract
      ↓
Extracted text displayed/used
      ↓
POST /api/generate
      ↓
LangChain provider returns test cases
      ↓
Rendered in UI
