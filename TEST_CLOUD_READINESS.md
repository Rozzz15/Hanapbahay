# 🧪 Test Cloud Readiness & APK Build Checklist

This guide helps you verify your app is ready for cloud deployment and APK building.

## ✅ Pre-Flight Checklist

### 1. Backend Deployment Status

- [ ] **Backend is deployed on Railway/Render**
  - Check: Visit `https://your-backend-url.railway.app/health` in browser
  - Should return: `{"status":"ok","timestamp":"...","service":"HanapBahay API Server"}`
  
- [ ] **Backend URL is accessible**
  - Test: `curl https://your-backend-url.railway.app/health`
  - Or open in browser and verify JSON response

### 2. Environment Variables Configuration

#### For Local Development (.env file):
- [ ] Create `.env` file in project root (if not exists)
- [ ] Set `EXPO_PUBLIC_API_URL=https://your-actual-backend-url.railway.app`
- [ ] **DO NOT** use `localhost` or placeholder URLs
- [ ] Verify `.env` is in `.gitignore` (should not be committed)

#### For Production Build (EAS Secrets):
- [ ] Set Expo secret: `eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-actual-backend-url.railway.app"`
- [ ] Verify secret exists: `eas secret:list`
- [ ] **IMPORTANT:** This is what will be used in the APK build!

### 3. App Configuration Check

- [ ] **API URL in constants** (`constants/index.ts`)
  ```typescript
  export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  ```
  ✅ This is correct - uses environment variable with localhost fallback

- [ ] **EAS Build Configuration** (`eas.json`)
  - [ ] Android APK build type is set (for preview: `buildType: "apk"`)
  - [ ] Production build uses `app-bundle` (for Play Store)

### 4. Backend Environment Variables (Railway)

Make sure these are set in Railway dashboard:
- [ ] `PAYMONGO_SECRET_KEY` - Your PayMongo secret key
- [ ] `PAYMONGO_PUBLIC_KEY` - Your PayMongo public key  
- [ ] `PORT` - Railway auto-assigns, but can set to `3000`

## 🧪 Testing Steps

### Step 1: Test Backend Connection

1. **Get your Railway backend URL:**
   - Go to Railway dashboard → Your service → Settings
   - Copy the generated URL (e.g., `https://hanapbahay-production-xxxx.up.railway.app`)

2. **Test backend health:**
   ```bash
   # In browser or terminal
   curl https://your-backend-url.railway.app/health
   ```
   Should return: `{"status":"ok",...}`

3. **Test PayMongo endpoint:**
   ```bash
   curl -X POST https://your-backend-url.railway.app/api/paymongo/create-payment-intent \
     -H "Content-Type: application/json" \
     -d '{"amount":10000,"currency":"PHP"}'
   ```
   Should return payment intent data (or error if keys not set)

### Step 2: Test App with Cloud Backend

1. **Update local .env file:**
   ```env
   EXPO_PUBLIC_API_URL=https://your-actual-backend-url.railway.app
   ```

2. **Restart Expo:**
   ```bash
   # Stop current Expo (Ctrl+C)
   npm start
   ```

3. **Test in app:**
   - Open app on device/emulator
   - Try to make a payment or use features that call backend
   - Check console logs for: `🔗 PayMongo API URL: https://your-backend-url...`
   - Verify no "Network request failed" errors

### Step 3: Verify EAS Secrets for Production

1. **Check current secrets:**
   ```bash
   eas secret:list
   ```

2. **Set/Update API URL secret:**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-actual-backend-url.railway.app" --force
   ```

3. **Verify it's set:**
   ```bash
   eas secret:list | grep EXPO_PUBLIC_API_URL
   ```

## 📱 Building APK for Cloud Backend

### Option 1: Preview Build (APK for testing)

```bash
# Make sure EAS secret is set first!
eas build --platform android --profile preview
```

This creates an APK that:
- ✅ Uses cloud backend (from EAS secret)
- ✅ Can be installed directly on Android devices
- ✅ Good for testing before Play Store release

### Option 2: Production Build (AAB for Play Store)

```bash
# Make sure EAS secret is set first!
eas build --platform android --profile production
```

This creates an AAB (Android App Bundle) that:
- ✅ Uses cloud backend (from EAS secret)
- ✅ Ready for Google Play Store upload
- ✅ Optimized and signed for production

## 🔍 Verification After Build

1. **Download and install APK/AAB**
2. **Open app and check:**
   - [ ] App loads without errors
   - [ ] Can connect to backend (test payment or API feature)
   - [ ] No "Network request failed" errors
   - [ ] Check app logs: Should show cloud backend URL, not localhost

3. **Test on different devices:**
   - [ ] Works on Android phone
   - [ ] Works on Android tablet (if supported)
   - [ ] Works without local backend running

## ⚠️ Common Issues & Fixes

### Issue: App still uses localhost
**Fix:**
- Make sure EAS secret is set: `eas secret:list`
- Rebuild APK after setting secret
- Check that `.env` file is NOT committed (EAS doesn't use local .env)

### Issue: "Network request failed" in APK
**Fix:**
1. Verify backend is accessible: `curl https://your-backend-url/health`
2. Check backend CORS settings (should allow all origins)
3. Verify EAS secret has correct URL (no typos)
4. Rebuild APK with updated secret

### Issue: Backend returns errors
**Fix:**
1. Check Railway logs for errors
2. Verify PayMongo keys are set in Railway
3. Test backend directly with curl
4. Check backend is running (not crashed)

## 📋 Quick Command Reference

```bash
# Test backend
curl https://your-backend-url.railway.app/health

# Set EAS secret for production
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-backend-url.railway.app" --force

# List secrets
eas secret:list

# Build APK (preview)
eas build --platform android --profile preview

# Build AAB (production)
eas build --platform android --profile production

# Check build status
eas build:list
```

## ✅ Final Checklist Before Building APK

- [ ] Backend deployed and accessible
- [ ] Backend health check returns OK
- [ ] `EXPO_PUBLIC_API_URL` set in EAS secrets (real cloud URL)
- [ ] Tested app locally with cloud backend URL
- [ ] No localhost references in production code
- [ ] EAS account connected: `eas whoami`
- [ ] Ready to build: `eas build --platform android --profile preview`

---

**Next Steps:**
1. Complete all checklist items above
2. Build preview APK to test
3. Test APK on real device
4. If everything works, build production AAB for Play Store

