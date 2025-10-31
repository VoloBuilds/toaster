# Toaster API

Backend API for the Toaster AI-powered Strudel music application, built with Cloudflare Workers and Hono.

## Tech Stack

- Cloudflare Workers (serverless)
- Hono (lightweight web framework)
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Cloudflare account (for deployment)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.dev.vars` file based on `.dev.vars.example`:
```bash
cp .dev.vars.example .dev.vars
```

3. Fill in your environment variables in `.dev.vars`

### Development

Run the development server:
```bash
pnpm dev
```

The API will be available at `http://localhost:8787`

### Deployment

Deploy to Cloudflare Workers:
```bash
pnpm deploy
```

View logs:
```bash
pnpm tail
```

## API Endpoints

### Health Check
```
GET /
```
Returns API status and version.

### Generate Music
```
POST /api/generate
Content-Type: application/json

{
  "prompt": "Create a funky bassline with jazz chords"
}
```

Returns generated Strudel code based on the prompt.

## Project Structure

```
src/
├── routes/          # API route handlers
│   └── generate.ts  # Music generation endpoint
└── index.ts         # Main application entry point
```

## Configuration

Edit `wrangler.toml` to configure:
- Worker name
- Environment variables
- KV namespaces
- D1 databases
- AI bindings

## Integrating LLM Providers

The API is configured to use OpenRouter, which provides access to multiple LLM providers through a unified API.

### OpenRouter Setup

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Add your API key to `.dev.vars` (local) or Cloudflare secrets (production)
4. Choose a model (defaults to `anthropic/claude-3.5-sonnet`)

Available models include:
- `anthropic/claude-3.5-sonnet` (recommended for creative tasks)
- `openai/gpt-4-turbo`
- `meta-llama/llama-3.1-70b-instruct`
- And many more - see [OpenRouter models](https://openrouter.ai/models)

## Environment Variables

### Required
- `OPENROUTER_API_KEY` - Your OpenRouter API key

### Optional
- `OPENROUTER_MODEL` - Model to use (default: `anthropic/claude-3.5-sonnet`)
- `APP_URL` - Your app URL for OpenRouter credits (default: `https://toaster.app`)

See `.dev.vars.example` for the full template.

