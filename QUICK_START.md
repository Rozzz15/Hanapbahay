# Quick Start Guide - HanapBahay App

## ⚡ Fastest Way to Get Started

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Verify Setup
```bash
node scripts/verify-setup.js
```

### Step 3: Start the App
```bash
npm start
```

That's it! The Expo development server will start and you can:
- Press **`w`** to open in web browser
- Press **`a`** to run on Android
- Press **`i`** to run on iOS (Mac only)
- Scan the QR code with Expo Go app

## 🐛 Having Issues?

### "Something Went Wrong" Error on Another Device?

This is a common issue! See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for detailed solutions.

**Quick fixes:**
```bash
# 1. Install dependencies on the new device
npm install

# 2. Use tunnel mode for network connectivity
npm run start:tunnel

# 3. Clear cache and restart
npm run reset
```

### If `npm install` fails:
```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### If `npm start` fails:
```bash
# Clear Expo cache
npm run reset

# Or use npx directly
npx expo start --clear
```

### If port 8081 is in use:
```bash
# Use different port
npx expo start --port 8082
```

## 📖 Need More Help?

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for comprehensive troubleshooting.

## ✅ Requirements Checklist

- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] In project root directory
- [ ] Internet connection (for first install)

## 🎯 Common Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start development server |
| `npm run reset` | Clear cache and restart |
| `npm run web` | Open in web browser |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS (Mac only) |
| `node scripts/verify-setup.js` | Verify setup is correct |

---

**Note:** On Windows, if you get "command not found" errors, try using `npx expo start` instead of `npm start`.

