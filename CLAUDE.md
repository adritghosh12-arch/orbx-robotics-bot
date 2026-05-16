# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Orbx AI**, an FTC (FIRST Tech Challenge) chatbot portal built with Next.js. The application provides an AI-powered chatbot with FTC-specific knowledge, user authentication, chat history, forum discussions, and admin dashboard capabilities.

**Tech Stack:**
- Frontend: Next.js 14 + React + Tailwind CSS
- Backend: Node.js API Routes / Netlify Functions
- Database: PostgreSQL
- LLM: Groq API with guardrails
- RAG: LangChain.js with in-memory knowledge base

## Development Commands

### Setup & Installation
```bash
npm install                    # Install dependencies
npm run db:setup              # Create database tables
npm run db:migrate            # Run database migrations
```

### Development
```bash
npm run dev                   # Start development server (localhost:3000)
npm run build                 # Build for production
npm run start                 # Start production server
npm run lint                  # Run ESLint
```

### Database Management
```bash
node scripts/setupDb.js       # Initialize database schema
node scripts/migrate.js       # Run migrations manually
```

## Architecture

### Core Components

**RAG System (`lib/rag-chain.js`):**
- Uses LangChain with Groq LLM (Mixtral-8x7b-32768)
- In-memory knowledge base for MVP (easily extensible to vector DB)
- FTC-specific guardrails and content validation
- Simple keyword-based retrieval (can be upgraded to semantic search)

**Authentication (`lib/auth.js`):**
- JWT-based authentication with 30-day expiration
- Middleware for optional and required authentication
- Token extraction from Bearer headers

**Database (`lib/db.js`):**
- PostgreSQL connection pool
- Tables: users, chat_history, forum_threads, forum_replies, knowledge_base

**Guardrails (`lib/guardrails.js`):**
- FTC keyword validation to ensure on-topic responses
- Content filtering to prevent off-topic conversations
- Confidence scoring and response validation

### API Routes

**Chat API (`pages/api/chat.js`):**
- Handles FTC-specific questions via RAG chain
- Optional user authentication for history saving
- Comprehensive error handling with fallback responses

**Authentication APIs:**
- `/api/auth/register.js` - User registration with bcrypt password hashing
- `/api/auth/login.js` - JWT token generation
- `/api/auth/me.js` - User profile retrieval

**Forum APIs:**
- `/api/forum.js` - CRUD operations for forum threads
- `/api/forum/[id].js` - Thread-specific operations and replies

### Database Schema

**Users:** id, email, password_hash, timestamps
**Chat History:** user_id, question, answer, confidence, timestamp
**Forum Threads:** user_id, title, content, reply/view counts, timestamps  
**Forum Replies:** thread_id, user_id, content, timestamps
**Knowledge Base:** title, content, category, version, timestamps

## Key Development Guidelines

### FTC Content Guardrails
The system enforces strict FTC-only content through multiple layers:
1. **Question validation** - Checks for FTC-related keywords before processing
2. **Response validation** - Ensures answers contain FTC content
3. **Fallback responses** - Provides helpful redirects for off-topic questions

When modifying the knowledge base or RAG system, maintain these guardrails to keep the chatbot focused on FTC topics.

### Environment Variables
Required in `.env.local`:
```
DATABASE_URL=postgresql://user:password@host:port/orbx_ai
JWT_SECRET=your-secret-key-here
GROQ_API_KEY=your-groq-api-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Authentication Patterns
- Use `middleware()` for optional auth (adds req.user if token present)
- Use `requireAuth()` for protected routes (returns 401 if no valid token)
- Chat API works with or without authentication (saves history when logged in)

### Database Migrations
New migrations should be added to `scripts/migrate.js`. The setup script creates the initial schema, while migrations handle incremental changes.

### RAG System Extension
The current in-memory knowledge base can be extended to use vector databases:
1. Replace `initFTCKnowledge()` with vector store initialization
2. Update `retrieveKnowledge()` to use semantic search
3. Modify `addDocument()` to persist to vector DB

The LangChain architecture is designed to support this transition with minimal changes to the API interface.

## Deployment

**Target Platform:** Vercel (optimized configuration)
**Database:** PostgreSQL (Render, Vercel Postgres, or similar)
**Build Command:** `npm run build`

### Vercel Deployment Setup

1. **Environment Variables Required:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Minimum 32 characters for security
   - `GROQ_API_KEY` - Groq API key for LLM functionality
   - `GROQ_MODEL` - Optional, defaults to mixtral-8x7b-32768
   - `NEXT_PUBLIC_API_URL` - Your deployed domain URL

2. **Key Fixes Applied for Vercel:**
   - Database connection pool lazy initialization (prevents build-time connections)
   - Client-side database query protection
   - Webpack externals for pg/pg-native packages
   - Standalone output configuration
   - Environment variable fallbacks for missing API keys

3. **Build Optimizations:**
   - Node.js 18.x specified in package.json engines
   - Fixed jsonwebtoken version to avoid compatibility issues
   - Proper CSS module imports
   - Error boundaries for missing environment variables

The application is optimized for Vercel deployment with automatic scaling and edge functions.