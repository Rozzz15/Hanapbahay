# 🚀 Supabase Deployment Guide for HanapBahay

This guide will help you deploy your HanapBahay app using Supabase as your cloud backend.

## 📋 What You'll Deploy

- **Frontend Web App** - Deployed to static hosting (with Supabase backend)
- **Database** - Already on Supabase
- **Backend API** - Can use Supabase Edge Functions (optional)

## 🎯 Prerequisites

- [ ] Node.js v18+ installed
- [ ] Git repository set up
- [ ] Supabase project created at [supabase.com](https://supabase.com)
- [ ] Expo account for mobile builds ([sign up here](https://expo.dev/signup))

---

## 📦 Part 1: Setup Supabase Project

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `hanapbahay` (or your preferred name)
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start

### Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)
   - **service_role key** (keep this secret!)

### Step 3: Set Up Environment Variables

Create a `.env` file in your project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 🌐 Part 2: Deploy Web App

You can deploy your web app to any static hosting service. Here are recommended options:

### Option A: Deploy to Supabase Storage + CDN (Recommended)

Supabase can host static files:

1. **Build your web app:**
   ```bash
   npm run build:web
   ```
   This creates a `dist/` folder with your static files.

2. **Upload to Supabase Storage:**
   - Go to Supabase Dashboard → **Storage**
   - Create a new bucket called `web-app` (make it public)
   - Upload all files from the `dist/` folder

3. **Enable CDN:**
   - Your files will be served via Supabase CDN automatically
   - Access your app at: `https://your-project.supabase.co/storage/v1/object/public/web-app/`

### Option B: Deploy to GitHub Pages

1. **Build your web app:**
   ```bash
   npm run build:web
   ```

2. **Push to GitHub:**
   ```bash
   git add dist/
   git commit -m "Add web build"
   git push
   ```

3. **Enable GitHub Pages:**
   - Go to your repo → Settings → Pages
   - Source: Deploy from branch
   - Branch: `main` (or your branch)
   - Folder: `/dist`
   - Save

4. **Access your app:**
   - Your app will be at: `https://yourusername.github.io/hanapbahay/`

### Option C: Deploy to Cloudflare Pages (Free & Fast)

1. **Push your code to GitHub**
2. **Go to [Cloudflare Pages](https://pages.cloudflare.com)**
3. **Connect your GitHub repository**
4. **Configure build:**
   - Build command: `npm run build:web`
   - Build output directory: `dist`
   - Root directory: `/`
5. **Set environment variables:**
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
6. **Deploy!**

---

## 📱 Part 3: Deploy Mobile Apps (Optional)

For iOS and Android apps, use Expo Application Services (EAS):

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure EAS

Your `eas.json` is already configured. You can update it if needed.

### Step 4: Set Environment Variables

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
```

### Step 5: Build Android App

```bash
# For testing (APK)
eas build --platform android --profile preview

# For Google Play Store (AAB)
eas build --platform android --profile production
```

### Step 6: Build iOS App

```bash
# For testing
eas build --platform ios --profile preview

# For App Store
eas build --platform ios --profile production
```

**Note:** iOS requires Apple Developer account ($99/year)

---

## 🔧 Part 4: Backend API (Optional)

If you need the PayMongo payment backend, you have two options:

### Option A: Keep Express Server (Simple)

Deploy your Express server to any Node.js hosting:

1. **Railway** (Recommended - Easy & Free tier):
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub
   - Set root directory to `server`
   - Add environment variables:
     - `PAYMONGO_SECRET_KEY`
     - `PAYMONGO_PUBLIC_KEY`
     - `PORT`

2. **Render** (Free tier):
   - Go to [render.com](https://render.com)
   - New Web Service → Connect GitHub
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Add environment variables

3. **Update frontend:**
   - Set `EXPO_PUBLIC_API_URL` to your backend URL

### Option B: Convert to Supabase Edge Functions (Advanced)

Migrate your Express API routes to Supabase Edge Functions:

1. Create `supabase/functions/paymongo/index.ts`
2. Move your PayMongo logic there
3. Deploy: `supabase functions deploy paymongo`

See [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) for details.

---

## ✅ Deployment Checklist

### Before Deployment:

- [ ] Supabase project created
- [ ] Environment variables configured (`.env` file)
- [ ] All features tested locally
- [ ] Database tables created in Supabase

### For Web:

- [ ] Web app built (`npm run build:web`)
- [ ] Deployed to hosting service
- [ ] Environment variables set in hosting platform
- [ ] Tested in browser

### For Mobile:

- [ ] EAS CLI installed and logged in
- [ ] Environment variables set in Expo
- [ ] Build completed successfully
- [ ] Tested on device

---

## 🔗 Setting Up Your Domain (Optional)

### For Supabase Storage:

1. Go to Supabase Dashboard → Settings → Storage
2. Configure custom domain (requires paid plan)

### For GitHub Pages:

1. Add CNAME file in your repo
2. Configure DNS settings

### For Cloudflare Pages:

1. Go to Pages → Your Project → Custom Domains
2. Add your domain and follow DNS instructions

---

## 🐛 Troubleshooting

### Build Fails:

```bash
# Clear cache and rebuild
npm run reset
npm run build:web
```

### Environment Variables Not Working:

- Check `.env` file exists in project root
- For web: Rebuild after changing `.env`
- For mobile: Check EAS secrets are set correctly

### Database Connection Issues:

- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Verify network/firewall settings

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## 🎉 You're Live!

Your app is now deployed and accessible to everyone! 🚀

- **Web**: Your hosted URL
- **Android**: Available via APK or Google Play Store
- **iOS**: Available via TestFlight or App Store
- **Database**: Running on Supabase

Happy deploying! 🎊

