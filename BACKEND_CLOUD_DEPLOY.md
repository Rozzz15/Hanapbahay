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
   - Build Command: Leave empty or set to `npm ci` (Railway will auto-detect)
   - Start Command: `npm start` (or leave empty, Railway will auto-detect from package.json)
   - Port: Railway auto-detects (usually PORT env var)
   
   **Important:** Make sure the `server/package-lock.json` file is committed to git!

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

## Troubleshooting Railway Deployment

### Issue: Railway crashes when root directory is set to "server"

**Common causes and solutions:**

1. **Package-lock.json not committed:**
   ```bash
   # Make sure server/package-lock.json is committed
   git add server/package-lock.json
   git commit -m "Add server package-lock.json"
   git push
   ```

2. **Build command issue:**
   - In Railway settings, try leaving Build Command **empty** (Railway will auto-detect)
   - Or change Build Command from `npm ci` to `npm install`
   - Railway's Nixpacks will auto-detect Node.js and run the correct commands

3. **Missing PORT environment variable:**
   - Make sure you set `PORT=3000` in Railway's environment variables
   - Railway should auto-assign a PORT, but explicitly setting it helps

4. **Start command:**
   - Leave Start Command empty (Railway will use `npm start` from package.json)
   - Or explicitly set: `npm start`

5. **Check Railway logs:**
   - Go to your Railway project → Deployments → Click on the failed deployment
   - Check the logs to see the exact error message
   - Common errors:
     - `npm ci` fails → Use `npm install` instead
     - Port binding error → Make sure server.js binds to `0.0.0.0` (it already does)
     - Missing dependencies → Ensure package-lock.json is committed

### Quick Fix Checklist:

- [ ] `server/package-lock.json` is committed to git
- [ ] Root Directory is set to `server` in Railway
- [ ] Build Command is empty OR set to `npm install`
- [ ] Start Command is empty OR set to `npm start`
- [ ] `PORT` environment variable is set (Railway auto-assigns, but you can set it explicitly)
- [ ] `PAYMONGO_SECRET_KEY` and `PAYMONGO_PUBLIC_KEY` are set in Railway variables

## Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- See `SUPABASE_DEPLOYMENT.md` for more deployment options




