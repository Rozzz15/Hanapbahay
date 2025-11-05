# HanapBahay App - Setup Guide

This guide will help you set up and run the HanapBahay app on a new device or fresh installation.

## Prerequisites

### Required Software
1. **Node.js** (v18.0.0 or higher, tested with v22.19.0)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js, tested with v11.6.2)
   - Verify installation: `npm --version`

3. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/

### Optional but Recommended
- **Expo Go** app (for testing on mobile devices)
  - iOS: App Store
  - Android: Google Play Store

## Installation Steps

### 1. Clone or Extract the Project
```bash
# If using Git
git clone <repository-url>
cd hanapbahay

# Or extract the project folder to your desired location
```

### 2. Install Dependencies
```bash
npm install
```

**Expected output:** Should complete without errors. You may see warnings about vulnerabilities, which are usually safe to ignore for development.

### 3. Verify Installation
```bash
# Check if Expo CLI is available
npx expo --version

# Verify project configuration
npx expo config --type public
```

### 4. Start the Development Server
```bash
# Option 1: Standard start (recommended)
npm start

# Option 2: Using npx directly
npx expo start

# Option 3: Clear cache and start (if experiencing issues)
npm run reset
```

### 5. Run on Different Platforms
- **Web Browser**: Press `w` in the terminal or visit the URL shown
- **Android**: Press `a` in the terminal (requires Android emulator or device)
- **iOS**: Press `i` in the terminal (requires Mac with Xcode)
- **Expo Go**: Scan QR code with Expo Go app on your phone

## Common Issues and Solutions

### Issue 1: "npm install" Fails

**Symptoms:**
- Errors during package installation
- Missing dependencies warnings

**Solutions:**
1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npm install
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   # Windows
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   
   # Mac/Linux
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use specific Node version:**
   - If using Node v22+, ensure all dependencies are compatible
   - Consider using Node v18 LTS for maximum compatibility

### Issue 2: "npm start" or "expo start" Fails

**Symptoms:**
- Command not found errors
- Metro bundler fails to start

**Solutions:**
1. **Install Expo CLI globally (optional but helpful):**
   ```bash
   npm install -g expo-cli
   ```

2. **Use npx instead:**
   ```bash
   npx expo start
   ```

3. **Clear Expo cache:**
   ```bash
   npm run reset
   # or
   npx expo start --clear
   ```

4. **Check for port conflicts:**
   - Ensure port 8081 (default Metro port) is not in use
   - Use a different port: `npx expo start --port 8082`

### Issue 3: Metro Bundler Errors

**Symptoms:**
- "Cannot find module" errors
- Build failures
- Module resolution errors

**Solutions:**
1. **Reset Metro cache:**
   ```bash
   npm run reset
   ```

2. **Clear watchman (if installed):**
   ```bash
   watchman watch-del-all
   ```

3. **Check file paths:**
   - Ensure you're in the project root directory
   - Verify all files in `assets/` folder exist

### Issue 4: Environment Variables Missing

**Symptoms:**
- ⚠️ Warning: "Supabase credentials not configured, using mock client"
- Supabase connection errors
- API calls failing

**Solutions:**
1. **Create a `.env` file in the project root** (optional, app has fallbacks):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

2. **Get your Supabase credentials:**
   - Go to https://app.supabase.com
   - Select your project (or create a new one)
   - Go to Settings → API
   - Copy the "Project URL" (this is your `EXPO_PUBLIC_SUPABASE_URL`)
   - Copy the "anon public" key (this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

3. **Note:** The app will work without these variables (uses mock clients for development), but full functionality requires valid Supabase credentials. The warning is informational and won't break the app.

### Issue 5: Windows-Specific Issues

**Symptoms:**
- Path length errors
- Permission errors
- Script execution blocked

**Solutions:**
1. **Enable long paths in Windows:**
   - Run PowerShell as Administrator
   - Execute: `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`

2. **Run PowerShell as Administrator** for npm install commands

3. **Disable antivirus temporarily** if it's blocking npm/node_modules

### Issue 6: Port Already in Use

**Symptoms:**
- "EADDRINUSE: address already in use" error

**Solutions:**
1. **Find and kill the process using the port:**
   ```bash
   # Windows
   netstat -ano | findstr :8081
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:8081 | xargs kill -9
   ```

2. **Use a different port:**
   ```bash
   npx expo start --port 8082
   ```

### Issue 7: Missing Assets

**Symptoms:**
- Images not loading
- Fonts not loading

**Solutions:**
1. **Verify all required assets exist:**
   - `assets/images/icon.png`
   - `assets/images/splash-icon.png`
   - `assets/images/favicon.png`
   - `assets/fonts/SpaceMono-Regular.ttf`

2. **Clear cache and rebuild:**
   ```bash
   npm run reset
   ```

## Verification Checklist

Before reporting issues, verify:

- [ ] Node.js is installed (v18+)
- [ ] npm is installed
- [ ] All dependencies installed (`npm install` completed successfully)
- [ ] You're in the project root directory
- [ ] Required asset files exist
- [ ] No port conflicts (8081 is available)
- [ ] Firewall/antivirus isn't blocking Node.js
- [ ] Internet connection is active (for downloading packages)

## Project Structure

```
hanapbahay/
├── app/                 # Main application code (Expo Router)
├── components/          # Reusable React components
├── utils/               # Utility functions
├── assets/              # Images, fonts, etc.
├── api/                 # API functions
├── context/             # React Context providers
├── constants/           # App constants
├── types/               # TypeScript type definitions
├── package.json         # Dependencies and scripts
├── app.json            # Expo configuration
└── tsconfig.json       # TypeScript configuration
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run reset` - Clear cache and restart
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS (Mac only)
- `npm run web` - Run in web browser
- `npm test` - Run tests
- `npm run lint` - Check code quality

## Getting Help

If you continue to experience issues:

1. **Check the error message** - It often contains helpful information
2. **Search for similar issues** on:
   - Expo documentation: https://docs.expo.dev/
   - Stack Overflow
   - GitHub Issues
3. **Verify your environment:**
   ```bash
   node --version
   npm --version
   npx expo --version
   ```
4. **Try a clean install:**
   ```bash
   # Delete node_modules and lock file
   rm -rf node_modules package-lock.json
   # Clear npm cache
   npm cache clean --force
   # Reinstall
   npm install
   ```

## Additional Notes

- The app uses Expo SDK 54.0.22
- React Native version: 0.81.5
- React version: 19.1.0
- TypeScript is configured for strict mode
- The app supports iOS, Android, and Web platforms

## Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm start

# 3. Press 'w' for web, 'a' for Android, 'i' for iOS
```

---

**Last Updated:** Based on current project configuration
**Tested With:** Node v22.19.0, npm v11.6.2, Expo CLI 54.0.15

