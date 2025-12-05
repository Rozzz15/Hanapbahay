# ✅ Your Backend Configuration

## Backend URL
**Your Railway Backend:** `https://web-production-e66fb.up.railway.app`

## ✅ Status
- ✅ Backend is deployed and running
- ✅ Health endpoint working: `/health`
- ✅ PayMongo endpoint working: `/api/paymongo/create-payment-intent`

## Configuration Steps

### 1. Local Development (.env file)

Create or update `.env` file in project root:
```env
EXPO_PUBLIC_API_URL=https://web-production-e66fb.up.railway.app
```

**Important:** Restart Expo after updating `.env`:
```bash
# Stop Expo (Ctrl+C)
npm start
```

### 2. Production Build (EAS Environment Variable)

Set the environment variable for APK builds:
```bash
eas env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://web-production-e66fb.up.railway.app" --force
```

Verify it's set:
```bash
eas env:list
```

### 3. Build APK

Once EAS environment variable is set, build your APK:

**Preview APK (for testing):**
```bash
eas build --platform android --profile preview
```

**Production AAB (for Play Store):**
```bash
eas build --platform android --profile production
```

## Test Your Backend

You can test your backend anytime:
```bash
node scripts/test-cloud-backend.js https://web-production-e66fb.up.railway.app
```

Or visit in browser:
- Health check: https://web-production-e66fb.up.railway.app/health
- Should return: `{"status":"ok",...}`

## ✅ Checklist

- [x] Backend deployed on Railway
- [x] Backend URL tested and working
- [ ] EAS environment variable set (`eas env:create`)
- [ ] Local `.env` file updated (for development)
- [ ] APK built and tested

## Next Steps

1. **Set EAS environment variable** (if not done yet):
   ```bash
   eas env:create --scope project --name EXPO_PUBLIC_API_URL --value "https://web-production-e66fb.up.railway.app" --force
   ```

2. **Build APK**:
   ```bash
   eas build --platform android --profile preview
   ```

3. **Test APK** on a real Android device

4. **If everything works**, build production AAB for Play Store:
   ```bash
   eas build --platform android --profile production
   ```

---

**Your app is now configured to use the cloud backend!** 🚀

