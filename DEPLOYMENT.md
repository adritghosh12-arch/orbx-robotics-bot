# Orbx AI - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Database Setup (Render)](#database-setup-render)
4. [Groq API Setup](#groq-api-setup)
5. [Deploy to Netlify](#deploy-to-netlify)
6. [Post-Deployment](#post-deployment)

---

## Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- GitHub account ([Create](https://github.com/signup))
- PostgreSQL installed locally (optional; we'll use Render)

---

## Local Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/orbx-ai.git
cd orbx-ai

# Install dependencies
npm install
```

### 2. Create Environment Variables

Create `.env.local` in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Database (start with local PostgreSQL; upgrade to Render later)
DATABASE_URL=postgresql://localhost:5432/orbx_ai_local

# JWT
JWT_SECRET=your-super-secret-key-generate-something-random

# Groq API (get from step 4)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=mixtral-8x7b-32768

# Application
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Setup Local Database (Optional)

If you have PostgreSQL installed locally:

```bash
# Create database
createdb orbx_ai_local

# Run migrations
npm run db:setup
npm run db:migrate
```

Or skip this and go straight to Render (easier!).

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and test the app locally.

---

## Database Setup (Render)

### 1. Sign Up for Render

1. Go to [render.com](https://render.com/)
2. Click "Sign Up"
3. Use GitHub (recommended for easier deployment)

### 2. Create PostgreSQL Database

1. Dashboard → New + → PostgreSQL
2. Configure:
   - **Name**: `orbx-ai-db`
   - **Database**: `orbx_ai`
   - **User**: `orbx_user`
   - Leave password auto-generated
3. Click "Create Database"
4. Wait 2-3 mintest for provisioning

### 3. Get Connection String

Once created:
1. Click the database
2. Copy **Internal Database URL** (looks like: `postgresql://...`)
3. Save this for later deployment

### 4. Test Connection (Optional)

```bash
# In .env.local, update DATABASE_URL to your Render URL
# Then test:
npm run db:setup
```

---

## Groq API Setup

### 1. Sign Up for Groq

1. Go to [console.groq.com](https://console.groq.com)
2. Click "Sign Up"
3. Choose your plan (free tier included)
4. Create account

### 2. Create API Key

1. Dashboard → API Keys
2. Click "Create New Key"
3. Name it `orbx-ai`
4. Copy the key
5. Paste into `.env.local` as `GROQ_API_KEY`

### 3. Test the Key

```bash
# In development, the chatbot will test this automatically
# If errors appear, double-check the key
npm run dev
# Visit http://localhost:3000/chat and ask a question
```

---

## Deploy to Netlify

### 1. Push to GitHub

```bash
# Initialize Git (if not already)
git init
git add .
git commit -m "Initial commit: Orbx AI v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/orbx-ai.git
git push -u origin main
```

### 2. Connect Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click "Sign Up" → "Sign in with GitHub"
3. Authorize GitHub access
4. Click "Add new site" → "Import an existing project"
5. Select your `orbx-ai` repository
6. Configure build:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18 (or higher)

### 3. Add Environment Variables

Before deploying, add secrets:

1. Site → Settings → Build & deploy → Environment
2. Click "Edit variables"
3. Add each from `.env.local`:
   - `DATABASE_URL` (from Render)
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `NEXT_PUBLIC_API_URL` (your-netlify-url.netlify.app)

### 4. Deploy

Click "Deploy". Netlify will:
1. Clone your repo
2. Run `npm install`
3. Run `npm run build`
4. Deploy to CDN

**Deployment typically takes 2-5 minutes.**

### 5. First Deploy Checklist

- ✅ Build succeeds (check Netlify logs)
- ✅ Site is live (visit your URL)
- ✅ Chatbot works (ask FTC question)
- ✅ Database connected (check chat history if logged in)

---

## Post-Deployment

### 1. Setup Domain (Optional)

1. Site → Settings → Domain management
2. Add custom domain or use Netlify subdomain

### 2. Enable HTTPS

Already enabled automatically! ✅

### 3. Setup Database Backups

For production (Recommended):

**Render Postgres Upgrades:**
- Free: 30-day retention
- Basic ($6/mo): Unlimited retention + daily backups
- Standard ($25/mo): More power + 15GB

To upgrade:
1. Render Dashboard → Your Database → "Upgrade Plan"
2. Click Basic ($6/mo)
3. Confirm

### 4. Monitor the App

**Netlify Analytics:**
1. Site → Analytics
2. Monitor usage, errors, build times

**Render Database:**
1. Dashboard → Database → Stats
2. Monitor connection count, queries

### 5. Update Knowledge Base

To add new FTC documentation:

1. Edit `/lib/rag-chain.js`
2. Add to `initFTCKnowledge()` function
3. Push to GitHub (auto-deploys to Netlify)

---

## Environment Variables Summary

| Variable | When | Value |
|----------|------|-------|
| `DATABASE_URL` | Local | `postgresql://localhost:5432/orbx_ai_local` |
| `DATABASE_URL` | Production | Render URL (internal) |
| `GROQ_API_KEY` | All | From console.groq.com |
| `JWT_SECRET` | All | Random string (no spaces) |
| `NEXT_PUBLIC_API_URL` | Local | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Production | `https://your-site.netlify.app` |

---

## Troubleshooting

### Problem: Build fails with "GROQ_API_KEY not found"
**Solution**: Ensure env var is set in Netlify settings (not just local `.env.local`)

### Problem: Database connection times out
**Solution**: 
1. Verify DATABASE_URL in Netlify settings
2. Check Render database is running
3. Ensure firewall allows connections

### Problem: Chatbot returns errors
**Solution**:
1. Check Groq API key is valid
2. Check Netlify function logs
3. Test locally first with `npm run dev`

### Problem: Chat history not saving
**Solution**:
1. Ensure user is logged in (required for history)
2. Check database tables created: `npm run db:setup`
3. Look for errors in Netlify function logs

---

## Free Tier Limits & Upgrades

| Service | Free | Upgrade |
|---------|------|---------|
| **Netlify** | 1M functions/mo | Auto-scales |
| **Render DB** | 30 days retention | $6/mo Basic-256MB |
| **Groq API** | 1000+ requests/mo | Higher tiers available |

---

## Next Steps

1. ✅ Deploy to Netlify (you are here!)
2. 📢 Share with FTC teams at your school/region
3. 📚 Keep knowledge base updated with latest rules
4. 🔄 Gather feedback and improve guardrails
5. 🚀 Scale to more users (all free tier until 1000s)

---

## Support & Resources

- **Netlify Docs**: https://docs.netlify.com/
- **Render Docs**: https://render.com/docs/
- **Groq API Docs**: https://console.groq.com/docs/
- **Next.js Docs**: https://nextjs.org/docs/

---

**Congratulations! Your Orbx AI deployment is live! 🎉**
