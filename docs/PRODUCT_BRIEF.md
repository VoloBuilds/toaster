# Product Brief: AI-Powered Strudel Music App

## Project Overview

An interactive web application that combines AI language models with Strudel (a live coding music platform) to enable users to generate music through natural language prompts. Users describe the music they want, and the AI generates Strudel code that immediately transforms into playable audio compositions.

## Target Audience

- Music enthusiasts interested in generative music
- Creative professionals exploring AI-assisted composition
- Live coders and experimental musicians
- Educators teaching algorithmic music concepts
- Developers and tech-savvy users curious about AI + music

## Primary Benefits / Features

- **Natural Language Music Generation**: Describe music in plain English and get instant Strudel code
- **Real-time Playback**: Generated code immediately produces audio output via Strudel
- **Interactive Editing**: View and modify the AI-generated Strudel code
- **Accessible Music Creation**: No coding knowledge required to create algorithmic music
- **Experimentation Platform**: Iterate quickly on musical ideas with AI assistance

## High-Level Tech/Architecture

**Frontend**
- React (Vite) + TypeScript
- Tailwind CSS + ShadCN UI components
- Strudel integration for music synthesis and playback
- Firebase Authentication for user management
- Supabase (PostgreSQL) for data persistence

**Backend**
- Cloudflare Workers for AI API integration
- Hono API framework
- LLM API calls for Strudel code generation

**Package Management**
- pnpm for dependency management
- Node.js runtime

**Development Principles**
- Functional programming approach
- Component-based UI architecture
- Serverless API layer for scalability

