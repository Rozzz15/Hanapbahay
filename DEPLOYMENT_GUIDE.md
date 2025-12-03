# 🚀 HanapBahay Deployment Guide

This guide will help you deploy your HanapBahay app so everyone can access it. We'll cover deployment for:
- **Web App** - Accessible via browser
- **Mobile Apps** - iOS and Android apps in app stores
- **Backend Server** - API server for payment processing

---

## 📋 Prerequisites

Before deploying, make sure you have:

- [ ] Node.js v18+ installed
- [ ] Git repository set up
- [ ] Expo account ([sign up here](https://expo.dev/signup))
- [ ] Supabase project set up
- [ ] PayMongo account for payments
- [ ] Domain name (optional, but recommended)

---

## 🌐 Part 1: Deploy Web App

Deploy the web version so users can access it via browser.

### Option A: Deploy to Vercel (Recommended)

Vercel offers excellent Expo web support and automatic deployments.

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Configure for Web Build

Create `vercel.json` in project root:
```json
{
  "buildCommand": "npx expo export:web",
  "outputDirectory": "web-build",
  "devCommand": "npm run web",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Step 3: Deploy
```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

#### Step 4: Set Environment Variables in Vercel Dashboard

Go to your project settings in Vercel and add:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (your backend server URL)

### Option B: Deploy to Netlify

#### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### Step 2: Create `netlify.toml`
```toml
[build]
  command = "npm run build:web"
  publish = "web-build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 3: Add build script to `package.json`
```json
{
  "scripts": {
    "build:web": "expo export:web"
  }
}
```

#### Step 4: Deploy
```bash
# Login
netlify login

# Deploy
netlify deploy --prod
```

### Option C: Deploy to Any Static Host

1. Build the web version:
```bash
npx expo export:web
```

2. Upload the `web-build` folder to your hosting provider (GitHub Pages, AWS S3, etc.)

---

## 📱 Part 2: Deploy Mobile Apps (iOS & Android)

Deploy native apps to App Store and Google Play Store using Expo Application Services (EAS).

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure EAS Build

Your `eas.json` is already set up. Update it if needed:
```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Step 4: Set Up Environment Variables for Builds

Create environment variables in Expo dashboard:
```bash
# Set environment variables for production builds
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-api-url.com"
```

Or set them in Expo Dashboard → Your Project → Secrets

### Step 5: Build Android App

#### For Internal Testing (APK)
```bash
eas build --platform android --profile preview
```

#### For Google Play Store (AAB)
```bash
eas build --platform android --profile production
```

#### Submit to Google Play Store
```bash
eas submit --platform android
```

**Requirements:**
- Google Play Console account ($25 one-time fee)
- App signing key (EAS can generate this)
- App store listing materials (screenshots, description, etc.)

### Step 6: Build iOS App

#### For Internal Testing
```bash
eas build --platform ios --profile preview
```

#### For App Store
```bash
eas build --platform ios --profile production
```

#### Submit to App Store
```bash
eas submit --platform ios
```

**Requirements:**
- Apple Developer account ($99/year)
- App Store Connect account
- iOS certificates (EAS can manage these)

### Step 7: Update App Store Information

In your `app.json`, ensure you have:
- App name, description, version
- App icons and splash screens
- Proper bundle identifiers

---

## 🔧 Part 3: Deploy Backend Server

Deploy the Express.js backend server for PayMongo payment processing.

### Option A: Deploy to Heroku (Easiest)

#### Step 1: Install Heroku CLI
Download from [heroku.com/cli](https://devcenter.heroku.com/articles/heroku-cli)

#### Step 2: Login to Heroku
```bash
heroku login
```

#### Step 3: Create Heroku App
```bash
cd server
heroku create your-app-name-api
```

#### Step 4: Update Procfile

The Procfile should already exist. Make sure it's:
```
web: cd server && npm install && npm start
```

#### Step 5: Set Environment Variables
```bash
heroku config:set PAYMONGO_SECRET_KEY=sk_live_your_key
heroku config:set PAYMONGO_PUBLIC_KEY=pk_live_your_key
heroku config:set PORT=$PORT
```

#### Step 6: Deploy
```bash
# From project root
git subtree push --prefix server heroku main
```

Or use the Heroku Git method:
```bash
cd server
git init
heroku git:remote -a your-app-name-api
git add .
git commit -m "Initial commit"
git push heroku main
```

### Option B: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Set root directory to `server`
6. Add environment variables:
   - `PAYMONGO_SECRET_KEY`
   - `PAYMONGO_PUBLIC_KEY`
   - `PORT` (Railway auto-sets this)
7. Deploy!

### Option C: Deploy to Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables
6. Deploy!

### Step 7: Update API URL

After deploying your backend, update your frontend environment variables:

**For Web:**
- Update Vercel/Netlify environment variables with new `EXPO_PUBLIC_API_URL`

**For Mobile:**
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-api.herokuapp.com"
```

---

## 🔐 Part 4: Environment Variables Setup

### Frontend Environment Variables (`.env` file)

Create `.env` in project root (DO NOT commit this file):
```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL
EXPO_PUBLIC_API_URL=https://your-api.herokuapp.com
```

### Backend Environment Variables (`server/.env` file)

Create `server/.env` (DO NOT commit this file):
```env
# PayMongo API Keys
PAYMONGO_SECRET_KEY=sk_live_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_live_your_public_key_here

# Server Configuration
PORT=3000

# Webhook Secret (for production)
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Important:** Use `sk_live_` and `pk_live_` keys for production, not test keys!

---

## ✅ Deployment Checklist

### Before Deploying:
- [ ] All environment variables configured
- [ ] Test keys replaced with production keys
- [ ] App icons and splash screens added
- [ ] App store listing materials prepared (for mobile)
- [ ] Backend server tested locally
- [ ] Web build tested locally

### Web Deployment:
- [ ] Web app deployed to Vercel/Netlify
- [ ] Environment variables set in hosting platform
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic on Vercel/Netlify)

### Mobile Deployment:
- [ ] Expo account created and logged in
- [ ] EAS build configured
- [ ] Environment variables set in Expo dashboard
- [ ] Android app built and tested
- [ ] iOS app built and tested
- [ ] Apps submitted to stores (or shared via internal testing)

### Backend Deployment:
- [ ] Backend deployed to Heroku/Railway/Render
- [ ] Environment variables configured
- [ ] Server health check passing
- [ ] PayMongo webhooks configured with production URL
- [ ] CORS configured correctly

### Post-Deployment:
- [ ] All services tested in production
- [ ] Payment flow tested
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Analytics configured (optional)
- [ ] Documentation updated with production URLs

---

## 🧪 Testing After Deployment

### Test Web App:
1. Visit your deployed web URL
2. Test login/signup
3. Test property listings
4. Test payment flow (with test cards)

### Test Mobile Apps:
1. Install apps on test devices
2. Test all features
3. Test payment integration
4. Test notifications (if applicable)

### Test Backend API:
```bash
# Test health endpoint
curl https://your-api.herokuapp.com/health

# Test payment endpoint (use Postman or curl)
curl -X POST https://your-api.herokuapp.com/api/paymongo/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "PHP"}'
```

---

## 🔄 Continuous Deployment

### Automatic Deployments with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx expo export:web
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📞 Support & Resources

- **Expo Docs**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Vercel Docs**: https://vercel.com/docs
- **Heroku Docs**: https://devcenter.heroku.com

---

## 🐛 Troubleshooting

### Web Build Fails:
- Check Node.js version (needs v18+)
- Clear cache: `npx expo export:web --clear`
- Check for missing dependencies

### Mobile Build Fails:
- Check EAS build logs in Expo dashboard
- Verify environment variables are set
- Check `app.json` configuration

### Backend Deployment Fails:
- Check environment variables
- Verify Procfile is correct
- Check server logs in hosting dashboard

### Payment Integration Not Working:
- Verify PayMongo keys are production keys (not test)
- Check webhook URL is correct
- Verify CORS settings allow your frontend domain

---

## 🎉 You're Done!

Your app should now be accessible to everyone:
- **Web**: Accessible via browser at your deployed URL
- **Android**: Available on Google Play Store
- **iOS**: Available on App Store
- **Backend**: Running on your chosen hosting platform

Happy deploying! 🚀




