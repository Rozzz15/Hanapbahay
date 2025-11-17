# Troubleshooting Network Request Failed

## You've Already Done:
- ✅ Created `.env` file with IP address
- ✅ Server is running
- ✅ IP address is configured

## But Still Getting "Network request failed"?

### Step 1: Verify Expo Picked Up the .env File

**Important:** Expo only reads `.env` files when it starts. If you created/updated `.env` AFTER starting Expo, it won't see the changes!

1. **Stop Expo completely** (Ctrl+C)
2. **Clear cache and restart:**
   ```bash
   npm run reset
   ```
   Or:
   ```bash
   npx expo start --clear
   ```

### Step 2: Check What URL the App is Using

The app should log the API URL when it starts. Look in your Expo console for:
```
🔗 PayMongo API URL: http://192.168.1.10:3000
```

If you see `http://localhost:3000` instead, the `.env` file isn't being read.

### Step 3: Verify Server is Accessible from Network

Test if your server is accessible from your mobile device:

1. **On your phone's browser**, open:
   ```
   http://192.168.1.10:3000/health
   ```

2. **Expected result:** You should see JSON:
   ```json
   {"status":"ok","timestamp":"...","service":"HanapBahay API Server"}
   ```

3. **If it doesn't work:**
   - Check Windows Firewall
   - Make sure phone and computer are on same WiFi
   - Try disabling firewall temporarily to test

### Step 4: Check Windows Firewall

The server might be blocked by Windows Firewall:

1. **Open Windows Defender Firewall**
2. **Click "Allow an app or feature"**
3. **Find Node.js** and make sure both "Private" and "Public" are checked
4. **Or add a rule:**
   - Click "Advanced settings"
   - "Inbound Rules" → "New Rule"
   - Port → TCP → 3000 → Allow

### Step 5: Verify .env File Location and Format

Make sure `.env` is in the **project root** (same folder as `package.json`):

```
hanapbahay/
├── .env              ← Must be here!
├── package.json
├── app/
└── server/
```

**Check the format:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

**Common mistakes:**
- ❌ `EXPO_PUBLIC_API_URL = http://192.168.1.10:3000` (spaces around =)
- ❌ `EXPO_PUBLIC_API_URL="http://192.168.1.10:3000"` (quotes not needed)
- ❌ Missing `EXPO_PUBLIC_` prefix

### Step 6: Try Hardcoding (Temporary Test)

To verify the issue is with environment variables, temporarily hardcode the URL:

1. Open `constants/index.ts`
2. Change:
   ```typescript
   export const API_BASE_URL = 'http://192.168.1.10:3000';
   ```
3. Restart Expo
4. If it works, the issue is with `.env` loading
5. **Remember to revert this change!**

### Step 7: Check Network Connection

1. **Verify same WiFi:**
   - Phone and computer must be on the same network
   - Check WiFi name matches

2. **Try ping test:**
   - On phone, try to access any website
   - Make sure phone has internet

3. **Check IP hasn't changed:**
   - Run `ipconfig` again
   - Make sure IP is still `192.168.1.10`
   - If it changed, update `.env` and restart Expo

### Step 8: Alternative - Use Expo Tunnel

If network issues persist, try tunnel mode:

```bash
npm run start:tunnel
```

This uses Expo's servers to tunnel the connection, bypassing local network issues.

## Quick Checklist

- [ ] Stopped and restarted Expo after creating `.env`
- [ ] Cleared Expo cache (`npm run reset`)
- [ ] Verified `.env` is in project root
- [ ] Checked `.env` format (no spaces, no quotes)
- [ ] Tested `http://192.168.1.10:3000/health` in phone browser
- [ ] Checked Windows Firewall settings
- [ ] Verified phone and computer on same WiFi
- [ ] Confirmed IP address hasn't changed

## Still Not Working?

1. **Check Expo console logs** - Look for the API URL being logged
2. **Check server logs** - See if requests are reaching the server
3. **Try tunnel mode** - `npm run start:tunnel`
4. **Test with emulator** - Use Android/iOS emulator which can use `localhost`

