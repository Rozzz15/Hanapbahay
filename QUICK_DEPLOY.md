# ⚡ Quick Deploy Guide

This is a simplified version of the full deployment guide. Follow these steps to get your app live quickly.

## 🎯 Choose Your Deployment Path

### Path 1: Web Only (Fastest - 10 minutes)
Deploy the web version so users can access it via browser.

### Path 2: Mobile Apps (1-2 hours)
Build and publish iOS/Android apps to app stores.

### Path 3: Full Stack (30 minutes)
Deploy both web app and backend server.

---

## 🌐 Quick Web Deployment

### Deploy to Vercel (Recommended - Free & Easy)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   Follow the prompts. Say "yes" to all defaults.

4. **Set Environment Variables:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to Settings → Environment Variables
   - Add:
     - `EXPO_PUBLIC_SUPABASE_URL`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     - `EXPO_PUBLIC_API_URL` (your backend URL)

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

**Done!** Your web app is now live at `your-project.vercel.app`

---

## 📱 Quick Mobile Deployment

### Build Android App

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login:**
   ```bash
   eas login
   ```

3. **Set Environment Variables:**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "your-api-url"
   ```

4. **Build:**
   ```bash
   # For testing (APK)
   eas build --platform android --profile preview
   
   # For Google Play (AAB)
   eas build --platform android --profile production
   ```

5. **Download & Share:**
   - Build link will be provided
   - Share the APK for testing
   - Or submit to Google Play Store

### Build iOS App

```bash
# For testing
eas build --platform ios --profile preview

# For App Store
eas build --platform ios --profile production
```

**Note:** iOS requires Apple Developer account ($99/year)

---

## 🔧 Quick Backend Deployment

### Deploy to Heroku (Easiest)

1. **Install Heroku CLI:**
   - Download from [heroku.com/cli](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login:**
   ```bash
   heroku login
   ```

3. **Create App:**
   ```bash
   cd server
   heroku create your-app-name-api
   ```

4. **Set Environment Variables:**
   ```bash
   heroku config:set PAYMONGO_SECRET_KEY=sk_live_your_key
   heroku config:set PAYMONGO_PUBLIC_KEY=pk_live_your_key
   ```

5. **Deploy:**
   ```bash
   # Option 1: Using Git (recommended)
   git init
   heroku git:remote -a your-app-name-api
   git add .
   git commit -m "Deploy"
   git push heroku main
   
   # Option 2: Using Heroku CLI
   cd server
   heroku git:remote -a your-app-name-api
   git push heroku HEAD:main
   ```

6. **Check Status:**
   ```bash
   heroku logs --tail
   ```

**Your API is live at:** `https://your-app-name-api.herokuapp.com`

### Alternative: Deploy to Railway (Even Easier)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `server`
5. Add environment variables in Railway dashboard
6. Deploy!

---

## ✅ Quick Checklist

### Before You Start:
- [ ] Have your Supabase credentials ready
- [ ] Have your PayMongo credentials ready (for backend)
- [ ] Git repository is pushed to GitHub

### For Web:
- [ ] `vercel.json` exists (already created)
- [ ] Deployed to Vercel
- [ ] Environment variables set

### For Mobile:
- [ ] EAS CLI installed and logged in
- [ ] Environment variables set in Expo
- [ ] Build completed successfully

### For Backend:
- [ ] Backend deployed
- [ ] Environment variables configured
- [ ] Server responding at `/health` endpoint

---

## 🔗 Next Steps

1. **Update Frontend URLs:**
   - Set `EXPO_PUBLIC_API_URL` to your deployed backend URL
   - Rebuild/redeploy frontend

2. **Configure PayMongo Webhooks:**
   - Go to PayMongo Dashboard → Webhooks
   - Add webhook: `https://your-backend-url.com/api/paymongo/webhook`
   - Copy webhook secret to backend environment variables

3. **Test Everything:**
   - Test web app in browser
   - Test mobile apps on devices
   - Test payment flow

4. **Share Your App:**
   - Share web URL
   - Share app store links (once published)
   - Share APK/IPA for testing

---

## 🆘 Need Help?

- Full guide: See `DEPLOYMENT_GUIDE.md`
- Expo docs: https://docs.expo.dev
- Vercel docs: https://vercel.com/docs
- Heroku docs: https://devcenter.heroku.com

---

## 🎉 You're Live!

Your app is now accessible to everyone! 🚀




