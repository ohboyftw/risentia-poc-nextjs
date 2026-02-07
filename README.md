# Risentia Trial Matching Frontend

Next.js frontend for the Risentia Clinical Trial Matching platform.

## Tech Stack

- **Framework**: Next.js 15.1.2 with React 19
- **Language**: TypeScript 5.7
- **State**: Zustand 5.0
- **Styling**: Tailwind CSS 3.4
- **LangGraph**: @langchain/langgraph + @langchain/langgraph-sdk

## Features

- Real-time clinical trial matching with SSE streaming
- LangGraph-powered multi-model orchestration
- Patient profile extraction from natural language
- Cost tracking and pipeline visualization

## Modes

1. **Mock Mode** - Client-side LangGraph execution with mock data (for testing/demo)
2. **FastAPI Mode** - Connects directly to Risentia FastAPI backend on Azure Container Apps

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
LANGGRAPH_API_URL=http://localhost:8000
```

## Deployment

This project is deployed on Vercel as a subdomain of [risentia.com](https://www.risentia.com/).

## License

Proprietary - Risentia NV
