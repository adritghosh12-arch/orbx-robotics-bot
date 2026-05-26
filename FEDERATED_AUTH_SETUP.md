# 🔐 Federated Authentication Setup Guide

## Overview

Orbx AI now supports federated login with Google and GitHub OAuth providers, while maintaining backward compatibility with the existing JWT system. This implementation includes automatic data retention management to stay within free database limits.

## ✅ Implementation Status

### **Phase 1: Database Enhancement and OAuth Infrastructure** ✅
- [x] Enhanced database connection layer (`lib/db-enhanced.js`)
- [x] Database migration script (`scripts/migrate-oauth.js`)
- [x] Data retention management system (`lib/data-retention.js`)

### **Phase 2: NextAuth.js Integration** ✅
- [x] OAuth provider configuration (`lib/auth.config.js`)
- [x] NextAuth API routes (`pages/api/auth/[...nextauth].js`)
- [x] Enhanced authentication middleware

### **Phase 3: Frontend Enhancement** ✅
- [x] Modern sign-in interface (`pages/auth/signin.js`)
- [x] SessionProvider integration in `_app.js`
- [x] Updated chat interface with dual auth support

### **Phase 4: Migration and Data Management** ✅
- [x] Dual authentication support (OAuth + JWT)
- [x] Account linking for same email addresses
- [x] Automated data purging system
- [x] Admin API for retention management

## 🚀 Quick Start

### 1. Install Dependencies

Dependencies are already added to `package.json`:
```json
{
  "next-auth": "^5.0.0-beta.4",
  "@auth/pg-adapter": "^1.4.0",
  "@auth/core": "^0.34.0"
}
```

Run: `npm install`

### 2. Database Setup

#### Option A: Use Existing Database (Local PostgreSQL)
```bash
# Run the migration script
node scripts/migrate-oauth.js
```

#### Option B: Upgrade to Neon PostgreSQL (Recommended)
1. Create free account at [neon.tech](https://neon.tech)
2. Create new database project
3. Get connection string
4. Update `DATABASE_URL` in environment

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Enhanced Database (Required)
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_MAX_CONNECTIONS=20

# NextAuth.js (Required)
NEXTAUTH_SECRET=your-secure-32-char-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (Optional but Recommended)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (Optional but Recommended) 
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Data Retention (Optional)
ENABLE_AUTO_PURGE=true
DB_SIZE_LIMIT_GB=2.8
PURGE_CHECK_INTERVAL=86400000

# Existing Configuration (Keep)
GROQ_API_KEY=your-groq-api-key
JWT_SECRET=your-existing-jwt-secret
```

## 🔧 OAuth Provider Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new project or select existing
3. Enable "Google+ API"
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized origins: `http://localhost:3000` (dev), `https://yourdomain.com` (prod)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`

### GitHub OAuth Setup
1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
2. Create new OAuth App:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and generate Client Secret
4. Add to `.env`

## 🧪 Testing

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Authentication Flow
1. Go to `http://localhost:3000/auth/signin`
2. Try OAuth providers (Google/GitHub)
3. Test fallback email/password authentication
4. Verify chat functionality with user sessions

### 3. Test Data Retention (Optional)
```bash
# Manual retention check
curl -X POST http://localhost:3000/api/admin/retention \
  -H "Content-Type: application/json" \
  -d '{"action": "check"}'
```

## 📊 Features

### 🔐 Dual Authentication System
- **OAuth Providers**: Google & GitHub (free tiers)
- **Legacy Support**: Existing JWT token system
- **Account Linking**: Automatic linking for same email addresses
- **Secure Sessions**: Database-stored sessions with NextAuth.js

### 🗄️ Intelligent Data Management
- **Auto-Purging**: Triggers at 90% database capacity (2.7GB of 3GB)
- **Retention Policies**: 90 days (chat), 180 days (forum), 30 days (sessions)
- **Non-Blocking**: Operations don't disrupt user experience
- **Monitoring**: Real-time database size tracking

### 🎨 Enhanced User Experience
- **Modern UI**: Animated sign-in interface with provider buttons
- **Seamless Migration**: Users can continue with existing credentials
- **Visual Indicators**: OAuth vs Legacy authentication badges
- **Mobile Responsive**: Works perfectly on all devices

## 🔍 Monitoring & Admin

### Database Health Check
```javascript
// Get comprehensive database status
const health = await getDatabaseHealth();
console.log(health);
```

### Manual Data Purge
```javascript
// Execute immediate purge (admin use)
const result = await executePurgeNow(urgent: true);
```

### Connection Statistics
```javascript
// Monitor connection pool usage
const stats = await getConnectionStats();
console.log(stats);
```

## 🚨 Troubleshooting

### OAuth Issues
- **"Invalid redirect_uri"**: Check OAuth app configuration URLs
- **"Client ID not found"**: Verify environment variables are loaded
- **Session not found**: Check `NEXTAUTH_SECRET` and database connection

### Database Issues
- **Migration fails**: Ensure DATABASE_URL is correct and accessible
- **Connection timeouts**: Increase `DATABASE_MAX_CONNECTIONS` if needed
- **Purge not working**: Check `ENABLE_AUTO_PURGE=true` in environment

### General Issues
- **Module warnings**: Package.json includes `"type": "module"` for ES modules
- **Build failures**: Run `npm install` after pulling latest changes
- **Style issues**: CSS modules are properly configured and namespaced

## 🎯 Production Deployment

### Vercel Deployment
1. Add all environment variables in Vercel dashboard
2. Ensure `NEXTAUTH_URL` matches your domain
3. Update OAuth redirect URIs to production URLs
4. Set `NODE_ENV=production`

### Database Migration
```bash
# Production migration (run once)
node scripts/migrate-oauth.js
```

### Monitoring Setup
- Enable auto-purging: `ENABLE_AUTO_PURGE=true`
- Set conservative limits: `DB_SIZE_LIMIT_GB=2.8`
- Monitor retention API: `/api/admin/retention`

## 💡 Key Benefits

### ✨ **Zero Cost Implementation**
- Neon PostgreSQL: Free 3GB tier
- Google OAuth: Unlimited requests, no approval required
- GitHub OAuth: 5,000 requests/hour free tier
- NextAuth.js: Open source, no licensing fees

### 🔒 **Enterprise-Grade Security**
- PKCE flow for OAuth security
- Database-stored sessions (not JWT in localStorage)
- Automatic token refresh and rotation
- Account linking prevents duplicate users

### 📈 **Scalable Architecture**
- Connection pooling handles concurrent users
- Automatic database cleanup prevents size issues
- Backward compatibility ensures smooth migration
- Modular design allows easy provider additions

### 🎓 **Perfect for FTC Community**
- Google OAuth works with school accounts
- GitHub OAuth ideal for technical teams
- Chat history tracking for learning progress
- Forum integration ready for team discussions

---

## 🤝 Support

For issues or questions about federated authentication:
1. Check this guide first
2. Review console logs for specific errors
3. Test with simple OAuth flow (Google recommended)
4. Ensure database migration completed successfully

**The system is designed to gracefully handle failures and maintain functionality even when components are offline.**