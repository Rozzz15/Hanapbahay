# How the Server Reads .env File

## Overview

The backend server uses the `dotenv` package to load environment variables from a `.env` file in the `server/` directory.

## How It Works

### Step 1: Server Starts

When you run `npm run start:server`, it executes `server/server.js`.

### Step 2: dotenv Loads .env File

In `server/server.js` (line 18):

```javascript
require('dotenv').config({ path: path.join(__dirname, '.env') });
```

This line:
- Uses `dotenv` package to load environment variables
- Looks for `.env` file in the `server/` directory (where `server.js` is located)
- Makes all variables available via `process.env.VARIABLE_NAME`

### Step 3: PayMongo Routes Read Variables

In `server/paymongo-routes.js` (lines 15-17):

```javascript
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY || '';
const PAYMONGO_BASE_URL = process.env.PAYMONGO_BASE_URL || 'https://api.paymongo.com/v1';
```

These lines:
- Read the environment variables that were loaded by dotenv
- Use `process.env.VARIABLE_NAME` to access them
- Provide fallback values (empty string or default URL) if not set

## File Structure

```
hanapbahay/
├── server/
│   ├── .env              ← MUST be here!
│   ├── server.js         ← Loads .env here (line 18)
│   └── paymongo-routes.js ← Uses process.env here
├── .env                  ← This is for Expo (frontend)
└── ...
```

**Important:** There are TWO `.env` files:
1. **`server/.env`** - For backend server (PayMongo keys)
2. **`.env`** (root) - For Expo frontend (API URL)

## Required .env File Location

The `.env` file **MUST** be in the `server/` directory:

```
server/
├── .env          ← HERE!
├── server.js
├── paymongo-routes.js
└── package.json
```

## .env File Format

Create `server/.env` with this format:

```env
# PayMongo API Keys
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here

# Server Configuration
PORT=3000

# Optional: Webhook Secret
# PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Important Rules

1. **No spaces around `=`**
   - ✅ `PAYMONGO_SECRET_KEY=sk_test_xxx`
   - ❌ `PAYMONGO_SECRET_KEY = sk_test_xxx`

2. **No quotes needed**
   - ✅ `PAYMONGO_SECRET_KEY=sk_test_xxx`
   - ❌ `PAYMONGO_SECRET_KEY="sk_test_xxx"`

3. **No comments on same line**
   - ✅ `PAYMONGO_SECRET_KEY=sk_test_xxx`
   - ❌ `PAYMONGO_SECRET_KEY=sk_test_xxx # my key`

4. **File must be in `server/` directory**
   - Not in root directory
   - Not in any subdirectory

## Verification

When the server starts, it checks if the keys are loaded:

```javascript
if (!process.env.PAYMONGO_SECRET_KEY) {
  console.warn('⚠️  PAYMONGO_SECRET_KEY not set. Paymongo features will not work.');
}
```

If you see this warning, the `.env` file is either:
- Missing
- In the wrong location
- Has incorrect format
- Server wasn't restarted after creating `.env`

## Testing if .env is Loaded

1. **Check server startup logs:**
   - If you see warnings, keys aren't loaded
   - If no warnings, keys are loaded

2. **Add temporary debug log:**
   ```javascript
   // In server.js, after line 18
   console.log('🔑 Secret Key loaded:', process.env.PAYMONGO_SECRET_KEY ? 'Yes' : 'No');
   ```

3. **Test API endpoint:**
   - Try creating a payment intent
   - If it works, keys are loaded correctly

## Troubleshooting

### Issue: "PAYMONGO_SECRET_KEY not set" warning

**Solutions:**
1. Check `.env` file exists in `server/` directory
2. Verify file format (no spaces, no quotes)
3. Restart server after creating/updating `.env`
4. Check file permissions (should be readable)

### Issue: Keys not loading

**Check:**
1. File location: Must be `server/.env`
2. File name: Must be exactly `.env` (not `.env.txt` or `env`)
3. File encoding: Should be UTF-8
4. Restart server: Changes only take effect after restart

### Issue: Wrong values being used

**Check:**
1. No duplicate variables in `.env`
2. No conflicting system environment variables
3. Server was restarted after changes

## Summary

1. **Create `server/.env`** with your PayMongo keys
2. **Server loads it** automatically when started (via dotenv)
3. **Routes access** via `process.env.VARIABLE_NAME`
4. **Restart server** after any `.env` changes

The server reads the `.env` file automatically - you don't need to do anything special, just make sure the file exists in the correct location with the correct format!

