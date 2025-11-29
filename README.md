# Test Case Generator

A Next.js application that automatically generates comprehensive test cases from Product Requirements Documents (PRDs) using Large Language Models (LLMs). Upload your PRD in PDF, DOCX, TXT, or MD format, and get structured test cases with filtering, editing, and export capabilities.

## 🚀 Features

- **Multi-format PRD Support**: Upload PDF, DOCX, TXT, or MD files
- **Multiple LLM Providers**: 
  - OpenAI (GPT models)
  - Azure OpenAI
  - Ollama (Local - Free!)
- **PRD Summary Generation**: Automatically creates a concise summary for context
- **Test Case Management**:
  - View, filter, and paginate test cases
  - Edit test cases manually
  - Refine test cases with AI follow-up prompts
- **Export Options**: Download test cases as JSON, CSV, or Excel
- **Smart Filtering**: Filter by test case type (Functional/Negative/Edge) and priority (High/Medium/Low)
- **Pagination**: Navigate through large test case sets efficiently

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **TypeScript** knowledge (helpful but not required)
- For **Ollama** (local LLM): Docker or native Ollama installation

## 🛠️ Local Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd testcase-generator

# Install dependencies
npm install
```

### 2. Environment Setup

The application doesn't require environment variables for basic setup. API keys are entered directly in the UI for flexibility. However, if you want to set defaults, you can create a `.env.local` file:

```env
# Optional: Set default OpenAI API key (can still override in UI)
OPENAI_API_KEY=your-key-here

# Optional: Set default Azure OpenAI config
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## 🦙 Setting Up Ollama (Local LLM - Free!)

Using Ollama allows you to run LLMs locally, saving on API costs. Here's how to set it up:

### Option 1: Native Installation (Recommended)

