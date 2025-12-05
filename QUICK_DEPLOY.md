# ⚡ Quick Deploy Guide - Supabase

> **👉 For detailed instructions, see [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md)**

## Quick Steps to Deploy

### 1. Setup Supabase (5 minutes)

```bash
# 1. Create project at https://supabase.com
# 2. Get your credentials from Settings → API
# 3. Add to .env file:

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Build Web App (2 minutes)

```bash
npm run build:web
```

This creates a `dist/` folder with your static files.

### 3. Deploy Web App (Choose One)

**Option A: Cloudflare Pages (Free & Fast)**
- Push code to GitHub
- Connect to Cloudflare Pages
- Build command: `npm run build:web`
- Output: `dist`

**Option B: GitHub Pages**
- Push `dist/` folder to GitHub
- Enable GitHub Pages in repo settings
- Done!

**Option C: Supabase Storage**
- Upload `dist/` files to Supabase Storage bucket
- Make bucket public
- Access via CDN URL

### 4. Deploy Mobile Apps (Optional)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Set secrets
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"

# Build
eas build --platform android --profile preview
```

---

## 📚 Full Guide

For complete instructions, troubleshooting, and advanced options, see:
**[SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md)**

---

## 🎉 That's It!

Your app is now live on Supabase! 🚀
