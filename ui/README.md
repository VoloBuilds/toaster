# Toaster UI

Frontend for the Toaster AI-powered Strudel music application.

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- ShadCN UI components
- React Router for navigation
- Strudel for music synthesis

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. (Optional) Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

The API URL defaults to `http://localhost:8787` if not specified.

### Development

Run the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
pnpm build
```

Preview the production build:
```bash
pnpm preview
```

## Project Structure

```
src/
├── components/       # UI components
│   └── ui/          # ShadCN UI components
├── lib/             # Utility functions and configurations
├── pages/           # Page components
├── App.tsx          # Main app component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Environment Variables

See `.env.example` for required environment variables.

## Adding ShadCN Components

To add new ShadCN components:
```bash
npx shadcn add [component-name]
```