1. **Install Ollama**:
   - **macOS**: Download from [ollama.ai](https://ollama.ai) or use Homebrew:
     ```bash
     brew install ollama
     ```
   - **Linux**: 
     ```bash
     curl -fsSL https://ollama.ai/install.sh | sh
     ```
   - **Windows**: Download installer from [ollama.ai](https://ollama.ai)

2. **Start Ollama Service**:
   ```bash
   ollama serve
   ```
   This starts the Ollama server on `http://localhost:11434` (default port).

3. **Pull a Model** (in a new terminal):
   ```bash
   # Recommended models for test case generation:
   ollama pull llama3.1        # Good balance of quality and speed
   ollama pull llama3.1:8b     # Faster, smaller model
   ollama pull mistral         # Alternative option
   ollama pull qwen2.5         # Another good option
   ```

4. **Verify Installation**:
   ```bash
   ollama list
   ```
   You should see your downloaded models listed.

### Option 2: Docker

```bash
# Pull Ollama Docker image
docker pull ollama/ollama

# Run Ollama container
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Pull a model
docker exec -it ollama ollama pull llama3.1
```

### Using Ollama in the App

1. Start your Next.js dev server: `npm run dev`
2. Go to the upload page
3. Select **"Ollama (Local)"** as the provider
4. **Model**: Enter the model name (e.g., `llama3.1`, `mistral`)
5. **Base URL**: Leave as `http://localhost:11434` (or your custom Ollama endpoint)
6. Upload your PRD and generate test cases!

**Note**: First generation might be slower as the model loads into memory. Subsequent requests will be faster.

## 💾 Data Storage

### Session Storage (Client-Side)

The application uses **browser sessionStorage** to persist data between page navigations:

- **`testCases`**: Array of generated test cases
- **`prdSummary`**: PRD summary text
- **`providerConfig`**: Selected provider and configuration (for refine functionality)

**Important Notes**:
- Data is stored **locally in your browser** only
- Data is **cleared when you close the browser tab/window**
- Data is **not sent to any external server** (except the LLM provider you choose)
- Each browser session is independent
- If you refresh the page, data persists (until tab is closed)

### Why Session Storage?

- **No backend database required** (simpler MVP)
- **Privacy**: Your PRD content stays in your browser
- **Fast**: No database queries
- **Stateless**: Easy to deploy and scale

### Limitations

- Data is lost when browser tab closes
- Not shared across devices/browsers
- Limited by browser storage quotas (~5-10MB typically)

## 📁 Project Structure

```
testcase-generator/
├── app/
│   ├── api/
│   │   ├── extract/          # Text extraction endpoint
│   │   ├── generate/         # Test case generation endpoint
│   │   └── refine-test-case/ # Test case refinement endpoint
│   ├── upload/               # File upload page
│   ├── result/               # Test cases display page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home (redirects to /upload)
├── lib/
│   ├── providers/            # LLM provider implementations
│   │   ├── openai.ts
│   │   ├── azure.ts
│   │   ├── ollama.ts
│   │   └── index.ts
│   ├── fileParser.ts         # Unified file parser
│   ├── parsePdf.ts           # PDF text extraction
│   ├── parseDocx.ts          # DOCX text extraction
│   ├── parseText.ts           # Plain text extraction
│   ├── prompt.ts             # LLM prompt templates
│   └── downloadUtils.ts      # Export utilities
├── types/
│   └── TestCase.ts            # TypeScript interfaces
├── sample-prd.txt            # Sample PRD for testing
├── sample-prd-enhanced.txt   # Enhanced sample PRD
└── sample-prd-enhanced.pdf   # Sample PDF PRD
```

## 🔧 Tech Stack

### Core
- **Next.js 14** (App Router) - React framework with API routes
- **TypeScript** - Type safety
- **React 18** - UI library

### LLM Integration
- **@langchain/openai** - OpenAI and Azure OpenAI integration
- **@langchain/ollama** - Local Ollama integration

### File Processing
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX text extraction

### UI & Styling
- **TailwindCSS** - Utility-first CSS framework
- **PostCSS** - CSS processing

### Export
- **xlsx** - Excel file generation

## 📖 Usage Guide

### 1. Upload PRD

1. Navigate to `/upload` (or home page)
2. Drag and drop or click to upload a PRD file (PDF, DOCX, TXT, MD)
3. Select your LLM provider:
   - **OpenAI**: Enter API key and model name
   - **Azure OpenAI**: Enter API key, endpoint, deployment name, and API version
   - **Ollama**: Enter model name (ensure Ollama is running locally)

### 2. Generate Test Cases

1. Click **"Extract & Generate Test Cases"**
2. Wait for processing (may take 30-60 seconds depending on PRD size and provider)
3. You'll be redirected to the results page

### 3. View and Manage Test Cases

- **PRD Summary**: Click to expand/collapse the generated summary
- **Filters**: Use dropdowns to filter by type or priority
- **Pagination**: Navigate through pages if you have many test cases
- **View Details**: Click the chevron icon to expand test case details
- **Edit**: Click "Edit" to manually modify a test case
- **Refine**: Click "Refine" to use AI to improve a test case with a follow-up prompt

### 4. Export Test Cases

Click the **"Download"** button and choose:
- **JSON**: Structured data format
- **CSV**: Spreadsheet-compatible format
- **Excel**: Formatted Excel workbook

## 🎯 Cost Optimization Tips

### Use Ollama for Development

1. **Set up Ollama locally** (see instructions above)
2. Use smaller models like `llama3.1:8b` for faster, cheaper testing
3. Only use paid providers (OpenAI/Azure) for final production test cases

### Model Selection

- **OpenAI**: `gpt-4o-mini` is cost-effective for good quality
- **Azure**: Use your organization's Azure credits
- **Ollama**: Completely free, runs on your machine

### PRD Size

- Break large PRDs into smaller sections if hitting token limits
- The PRD summary feature helps reduce context size for refinements

## 🐛 Troubleshooting

### Ollama Connection Issues

**Problem**: "Failed to connect to Ollama"

**Solutions**:
1. Ensure Ollama is running: `ollama serve`
2. Check the base URL is correct: `http://localhost:11434`
3. Verify model is downloaded: `ollama list`
4. Try pulling the model again: `ollama pull llama3.1`

### PDF Parsing Errors

**Problem**: "Failed to extract text from PDF"

**Solutions**:
1. Ensure PDF is not password-protected
2. Try converting PDF to text first
3. Check if PDF contains actual text (not just images)

### LLM Generation Errors

**Problem**: "Failed to parse LLM response"

**Solutions**:
1. Try a different model
2. Check your API key is valid
3. Ensure you have sufficient API credits/quota
4. For Ollama: Ensure model is fully loaded (first request may timeout)

### Session Storage Issues

**Problem**: Test cases disappear after refresh

**Solutions**:
1. Ensure you're not in incognito/private mode
2. Check browser storage isn't full
3. Don't close the browser tab (sessionStorage clears on tab close)

## 🔒 Privacy & Security

- **No data persistence**: All data is stored locally in your browser
- **API keys**: Entered in UI, stored only in sessionStorage (not sent to our servers)
- **PRD content**: Only sent to the LLM provider you choose
- **No tracking**: No analytics or tracking scripts included

## 🚧 Known Limitations

- **Session storage**: Data lost when browser tab closes
- **File size**: Large PDFs (>10MB) may take longer to process
- **Token limits**: Very long PRDs may need to be split
- **Ollama performance**: Depends on your machine's RAM and CPU

## 📝 Sample PRDs

The project includes sample PRDs for testing:
- `sample-prd.txt` - Basic authentication system PRD
- `sample-prd-enhanced.txt` - Comprehensive e-commerce checkout PRD
- `sample-prd-enhanced.pdf` - PDF version of enhanced PRD

## 🤝 Contributing

This is a Phase 1 MVP. Future enhancements could include:
- Database persistence
- User authentication
- Project management
- Test case templates
- Integration with test management tools

## 📄 License

This project is for demonstration/educational purposes.

## 🙋 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the code comments in `/lib` and `/app/api` directories
3. Check browser console for error messages

---

**Happy Test Case Generating! 🎉**
