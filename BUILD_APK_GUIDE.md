# 📱 Build APK with Cloud Backend - Complete Guide

## ✅ What's Already Done

1. ✅ **Backend URL configured**: `https://web-production-e66fb.up.railway.app`
2. ✅ **Backend tested**: All endpoints working
3. ✅ **EAS configuration updated**: `eas.json` includes cloud backend URL for all profiles
4. ✅ **Environment variables**: Configured in `eas.json` for development, preview, and production builds

## 🚀 Build Your APK Now

### Step 1: Make sure you're logged in to EAS

```bash
eas login
```

### Step 2: Set up Android credentials (one-time setup)

The first time you build, EAS needs to set up Android signing credentials:

```bash
eas credentials
```

Then:
1. Select **Android**
2. Choose **Set up new credentials** (or use existing if you have them)
3. Follow the prompts

**OR** let EAS manage it automatically by running the build interactively:

```bash
eas build --platform android --profile preview
```

This will prompt you to set up credentials if needed.

### Step 3: Build the APK

Once credentials are set up, build your APK:

```bash
# Preview APK (for testing)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production
```

## 📋 Current Configuration

### Backend URL
- **Cloud Backend**: `https://web-production-e66fb.up.railway.app`
- **Status**: ✅ Working and tested

### EAS Build Profiles
All profiles in `eas.json` are configured with:
```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://web-production-e66fb.up.railway.app"
}
```

This means:
- ✅ **Development builds** will use cloud backend
- ✅ **Preview builds** will use cloud backend  
- ✅ **Production builds** will use cloud backend

## 🎯 Quick Build Command

Run this to build your APK with cloud backend:

```bash
eas build --platform android --profile preview
```

The build will:
1. Use the cloud backend URL from `eas.json`
2. Create an APK file
3. Upload it to EAS servers
4. Give you a download link

## ✅ Verification

After building, verify the APK uses cloud backend:

1. **Install APK** on Android device
2. **Open app** and check console logs (if available)
3. **Test features** that require backend (payments, etc.)
4. **Verify** no "localhost" or "Network request failed" errors

## 🔧 Troubleshooting

### Issue: "Generating a new Keystore is not supported in --non-interactive mode"
**Solution**: Run build without `--non-interactive` flag:
```bash
eas build --platform android --profile preview
```

### Issue: Credentials not set up
**Solution**: Set up credentials first:
```bash
eas credentials
# Select Android → Set up new credentials
```

### Issue: Build fails
**Check**:
- You're logged in: `eas whoami`
- Project is linked: `eas project:info`
- Backend is accessible: `node scripts/test-cloud-backend.js https://web-production-e66fb.up.railway.app`

## 📝 Summary

**Everything is configured!** Your `eas.json` has the cloud backend URL for all build profiles. Just run:

```bash
eas build --platform android --profile preview
```

And your APK will be built with the cloud backend automatically! 🚀

