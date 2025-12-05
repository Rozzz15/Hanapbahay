# 🧪 Pre-Deployment Testing Checklist

Before deploying to Google Play Store, run through this checklist to ensure everything is ready.

## ⚠️ Critical Issues Found

### 1. Backend API URL
**Status:** ⚠️ **PLACEHOLDER DETECTED**

Your `.env` file currently has:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.railway.app
```

**Action Required:** Replace this with your actual deployed backend URL before building for production!

### 2. Google Services Configuration
**Status:** ⚠️ **Missing google-services.json**

The `eas.json` references `./google-services.json` but it's not found. This is needed for automated Play Store submission.

**Options:**
- **Option A:** Remove the serviceAccountKeyPath if doing manual submission
- **Option B:** Set up Google Cloud service account (see below)

---

## ✅ Configuration Checks

### App Configuration (`app.json`)
- ✅ App name: "HanapBahay"
- ✅ Package name: "com.hanapbahay.app"
- ✅ Version: "1.0.0"
- ✅ Version code: 1
- ✅ Icon configured
- ✅ Splash screen configured
- ✅ Permissions configured
- ✅ Android package configured

### EAS Build Configuration (`eas.json`)
- ✅ Production profile configured
- ✅ Build type: app-bundle (correct for Play Store)
- ✅ Auto-increment enabled
- ⚠️ Service account key path referenced (file missing)

### Environment Variables
- ✅ Supabase URL configured
- ✅ Supabase Anon Key configured
- ⚠️ API URL is placeholder (needs real cloud URL)

---

## 🧪 Testing Steps

### Step 1: Run Linter
```bash
npm run lint
```

### Step 2: Run Tests
```bash
npm test
```

### Step 3: Check TypeScript Errors
```bash
npx tsc --noEmit
```

### Step 4: Verify Environment Variables
Make sure all environment variables are set in Expo:
```bash
eas secret:list
```

### Step 5: Build Preview Version (Test First!)
```bash
eas build --platform android --profile preview
```

---

## 📋 Pre-Build Checklist

Before running the production build:

### Environment Variables
- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Set in Expo secrets
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Set in Expo secrets  
- [ ] `EXPO_PUBLIC_API_URL` - **Must be your real cloud backend URL!**

### Backend Deployment
- [ ] Backend deployed to cloud (Railway/Render/etc.)
- [ ] Backend URL is accessible
- [ ] Backend health check passes: `https://your-backend-url.com/health`
- [ ] Backend CORS configured for production

### Configuration
- [ ] App version number updated if needed
- [ ] Version code incremented
- [ ] App icons and splash screens are production-ready
- [ ] All sensitive data removed from code

### Testing
- [ ] App tested on physical Android device
- [ ] All features working (login, signup, listings, payments)
- [ ] Payment flow tested with test cards
- [ ] No console errors
- [ ] Performance is acceptable

---

## 🚀 Build Commands

### 1. Test Build (Preview APK)
```bash
eas build --platform android --profile preview
```
This creates an APK you can install and test on your device.

### 2. Production Build (AAB for Play Store)
```bash
eas build --platform android --profile production
```
This creates an App Bundle (.aab) file ready for Play Store submission.

---

## 🔧 Fixing Issues

### Fix 1: Update Backend URL

If your backend is deployed, update `.env`:
```env
EXPO_PUBLIC_API_URL=https://your-actual-backend-url.railway.app
```

Then set it in Expo secrets:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-actual-backend-url.railway.app"
```

### Fix 2: Remove Service Account (Manual Submission)

If you don't have `google-services.json`, you can remove that line from `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "track": "production"
    }
  }
}
```

You'll need to manually upload to Play Console instead.

---

## 📱 Play Store Submission Checklist

After building:

- [ ] Google Play Console account created ($25 one-time fee)
- [ ] App listing prepared:
  - [ ] App name
  - [ ] Short description (80 chars)
  - [ ] Full description (4000 chars)
  - [ ] Screenshots (at least 2, up to 8)
  - [ ] Feature graphic (1024x500)
  - [ ] App icon (512x512)
- [ ] Privacy policy URL added
- [ ] Content rating questionnaire completed
- [ ] App bundle (.aab) uploaded
- [ ] Store listing completed
- [ ] App submitted for review

---

## 🆘 Common Issues

### Build Fails
- Check environment variables are set in Expo
- Verify app.json is valid JSON
- Check for TypeScript/linter errors

### App Crashes on Startup
- Verify backend URL is correct and accessible
- Check environment variables in Expo secrets
- Test backend health endpoint

### API Calls Fail
- Verify backend is deployed and running
- Check CORS settings on backend
- Verify API URL is correct

---

## ✅ Ready to Build?

Once all items above are checked:

1. ✅ All critical issues resolved
2. ✅ Environment variables configured
3. ✅ Backend deployed and accessible
4. ✅ Preview build tested and working
5. ✅ Ready for production build

Then run:
```bash
eas build --platform android --profile production
```

Good luck with your deployment! 🚀




