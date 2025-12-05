# 🚂 Deploy Backend to Railway - Step by Step Guide

This guide will help you deploy your HanapBahay backend server to Railway in under 30 minutes.

## Prerequisites

- ✅ GitHub account
- ✅ Railway account (free signup at [railway.app](https://railway.app))
- ✅ Backend code ready in `server/` directory
- ✅ PayMongo API keys ready

## Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Login" or "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Railway to access your GitHub account

## Step 2: Create New Project

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select your `hanapbahay` repository
4. Click **"Deploy Now"**

## Step 3: Configure Your Service

Railway will create a service from your repository. Now configure it:

### 3.1 Set Root Directory

1. Click on your service
2. Go to **Settings** tab
3. Scroll to **Root Directory**
4. Set it to: `server`
5. Click **Save**

### 3.2 Configure Build Settings

1. Still in Settings, scroll to **Deploy**
2. **Build Command:** Leave default (or set to `npm install`)
3. **Start Command:** Set to `npm start`
4. Click **Save**

### 3.3 Set Environment Variables

1. Go to **Variables** tab
2. Click **"New Variable"**
3. Add these variables one by one:

   ```
   PAYMONGO_SECRET_KEY=sk_live_your_secret_key_here
   ```
   
   ```
   PAYMONGO_PUBLIC_KEY=pk_live_your_public_key_here
   ```
   
   ```
   PORT=3000
   ```
   
   **Important:** 
   - For production, use `sk_live_` and `pk_live_` keys
   - For testing, you can use `sk_test_` and `pk_test_` keys
   - Railway auto-sets PORT, but set it to 3000 to be safe

4. After adding each variable, click **Save**

## Step 4: Deploy

1. Railway will automatically deploy when you:
   - Push code to your repository
   - Change settings
   - Add environment variables

2. Watch the **Deployments** tab to see progress

3. Wait for deployment to complete (usually 2-5 minutes)

## Step 5: Get Your Backend URL

1. Once deployed, go to **Settings** tab
2. Scroll to **Networking** section
3. Click **"Generate Domain"** (Railway will create a URL)
4. Your backend URL will look like:
   ```
   https://hanapbahay-production-xxxxx.up.railway.app
   ```
5. **Copy this URL!** You'll need it for your frontend

## Step 6: Test Your Backend

1. Open your backend URL in a browser:
   ```
   https://your-railway-url.railway.app/health
   ```
2. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "service": "HanapBahay API Server"
   }
   ```

## Step 7: Update Frontend Configuration

1. Update your `.env` file:
   ```env
   EXPO_PUBLIC_API_URL=https://your-railway-url.railway.app
   ```

2. Set in Expo secrets:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-railway-url.railway.app"
   ```

## ✅ Done!

Your backend is now live on Railway! 🎉

## Troubleshooting

### Deployment Fails

- Check **Deployments** tab for error logs
- Verify `server/package.json` exists
- Ensure `npm start` command works locally
- Check environment variables are set correctly

### Backend Not Responding

- Check **Metrics** tab to see if service is running
- Verify PORT environment variable is set
- Check deployment logs for errors

### CORS Errors

Your backend already has CORS enabled, but if you get errors:
- Verify backend URL is correct
- Check Railway logs for CORS-related errors

## Next Steps

- ✅ Backend deployed
- ✅ URL copied
- ✅ Frontend `.env` updated
- ✅ Expo secrets set
- 🚀 Ready to build your app!

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

Good luck! 🚀




