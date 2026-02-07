# Risentia Trial Matching Frontend

Next.js frontend for the Risentia Clinical Trial Matching platform.

## Tech Stack

- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript 5.7
- **State**: Zustand 5.0
- **Styling**: Tailwind CSS 3.4
- **AI**: @langchain/anthropic (Claude), @langchain/langgraph
- **UI**: shadcn/ui, Framer Motion

## Features

- Real-time clinical trial matching with SSE streaming
- LangGraph-powered multi-model orchestration
- Patient profile extraction from natural language (Claude Haiku + regex fallback)
- Qwen Flash chat assistant for conversational guidance
- Cost tracking and pipeline visualization
- 4-step progress indicator (Retrieve > Pre-filter > Assess Eligibility > Rank & Report)

## Modes

1. **Mock Mode** (`local`) - Client-side LangGraph with mock data (demo/testing)
2. **FastAPI Mode** (`fastapi`) - Connects to Risentia FastAPI backend on Azure Container Apps (production)

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for patient extraction and local mode |
| `DASHSCOPE_API_KEY` | Yes (FastAPI mode) | DashScope key for Qwen chat assistant |
| `FASTAPI_URL` | Yes (FastAPI mode) | Backend URL (default: Azure Container Apps) |
| `FASTAPI_API_KEY` | No | API key for backend auth |
| `LANGGRAPH_API_URL` | No | LangGraph Cloud URL (remote mode) |
| `LANGGRAPH_API_KEY` | No | LangGraph Cloud API key |

## Deployment (Vercel)

```bash
# Link project (first time)
vercel link

# Set environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add DASHSCOPE_API_KEY
vercel env add FASTAPI_URL

# Deploy
vercel --prod
```

## Architecture

```
User Message
    |
    v
/api/chat (route.ts)
    |
    ├── Patient Extraction (Claude Haiku → structured output)
    │   └── Fallback: regex parser (graph.ts)
    |
    ├── [no match trigger] → Qwen Flash chat (qwen-client.ts)
    |
    └── [match trigger] → FastAPI SSE stream
            └── Retrieve → Pre-filter → Assess → Rank
```

## License

Proprietary - Risentia NV
