# Troubleshooting Guide - "Something Went Wrong" Error

## 🚨 Common Issue: "Something went wrong, sorry about that. You can go back to Expo Home or try to reload the project"

This error typically occurs when opening the project on a different device. Here are the most common causes and solutions:

---

## Quick Fix Checklist

Run through these steps in order:

1. ✅ **Ensure dependencies are installed on the new device**
2. ✅ **Check network connectivity** (same WiFi or use tunnel mode)
3. ✅ **Clear cache and restart**
4. ✅ **Verify environment variables** (if using Supabase)
5. ✅ **Check for asset file issues**

---

## Solution 1: Install Dependencies on New Device

**Problem:** The new device doesn't have `node_modules` installed.

**Solution:**
```bash
# On the new device, navigate to project folder
cd hanapbahay

# Install all dependencies
npm install

# If that fails, clear cache first
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Solution 2: Network Connectivity Issues

### If using Expo Go on a different device:

**Problem:** The device can't connect to the development server.

**Solutions:**

#### Option A: Use Tunnel Mode (Recommended for different networks)
```bash
# Start with tunnel mode
npm run start:tunnel

# Or use npx directly
npx expo start --tunnel
```

#### Option B: Use LAN Mode (Same WiFi network)
```bash
# Start with LAN mode
npm run start:lan

# Or use npx directly
npx expo start --lan
```

#### Option C: Check Firewall Settings
- **Windows:** Allow Node.js through Windows Firewall
- **Mac:** Allow incoming connections in System Preferences
- Ensure port 8081 is not blocked

#### Option D: Verify Network Connection
- Both devices must be on the same WiFi network (for LAN mode)
- Or use tunnel mode if devices are on different networks
- Check that your computer's IP address is accessible

---

## Solution 3: Clear Cache and Restart

**Problem:** Cached files are causing conflicts.

**Solution:**
```bash
# Clear all caches and restart
npm run reset

# Or manually:
npx expo start --clear --reset-cache

# If still having issues, also clear Metro cache:
rm -rf .expo
rm -rf node_modules/.cache
npm run reset
```

---

## Solution 4: Environment Variables

**Problem:** Missing Supabase credentials or other environment variables.

**Solution:**

1. **Create a `.env` file** in the project root (if not exists):
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_URL=http://localhost:3000
```

2. **Note:** The app has fallback values, but for full functionality, you need valid credentials.

3. **Restart the server** after adding environment variables:
```bash
npm run reset
```

---

## Solution 5: Asset File Issues

**Problem:** Missing or corrupted asset files.

**Solution:**

1. **Verify these files exist:**
   - `assets/images/icon.png`
   - `assets/images/splash-icon.png`
   - `assets/images/favicon.png`
   - `assets/fonts/SpaceMono-Regular.ttf`
   - All files in `assets/onboarding/` folder

2. **If files are missing, restore them from the repository.**

3. **Clear cache after restoring assets:**
```bash
npm run reset
```

---

## Solution 6: Port Conflicts

**Problem:** Port 8081 is already in use.

**Solution:**

```bash
# Windows - Find and kill process on port 8081
netstat -ano | findstr :8081
taskkill /PID <PID_NUMBER> /F

# Mac/Linux - Find and kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use a different port
npx expo start --port 8082
```

---

## Solution 7: Platform-Specific Issues

### Android/Expo Go Issues:
```bash
# Clear Expo Go cache on your device
# Settings > Apps > Expo Go > Clear Cache

# Then restart the app and reconnect
```

### iOS/Expo Go Issues:
```bash
# Clear Expo Go cache
# Settings > Expo Go > Clear Cache

# Ensure both devices are on same WiFi
# Or use tunnel mode
```

### Web Browser Issues:
```bash
# Clear browser cache
# Or use incognito/private mode

# Try different browser (Chrome, Firefox, Edge)
```

---

## Solution 8: Check for Error Messages

**To see the actual error:**

1. **In the terminal where Expo is running**, check for error messages
2. **In Expo Go**, shake your device and select "Debug Remote JS"
3. **Check browser console** if running on web (F12 > Console)

Common error patterns:
- `Module not found` → Missing dependencies, run `npm install`
- `Network request failed` → Network connectivity issue, use tunnel mode
- `Cannot read property` → Code error, check the error stack trace
- `ENOENT: no such file` → Missing asset files

---

## Solution 9: Complete Fresh Start

If nothing else works, do a complete fresh install:

```bash
# 1. Delete all cache and build files
rm -rf node_modules
rm -rf .expo
rm -rf dist
rm -rf web-build
rm package-lock.json

# 2. Clear npm cache
npm cache clean --force

# 3. Reinstall everything
npm install

# 4. Start fresh
npm run reset
```

---

## Solution 10: Verify Setup

Run the verification script:

```bash
node scripts/verify-setup.js
```

This will check:
- ✅ Node.js version
- ✅ npm version
- ✅ Required files exist
- ✅ Dependencies installed
- ✅ Configuration files valid

---

## Network Troubleshooting Commands

### Check if server is accessible:
```bash
# Find your computer's IP address
# Windows:
ipconfig

# Mac/Linux:
ifconfig

# Test if port is open (from another device)
# Replace YOUR_IP with your computer's IP
telnet YOUR_IP 8081
```

### Test Expo connection:
```bash
# Start with verbose logging
npx expo start --verbose

# This will show connection details
```

---

## Still Not Working?

1. **Check Expo version compatibility:**
   ```bash
   npx expo --version
   # Should match the version in package.json (54.0.22)
   ```

2. **Update Expo CLI:**
   ```bash
   npm install -g expo-cli@latest
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Should be v18 or higher
   ```

4. **Try using Expo Dev Tools:**
   - Open browser to `http://localhost:19002`
   - Check for any errors shown there

5. **Check the actual error:**
   - Look at the terminal output when starting Expo
   - Check device logs in Expo Go (shake device > "Show Dev Menu" > "Debug Remote JS")

---

## Common Error Messages and Solutions

| Error Message | Solution |
|--------------|----------|
| `Metro bundler failed to start` | Run `npm run reset` |
| `Network request failed` | Use tunnel mode: `npm run start:tunnel` |
| `Module not found` | Run `npm install` |
| `ENOENT: no such file` | Check asset files exist |
| `Port 8081 already in use` | Kill process or use different port |
| `Cannot connect to Metro` | Check firewall, use tunnel mode |
| `Invalid hook call` | Clear cache and reinstall dependencies |

---

## Prevention Tips

1. **Always commit `package.json` and `package-lock.json`** to version control
2. **Create `.env.example`** file with required environment variables (without actual values)
3. **Document network requirements** in README
4. **Use tunnel mode** when devices are on different networks
5. **Keep dependencies updated** regularly

---

## Need More Help?

1. Check the error message in the terminal where `npm start` is running
2. Check browser console if running on web
3. Check Expo Go dev menu (shake device)
4. Review the [SETUP_GUIDE.md](./SETUP_GUIDE.md) for more details
5. Check Expo documentation: https://docs.expo.dev/

---

**Last Updated:** Based on current project configuration
**Tested With:** Expo SDK 54.0.22, React Native 0.81.5

