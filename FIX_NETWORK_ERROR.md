# Fix "Network request failed" Error

## The Problem
Your app can't connect to the backend server because it's trying to use `localhost`, which doesn't work on physical mobile devices.

## The Solution

### Step 1: Create `.env` File

Create a `.env` file in the **project root** (same level as `package.json`):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

**Important:** Replace `192.168.1.10` with your actual IP address if different.

### Step 2: Find Your IP Address (if needed)

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Mac/Linux:**
```bash
ifconfig
```
Look for your network interface IP (usually starts with 192.168.x.x or 10.x.x.x)

### Step 3: Restart Expo

After creating/updating the `.env` file:

1. **Stop Expo** (press `Ctrl+C` in the terminal running Expo)
2. **Restart Expo:**
   ```bash
   npm start
   ```

### Step 4: Verify

1. Make sure backend server is running:
   ```bash
   npm run start:server
   ```

2. Test the connection - the error should be gone!

## Quick Checklist

- [ ] Created `.env` file in project root
- [ ] Set `EXPO_PUBLIC_API_URL=http://YOUR_IP:3000`
- [ ] Backend server is running (`npm run start:server`)
- [ ] Restarted Expo after creating `.env`
- [ ] Mobile device and computer are on same WiFi network

## Still Not Working?

1. **Check firewall:** Make sure Windows Firewall isn't blocking port 3000
2. **Check network:** Ensure mobile device and computer are on the same WiFi
3. **Try IP directly:** Open `http://192.168.1.10:3000/health` in mobile browser
4. **Check server logs:** Look for connection attempts in server terminal

## For Emulator/Simulator

If you're using an Android emulator or iOS simulator:
- Use `http://localhost:3000` (works in emulators)
- Or use `http://10.0.2.2:3000` for Android emulator specifically

