# Orbx AI - FTC Chatbot Portal
FTC (FIRST Tech Challenge) AI-powered chatbot with guardrails, user authentication, chat history, forum, and admin dashboard.

## Free Tech Stack
- **Frontend**: Next.js 14 + React + Tailwind CSS (Netlify)
- **Backend**: Node.js API Routes / Netlify Functions
- **Database**: PostgreSQL (Render free tier)
- **LLM**: Groq API (free tier)
- **RAG**: LangChain.js + FAISS vectors

## Features
- 🤖 FTC-specific chatbot with guardrails
- 💬 Real-time chat with history
- 👥 User authentication & profiles
- 🏛️ Discussion forum
- 📚 Knowledge base management (admin)
- 📱 Responsive design with animations
- ⚡ Zero cost deployment (free tier)

## Prerequisites
- Node.js 16+
- PostgreSQL (or Render free tier)
- Groq API key (free from console.groq.com)

## Setup

### 1. Environment Variables
Create `.env.local`:
```
DATABASE_URL=postgresql://user:password@host:port/orbx_ai
JWT_SECRET=your-secret-key-here
GROQ_API_KEY=your-groq-api-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
npm run db:setup
npm run db:migrate
```

### 4. Development
```bash
npm run dev
```

### 5. Deploy to Netlify
```bash
npm run build
# Push to GitHub, connect to Netlify for auto-deploy
```

## Project Structure
```
orbx-ai/
├── pages/
│   ├── index.js                 # Home page
│   ├── chat.js                  # Chatbot page
│   ├── forum/
│   │   ├── index.js            # Forum listing
│   │   └── [id].js             # Thread detail
│   ├── about.js                # About FTC
│   ├── dashboard.js            # User dashboard
│   ├── admin/
│   │   ├── kb.js               # Knowledge base management
│   │   └── dashboard.js        # Admin dashboard
│   └── api/
│       ├── chat.js             # Chatbot API
│       ├── auth/
│       │   ├── register.js
│       │   ├── login.js
│       │   └── logout.js
│       ├── history.js          # Chat history
│       ├── forum.js            # Forum CRUD
│       └── admin/
│           └── kb.js           # KB management
├── components/
│   ├── ChatInterface.js        # Chat UI
│   ├── Navbar.js
│   ├── Footer.js
│   └── ...
├── lib/
│   ├── db.js                   # Database pool
│   ├── rag-chain.js            # LangChain RAG setup
│   ├── auth.js                 # JWT utilities
│   ├── guardrails.js           # FTC content validation
│   └── ftc-knowledge.js        # FTC knowledge base
├── public/
│   └── ftc-docs/               # FTC documentation PDFs
├── scripts/
│   ├── setupDb.js              # Create tables
│   ├── migrate.js              # Run migrations
│   └── seedKnowledge.js        # Seed FTC knowledge
└── .env.local                  # Environment variables
```

## Free Tier Limits & Upgrades

| Service | Free Tier | Upgrade Cost |
|---------|-----------|--------------|
| Netlify | 1M functions/mo | Included |
| Render Postgres | 30 days | $6/mo (unlimited) |
| Groq API | 1000+ requests/mo | Higher tier available |

## FAQ

**Q: No credit card?**
A: All services accept free tier without credit card (except Render DB after 30 days).

**Q: How many users can it handle?**
A: ~30k chat messages/month on free tier; scales to millions with paid upgrades.

**Q: Can I use local LLM?**
A: Yes, replace Groq with Ollama (see `lib/rag-chain.js` for comments).

## Support
For FTC questions answered: use the chatbot! 🤖
For deployment help: see deployment guides in `/docs`

---
**Built with ❤️ for the FTC community**
