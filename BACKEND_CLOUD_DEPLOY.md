# 🚀 Deploy Backend to Cloud

Your `.env` file is now configured to use a cloud-based backend URL. You need to deploy your backend server to get the actual URL.

## Quick Deployment Options

### Option 1: Railway (Recommended - Easy & Free Tier)

1. **Sign up at [railway.app](https://railway.app)**

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Configure Deployment:**
   - Root Directory: Set to `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: Railway auto-detects (usually PORT env var)

4. **Set Environment Variables:**
   - Go to Variables tab
   - Add these:
     ```
     PAYMONGO_SECRET_KEY=sk_live_your_key_here
     PAYMONGO_PUBLIC_KEY=pk_live_your_key_here
     PORT=3000
     ```

5. **Get Your URL:**
   - Railway will generate a URL like: `https://hanapbahay-production-xxxx.up.railway.app`
   - Copy this URL

6. **Update `.env` file:**
   ```env
   EXPO_PUBLIC_API_URL=https://your-railway-url.railway.app
   ```

### Option 2: Render (Free Tier Available)

1. **Sign up at [render.com](https://render.com)**

2. **Create New Web Service:**
   - Connect your GitHub repository
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free tier

3. **Set Environment Variables:**
   - Add the same variables as Railway (PAYMONGO_SECRET_KEY, etc.)

4. **Get Your URL:**
   - Render will generate: `https://hanapbahay-xxxx.onrender.com`

5. **Update `.env` file:**
   ```env
   EXPO_PUBLIC_API_URL=https://your-render-url.onrender.com
   ```

## After Deployment

1. **Test your backend:**
   - Visit: `https://your-backend-url.com/health`
   - Should see: `{"status":"ok",...}`

2. **Update `.env` file:**
   - Replace the placeholder with your actual cloud URL

3. **Restart Expo:**
   ```bash
   npm start
   ```

## Current Status

Your `.env` currently has:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.railway.app
```

**Replace this placeholder** with your actual deployed backend URL once you've deployed!

## Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- See `SUPABASE_DEPLOYMENT.md` for more deployment options




