# Test Case Generator

A Next.js application that automatically generates comprehensive test cases from Product Requirements Documents (PRDs) using Large Language Models (LLMs). 

**🔒 100% Client-Side Security** - Your API keys never leave your browser. All LLM calls are made directly from your browser to the provider.

Upload your PRD in PDF, DOCX, TXT, or MD format, and get structured test cases with filtering, editing, and export capabilities.

## 🚀 Features

- **Multi-format PRD Support**: Upload PDF, DOCX, TXT, or MD files
- **Multiple LLM Providers**: 
  - OpenAI (GPT models)
  - Google Gemini
  - Ollama (Local - Free!)
  - Azure OpenAI (requires self-hosting due to CORS)
- **PRD Summary Generation**: Automatically creates a concise summary for context
- **Test Case Management**:
  - View, filter, and paginate test cases
  - Edit test cases manually
  - Refine test cases with AI follow-up prompts
  - Add more test cases with custom instructions (prevents duplicates)
- **Export Options**: Download test cases as JSON, CSV, or Excel
- **Smart Filtering**: Filter by test case type (Functional/Negative/Edge) and priority (High/Medium/Low)
- **Pagination**: Navigate through large test case sets efficiently
- **🔒 100% Client-Side Security**: API keys never sent to backend - direct browser-to-LLM communication
- **Configurable Test Case Count**: Slider to select 5-20 test cases per generation

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/prateek-1992/ai-testcase-generator-app.git
   cd ai-testcase-generator-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Upload a PRD file (PDF, DOCX, TXT, or MD)
   - Enter your API key (OpenAI, Gemini, or use Ollama locally)
   - Generate test cases!

**That's it!** No environment variables needed. API keys exist only in React Context (memory) and are cleared on page refresh for maximum security.

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **TypeScript** knowledge (helpful but not required)
- For **Ollama** (local LLM): Docker or native Ollama installation
- **API Key** from one of the supported providers (OpenAI, Gemini, or Ollama for local)

## 🛠️ Local Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd testcase-generator

# Install dependencies
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

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

### Client-Side Storage (Browser Only)

The application uses **browser storage** and **React Context** to manage data:

**SessionStorage** (cleared when tab closes):
- **`testCases`**: Array of generated test cases
- **`prdSummary`**: PRD summary text

**React Context** (memory only, cleared on page refresh):
- **`providerConfig`**: Provider configuration including API keys
- **`provider`**: Selected LLM provider (OpenAI, Gemini, Ollama, Azure)

**Important**: API keys are **NOT** stored in localStorage or sessionStorage. They only exist in:
1. **React Context** (in-memory state) - accessible across pages during the session
2. **Cleared automatically** when you refresh the page or close the browser tab

**Important Notes**:
- ✅ All data stored **locally in your browser** only
- ✅ Data is **never sent to our servers** (except file extraction)
- ✅ API keys are **never stored on our backend**
- ✅ API keys are **never persisted to browser storage** - only in React memory
- ✅ API keys are **cleared on page refresh** - maximum security
- ✅ SessionStorage data cleared when browser tab closes

### Why Client-Side Storage?

- **Privacy**: Your data stays in your browser
- **Security**: API keys never leave your device
- **No backend database**: Simpler architecture, lower costs
- **Fast**: No database queries, instant access
- **Stateless backend**: Easy to deploy and scale

### Clearing Your Data

To clear all stored data:
1. **Browser Settings**: Clear site data for this domain
2. **Manual**: Open browser DevTools → Application → Clear Storage
3. **API Keys**: Simply refresh the page - keys are automatically cleared (stored only in React Context memory)

### Limitations

- Data is lost if browser data is cleared
- Not shared across devices/browsers
- Limited by browser storage quotas (~5-10MB typically)
- SessionStorage cleared when tab closes
- **API keys cleared on page refresh** (by design for security)

## 📁 Project Structure

