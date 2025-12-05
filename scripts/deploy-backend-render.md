# 🎨 Deploy Backend to Render - Step by Step Guide

This guide will help you deploy your HanapBahay backend server to Render (free tier available).

## Prerequisites

- ✅ GitHub account
- ✅ Render account (free signup at [render.com](https://render.com))
- ✅ Backend code ready in `server/` directory
- ✅ PayMongo API keys ready

## Step 1: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Choose "Continue with GitHub"
4. Authorize Render to access your GitHub account

## Step 2: Create New Web Service

1. In Render dashboard, click **"New +"** button
2. Select **"Web Service"**
3. Click **"Connect account"** next to GitHub
4. Authorize Render
5. Find and select your `hanapbahay` repository
6. Click **"Connect"**

## Step 3: Configure Your Service

Fill in the service configuration:

### Basic Settings

- **Name:** `hanapbahay-backend` (or your choice)
- **Region:** Choose closest to your users
- **Branch:** `main` (or your default branch)
- **Root Directory:** `server`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** Select **Free** (for testing) or **Starter** (for production)

### Environment Variables

Scroll down to **Environment Variables** section:

Click **"Add Environment Variable"** and add:

1. **PAYMONGO_SECRET_KEY**
   - Value: `sk_live_your_secret_key_here`
   - (Use `sk_test_` for testing)

2. **PAYMONGO_PUBLIC_KEY**
   - Value: `pk_live_your_public_key_here`
   - (Use `pk_test_` for testing)

3. **PORT**
   - Value: `3000`
   - (Render auto-sets this, but set it explicitly)

**Important:** 
- For production, use live keys (`sk_live_`, `pk_live_`)
- For testing, use test keys (`sk_test_`, `pk_test_`)

## Step 4: Create Service

1. Scroll to bottom
2. Click **"Create Web Service"**
3. Render will start deploying immediately

## Step 5: Wait for Deployment

1. Watch the **Logs** tab to see deployment progress
2. First deployment takes 5-10 minutes
3. Look for: `Server running on port 3000` in logs

## Step 6: Get Your Backend URL

1. Once deployed, Render will show your service URL at the top
2. It will look like:
   ```
   https://hanapbahay-backend.onrender.com
   ```
3. **Copy this URL!** You'll need it for your frontend

## Step 7: Test Your Backend

1. Open your backend URL in a browser:
   ```
   https://your-service.onrender.com/health
   ```
2. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "service": "HanapBahay API Server"
   }
   ```

## Step 8: Update Frontend Configuration

1. Update your `.env` file:
   ```env
   EXPO_PUBLIC_API_URL=https://your-service.onrender.com
   ```

2. Set in Expo secrets:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-service.onrender.com"
   ```

## ⚠️ Important Notes for Render Free Tier

- **Spinning Down:** Free tier services spin down after 15 minutes of inactivity
- **First Request:** First request after spin-down takes ~30 seconds (cold start)
- **For Production:** Consider paid tier ($7/month) for always-on service

## ✅ Done!

Your backend is now live on Render! 🎉

## Troubleshooting

### Deployment Fails

- Check **Logs** tab for error messages
- Verify `server/package.json` exists
- Ensure `npm start` command works locally
- Check environment variables are set correctly

### Service Spun Down

- This is normal for free tier
- First request will wake it up (takes ~30 seconds)
- Consider upgrading to paid tier for production

### Backend Not Responding

- Check **Logs** tab to see if service is running
- Verify PORT environment variable is set
- Wait a moment if service just woke up

### CORS Errors

Your backend already has CORS enabled, but if you get errors:
- Verify backend URL is correct
- Check Render logs for CORS-related errors

## Next Steps

- ✅ Backend deployed
- ✅ URL copied
- ✅ Frontend `.env` updated
- ✅ Expo secrets set
- 🚀 Ready to build your app!

## Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com

Good luck! 🚀




