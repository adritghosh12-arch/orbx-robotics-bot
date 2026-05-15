# Orbx AI - Quick Start Guide

**Get up and running in 10 minutes!**

---

## Step 1: Prerequisites (2 min)

Make sure you have:
- ✅ Node.js 16+ ([Download](https://nodejs.org/))
- ✅ Git ([Download](https://git-scm.com/))
- ✅ GitHub account (free at [github.com](https://github.com/signup))

Verify installation:
```bash
node --version  # Should be v16 or higher
git --version   # Should show version
```

---

## Step 2: Get Groq API Key (2 min)

1. Open [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card needed)
3. Go to **API Keys** section
4. Click **Create New Key**
5. Name it `orbx-ai`
6. **Copy the key** and save it (you'll need it later)

✅ **Done!** You now have a free LLM key.

---

## Step 3: Clone and Setup (3 min)

```bash
# Clone the project
git clone https://github.com/YOUR_USERNAME/orbx-ai.git
cd orbx-ai

# Install dependencies
npm install

# Copy the environment file
cp .env.local.example .env.local
```

Now edit `.env.local`:
```bash
# Open .env.local in your editor and update:

# For local testing (skip database for now)
DATABASE_URL=postgresql://dev:dev@postgres:5432/orbx_ai_dev

# Paste your Groq API key here
GROQ_API_KEY=paste-your-key-here

# Generate a random JWT secret (any random string)
JWT_SECRET=my-super-secret-key-12345

# Leave these as-is for local development
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

✅ **Done!** Project is configured.

---

## Step 4: Run Local Server (2 min)

```bash
npm run dev
```

You'll see:
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Open in browser:** http://localhost:3000

✅ **You're running locally!**

---

## Step 5: Test the Chatbot (1 min)

1. Click **"Chat"** button
2. Ask: "What is FTC?"
3. Watch the AI respond!

Example questions to try:
- "How do I join FTC?"
- "What are robot weight limits?"
- "What's scouting in FTC?"
- "Tell me about the current season"

**Guardrails in action:** Try asking "What's the weather?" - it will decline and redirect to FTC topics!

✅ **Chatbot is working!**

---

## Step 6: Add Auth (Optional - Skip for Testing)

To test user accounts and chat history:

1. Click **"Dashboard"** (it redirects to login)
2. Click **"Register"**
3. Create account (any email works locally)
4. After login, your chat history saves automatically!

Note: Chat history requires a database. For production, we'll use Render DB (see DEPLOYMENT.md).

---

## Step 7: Deploy to Netlify (When Ready)

When you're ready to go live (see full [DEPLOYMENT.md](./DEPLOYMENT.md)):

1. Push to GitHub:
```bash
git add .
git commit -m "Ready to deploy"
git push origin main
```

2. Visit [netlify.com](https://netlify.com)
3. Connect your GitHub repo
4. Add environment variables (Groq key, JWT secret, etc.)
5. Click "Deploy"

**That's it!** Your app is live and free forever.

---

## What's Working Now

✅ Chatbot with FTC guardrails
✅ Smart responses with sources
✅ User authentication (local)
✅ Beautiful UI with animations
✅ Mobile responsive

Coming soon / Optional upgrades:

- 📚 Knowledge base admin dashboard
- 💾 Persistent database backend (requires Render)
- 🧵 Forum full functionality
- 🌍 Multi-language support

---

## Useful Commands

```bash
# Development
npm run dev           # Start local server

# Production
npm run build         # Build for production
npm start             # Run production build

# Database (when using PostgreSQL)
npm run db:setup      # Create tables
npm run db:migrate    # Run migrations

# Linting
npm run lint          # Check for errors
```

---

## Project Structure

```
orbx-ai/
├── pages/             # Next.js pages (frontend)
│   ├── index.js      # Home page
│   ├── chat.js       # Chatbot page
│   ├── forum/        # Forum pages
│   └── api/          # Backend API endpoints
├── lib/              # Core logic
│   ├── rag-chain.js  # Chatbot AI (Groq + RAG)
│   ├── guardrails.js # FTC content validation
│   ├── auth.js       # User authentication
│   └── db.js         # Database connection
├── styles/           # CSS modules
└── public/           # Static files
```

---

## Troubleshooting

**Q: "Module not found" error?**
A: Run `npm install` again

**Q: Chatbot not responding?**
A: Check your GROQ_API_KEY in `.env.local`

**Q: "Cannot find env variable"?**
A: Make sure `.env.local` exists (not `.env`)

**Q: Port 3000 already in use?**
A: Run `npm run dev -- -p 3001` to use port 3001

---

## Next Steps

1. ✅ **You are here:** Running locally
2. 📚 **Add more FTC knowledge:** Edit `/lib/rag-chain.js` with new docs
3. 🎨 **Customize design:** Edit `/styles/*.css`
4. 🚀 **Deploy to Netlify:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
5. 📢 **Share with FTC community:** Spread the word!

---

## Free Forever Guarantee

This entire stack is **100% free**:
- ✅ Netlify hosting (free tier)
- ✅ Groq LLM API (free tier)
- ✅ Next.js & React (open source)
- ✅ No credit card required

Upgrade costs only if you scale beyond free tier limits (~1000+ monthly users).

---

## Questions?

- **FTC Questions?** Ask the chatbot! 🤖
- **Tech Help?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed docs
- **Stuck?** Check the [README.md](./README.md)

---

## Support the Project

If you find Orbx AI helpful:
- 🌟 Star us on GitHub
- 📢 Share with your FTC team
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest improvements

---

**Happy chatting! 🚀**

Built with ❤️ for the FTC community