```
testcase-generator/
├── app/
│   ├── api/
│   │   ├── extract/          # Text extraction endpoint (ONLY backend service)
│   │   ├── generate-cases/   # Legacy (being phased out)
│   │   ├── generate-summary/ # Legacy (being phased out)
│   │   ├── add-more-cases/   # Legacy (being phased out)
│   │   ├── refine-test-case/ # Legacy (being phased out)
│   │   └── list-gemini-models/ # Legacy (being phased out)
│   ├── upload/               # File upload page (client-side LLM calls)
│   ├── result/               # Test cases display page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home (redirects to /upload)
├── lib/
│   ├── providers/
│   │   ├── client/           # 🔒 CLIENT-SIDE providers (keys never leave browser)
│   │   │   ├── openai.ts     # Direct browser → OpenAI API
│   │   │   ├── gemini.ts     # Direct browser → Gemini API
│   │   │   └── index.ts      # Client-side LLM caller
│   │   ├── openai.ts         # Legacy server-side (not used)
│   │   ├── azure.ts          # Legacy server-side
│   │   ├── ollama.ts         # Legacy server-side
│   │   └── index.ts          # Legacy server-side factory
│   ├── utils/
│   │   ├── parseLLMResponse.ts # Shared JSON parsing
│   │   ├── normalizeTestCase.ts # Test case normalization
│   │   └── encryption.ts     # Key obfuscation utilities
│   ├── fileParser.ts         # Unified file parser
│   ├── parsePdf.ts           # PDF text extraction
│   ├── parseDocx.ts          # DOCX text extraction
│   ├── parseText.ts          # Plain text extraction
│   ├── prompt.ts             # LLM prompt templates
│   ├── downloadUtils.ts      # Export utilities
│   └── tokenCounter.ts      # Token estimation
├── types/
│   └── TestCase.ts           # TypeScript interfaces
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
- **Client-side API calls** - Direct browser-to-LLM communication (keys never sent to backend)
- **Native fetch API** - Direct calls to OpenAI, Gemini, and Ollama APIs
- **@langchain/openai** - Server-side fallback (not used in client-side mode)
- **@langchain/ollama** - Server-side fallback (not used in client-side mode)

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
   - **OpenAI**: Enter API key and model name (🔒 client-side, 100% secure)
   - **Google Gemini**: Enter API key and model name (🔒 client-side, 100% secure)
   - **Ollama**: Enter model name and base URL (🔒 client-side, 100% secure)
   - **Azure OpenAI**: ⚠️ Requires server-side calls (not recommended for security)

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

### CORS Errors (Client-Side Calls)

**Problem**: "CORS policy blocked" or "Network error"

**Solutions**:
1. **OpenAI/Gemini**: Should work out of the box (CORS enabled by default)
2. **Ollama**: Enable CORS in Ollama:
   ```bash
   # Set environment variable before starting Ollama
   export OLLAMA_ORIGINS="http://localhost:3000,https://your-domain.com"
   ollama serve
   ```
3. **Browser Extensions**: Disable CORS-blocking extensions temporarily
4. **Check Console**: Open browser DevTools → Console for detailed error messages

### Session Storage Issues

**Problem**: Test cases disappear after refresh

**Solutions**:
1. Ensure you're not in incognito/private mode
2. Check browser storage isn't full
3. Don't close the browser tab (sessionStorage clears on tab close)

**Note**: API keys are stored in React Context (memory only) and are automatically cleared on page refresh. This is by design for maximum security. You'll need to re-enter your API key if you refresh the page.

## 🔒 Security & Privacy

### 🛡️ Client-Side LLM Architecture (100% Secure)

This application uses **client-side LLM calls** - the industry standard for trust and security, used by:
- **Continue.dev** - Developer AI assistant
- **LangFlow** - LLM workflow builder
- **Flowise** - LLM orchestration tool
- **AnythingLLM** - Document Q&A system
- **MyAskAI** - AI knowledge base

#### How It Works

**✅ Your API keys NEVER leave your browser:**
- Keys are stored in **React Context** (in-memory only, not persisted)
- LLM API calls are made **directly from your browser** to the provider
- Our backend (Vercel) **NEVER sees your API keys**
- Keys are **NEVER sent to our servers**
- Keys are **NEVER logged** (we can't log what we don't see)
- Keys are **NEVER stored in any database**

**✅ What our backend does:**
- **Only** handles file extraction (PDF, DOCX parsing - requires server-side libraries)
- **Never** touches your API keys
- **Never** makes LLM calls on your behalf

**✅ Security Guarantees:**
- 🔒 **Zero-trust architecture** - We don't need to trust our servers
- 🔒 **100% client-side** - Keys only exist in your browser
- 🔒 **HTTPS encryption** - All API calls encrypted in transit
- 🔒 **No server-side logging** - Impossible to log what we don't receive
- 🔒 **No third-party access** - Keys only go to the LLM provider you choose

#### API Key Storage

- **Location**: React Context (in-memory only, **NOT** persisted to browser storage)
- **Persistence**: **Cleared on page refresh** - maximum security
- **Scope**: Only accessible within the React app during the session
- **Removal**: Automatically cleared on page refresh or browser tab close
- **Security**: Keys exist only in JavaScript memory, never written to disk

#### Supported Providers

| Provider | Client-Side Support | Notes |
|----------|-------------------|-------|
| **OpenAI** | ✅ Yes | Direct browser calls to `api.openai.com` |
| **Google Gemini** | ✅ Yes | Direct browser calls to `generativelanguage.googleapis.com` |
| **Ollama** | ✅ Yes | Direct browser calls to your local Ollama instance |
| **Azure OpenAI** | ❌ No | CORS restrictions require server-side calls |

**Note**: Azure OpenAI is not supported in client-side mode due to CORS restrictions. Use OpenAI or Gemini instead, or self-host the application.

#### Data Privacy

**✅ What we DON'T store:**
- ❌ API keys (never sent to our servers, only in React Context memory)
- ❌ PRD documents (only processed client-side)
- ❌ Generated test cases (stored only in your browser's sessionStorage)
- ❌ Usage analytics or tracking data

**✅ What IS stored (locally in your browser):**
- Test cases in `sessionStorage` (cleared when tab closes)
- PRD summary in `sessionStorage` (temporary)
- **API keys in React Context** (in-memory only, cleared on page refresh - NOT persisted)

**✅ Where your data goes:**
- **PRD content**: Only sent to the LLM provider you choose (OpenAI, Gemini, or Ollama)
- **API keys**: Only sent to the LLM provider's API (never to our servers)
- **Test cases**: Never leave your browser

#### Security Best Practices

1. **Monitor Usage**: Regularly check your LLM provider's usage dashboard
2. **Rotate Keys**: Periodically rotate your API keys
3. **Use Rate Limits**: Set rate limits on your API keys if supported
4. **Review Permissions**: Ensure API keys have minimal required permissions
5. **Refresh Page**: API keys are automatically cleared on page refresh (by design)

#### Self-Hosting Option

For maximum control and security, you can self-host this application:
- Deploy on your own infrastructure
- Full control over all code execution
- No reliance on third-party hosting
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for details

#### Compliance & Trust

- ✅ **GDPR Compliant**: No personal data stored on servers
- ✅ **SOC 2 Ready**: Zero server-side data handling
- ✅ **Enterprise Ready**: Self-hostable for air-gapped environments
- ✅ **Open Source**: Full code transparency

## 🚧 Known Limitations

- **Session storage**: Test cases lost when browser tab closes
- **API keys**: Cleared on page refresh (stored only in React Context memory)
- **File size**: Large PDFs (>10MB) may take longer to process
- **Token limits**: Very long PRDs may need to be split
- **Ollama performance**: Depends on your machine's RAM and CPU
- **Azure OpenAI**: Not supported in client-side mode (CORS restrictions) - use OpenAI or Gemini instead
- **Browser compatibility**: Requires modern browser with fetch API support
- **CORS**: Some corporate networks may block direct API calls (use Ollama locally or self-host)

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
