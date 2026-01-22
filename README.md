# Watch The Build
[![I Built Music You Can Talk To](https://img.youtube.com/vi/0IWimCfEn6s/0.jpg)](https://youtu.be/0IWimCfEn6s)
> 🎥 I Built Music You Can Talk To

# Toaster - AI-Powered Strudel Music App

An interactive web application that combines AI language models with Strudel (a live coding music platform) to enable users to generate music through natural language prompts.

## Project Overview

Toaster allows users to describe the music they want in plain English, and AI generates Strudel code that immediately transforms into playable audio compositions.

## Repository Structure

This monorepo contains:
- `/ui` - Frontend React application
- `/server` - Backend Cloudflare Workers API
- `/docs` - Project documentation

## Quick Start

### Prerequisites

- Node.js 18 or higher
- pnpm package manager (`npm install -g pnpm`)
- Cloudflare account (for deploying the API)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd toaster
```

2. **Set up the frontend**
```bash
cd ui
pnpm install
```

3. **Set up the backend**
```bash
cd ../server
pnpm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your configuration
```

### Running Locally

1. **Start the backend API** (in one terminal):
```bash
cd server
pnpm dev
```
This starts the API at `http://localhost:8787`

2. **Start the frontend** (in another terminal):
```bash
cd ui
pnpm dev
```
This starts the UI at `http://localhost:5173`

3. Open `http://localhost:5173` in your browser

## Configuration

### Frontend Environment Variables

(Optional) Create `ui/.env` with:
```
VITE_API_URL=http://localhost:8787
```

If not specified, the API URL defaults to `http://localhost:8787`.

### Backend Environment Variables

Create `server/.dev.vars` with your API keys for LLM providers when ready to integrate.

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS + ShadCN UI
- Strudel (music synthesis)

**Backend:**
- Cloudflare Workers
- Hono API framework
- TypeScript

## Development

- Use `pnpm` for all package management
- The frontend runs on port 5173 (Vite default)
- The backend runs on port 8787 (Wrangler default)
- Functional programming style preferred
- No classes/OOP

## Deployment

### Frontend
Build and deploy the frontend to your preferred hosting service:
```bash
cd ui
pnpm build
# Deploy the dist/ folder
```

### Backend
Deploy to Cloudflare Workers:
```bash
cd server
pnpm deploy
```

## Contributing

See individual README files in `/ui` and `/server` for more detailed information about each part of the application.

## Documentation

Additional documentation can be found in the `/docs` folder:
- `PRODUCT_BRIEF.md` - Product overview and requirements

