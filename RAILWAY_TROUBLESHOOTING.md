# 🔧 Railway Build Errors - Troubleshooting Guide

This guide will help you fix common Railway deployment errors.

## 🚨 Common Railway Build Errors & Solutions

### Error 1: "Cannot find module" or "Module not found"

**Symptoms:**
```
Error: Cannot find module 'express'
Error: Cannot find module './paymongo-routes'
```

**Causes:**
- Dependencies not installed
- Root directory not set correctly
- Missing package.json in server directory

**Solutions:**

1. **Verify Root Directory is Set:**
   - Go to Railway Dashboard → Your Service → Settings
   - Check **Root Directory** is set to: `server`
   - Save if changed

2. **Verify package.json exists:**
   - Make sure `server/package.json` exists
   - Should contain all dependencies (express, cors, dotenv)

3. **Add Build Command:**
   - Go to Settings → Deploy
   - **Build Command:** `npm install`
   - Save and redeploy

---

### Error 2: "Cannot find package.json"

**Symptoms:**
```
Error: Cannot find package.json
npm ERR! code ENOENT
```

**Causes:**
- Root directory pointing to wrong location
- package.json not in server directory

**Solutions:**

1. **Check File Structure:**
   Your repo should have:
   ```
   hanapbahay/
   ├── server/
   │   ├── package.json  ← Must be here!
   │   ├── server.js
   │   └── paymongo-routes.js
   └── ...
   ```

2. **Set Root Directory:**
   - Railway Dashboard → Settings
   - **Root Directory:** `server`
   - Save

3. **Verify in Railway:**
   - Check **Source** tab shows files from `server/` directory

---

### Error 3: "Port already in use" or Port Issues

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causes:**
- Multiple instances trying to use same port
- PORT environment variable conflict

**Solutions:**

1. **Railway Auto-Manages Port:**
   - Railway automatically sets `PORT` environment variable
   - Your code should use: `const PORT = process.env.PORT || 3000;`
   - ✅ Your code already does this correctly!

2. **Check Environment Variables:**
   - Don't hardcode PORT=3000
   - Let Railway set it automatically
   - Remove PORT from environment variables (Railway sets it)

3. **Server Binding:**
   Your server.js should listen on:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => {
     // Railway needs to bind to 0.0.0.0, not localhost
   });
   ```

**Fix needed:** Update server.js to bind to all interfaces.

---

### Error 4: "Start command failed" or Process Exits

**Symptoms:**
```
Build succeeded but service won't start
Process exited with code 1
```

**Causes:**
- Wrong start command
- Server crashes immediately
- Missing environment variables

**Solutions:**

1. **Check Start Command:**
   - Railway Dashboard → Settings → Deploy
   - **Start Command:** Should be `npm start`
   - Or: `node server.js`

2. **Check Logs:**
   - Go to **Deployments** tab
   - Click on latest deployment
   - Check **Logs** tab for error messages

3. **Test Locally First:**
   ```bash
   cd server
   npm install
   npm start
   ```
   Should work locally before deploying

---

### Error 5: Environment Variables Missing

**Symptoms:**
```
⚠️ PAYMONGO_SECRET_KEY not set
Service starts but API calls fail
```

**Causes:**
- Environment variables not set in Railway
- Variables not accessible

**Solutions:**

1. **Set Environment Variables:**
   - Railway Dashboard → Your Service → Variables
   - Add:
     - `PAYMONGO_SECRET_KEY`
     - `PAYMONGO_PUBLIC_KEY`
     - (Don't set PORT - Railway handles it)

2. **Redeploy After Adding Variables:**
   - Railway auto-redeploys when you add variables
   - Wait for deployment to complete

---

### Error 6: "Build timeout" or Build Takes Too Long

**Symptoms:**
```
Build timeout after 10 minutes
Build stuck on npm install
```

**Causes:**
- Slow npm install
- Large dependencies
- Network issues

**Solutions:**

1. **Optimize package.json:**
   - Remove unnecessary dependencies
   - Use exact versions if needed

2. **Add .npmrc file:**
   Create `server/.npmrc`:
   ```
   registry=https://registry.npmjs.org/
   progress=false
   ```

3. **Use npm ci instead:**
   - Railway Settings → Deploy
   - **Build Command:** `npm ci --production`
   - (Requires package-lock.json)

---

### Error 7: "File not found" or Path Errors

**Symptoms:**
```
Error: Cannot find module './paymongo-routes'
Error: ENOENT: no such file or directory
```

**Causes:**
- Files not in server directory
- Wrong file paths
- Missing files in repository

**Solutions:**

1. **Verify All Files Are Committed:**
   ```bash
   git add server/
   git commit -m "Add server files"
   git push
   ```

2. **Check File Structure:**
   All these should exist in `server/`:
   - ✅ package.json
   - ✅ server.js
   - ✅ paymongo-routes.js
   - ✅ .env (optional - use Railway variables instead)

3. **Check Relative Paths:**
   In server.js, paths should be relative:
   ```javascript
   require('./paymongo-routes')  // ✅ Correct
   require('../paymongo-routes') // ❌ Wrong
   ```

---

### Error 8: "Health check failed"

**Symptoms:**
```
Service builds but health check fails
Service marked as unhealthy
```

**Causes:**
- Server not binding to correct address
- Wrong port
- Health endpoint not responding

**Solutions:**

1. **Update Server Binding:**
   Your server needs to bind to `0.0.0.0` (all interfaces):

   ```javascript
   // ❌ Current (won't work on Railway)
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });

   // ✅ Fixed (works on Railway)
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

2. **Verify Health Endpoint:**
   - Should respond at `/health`
   - Your code already has this ✅

3. **Check Railway Health Check:**
   - Railway Dashboard → Settings → Healthcheck
   - Should be: `/health`
   - Or leave empty (Railway auto-detects)

---

## 🔧 Quick Fix Checklist

Run through this checklist:

- [ ] Root Directory set to `server`
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Environment variables set (PAYMONGO_SECRET_KEY, PAYMONGO_PUBLIC_KEY)
- [ ] Server binds to `0.0.0.0` (not localhost)
- [ ] All files committed and pushed to GitHub
- [ ] package.json exists in server/ directory
- [ ] Dependencies listed in package.json

---

## 🛠️ Required Server.js Fix

**IMPORTANT:** Your server needs one fix for Railway:

**Current code (line 107):**
```javascript
app.listen(PORT, () => {
  console.log(`🚀 HanapBahay API Server running on port ${PORT}`);
  ...
});
```

**Fixed for Railway:**
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HanapBahay API Server running on port ${PORT}`);
  ...
});
```

Railway needs to bind to `0.0.0.0` to accept external connections!

---

## 📋 Railway Configuration Checklist

### Settings Tab:
- [ ] **Root Directory:** `server`
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`

### Variables Tab:
- [ ] `PAYMONGO_SECRET_KEY` = your secret key
- [ ] `PAYMONGO_PUBLIC_KEY` = your public key
- [ ] ❌ **DON'T set PORT** (Railway sets this automatically)

### Networking Tab:
- [ ] Generate domain (get your URL)
- [ ] Healthcheck: `/health` (optional, auto-detected)

---

## 🔍 How to Check Build Logs

1. Go to Railway Dashboard
2. Click on your service
3. Click **Deployments** tab
4. Click on latest deployment
5. Check **Logs** tab
6. Look for error messages (usually in red)

**Common log locations:**
- Build logs: Show during deployment
- Runtime logs: Show after service starts
- Check both for errors!

---

## 🆘 Still Having Issues?

### Share These Details:

1. **Error message** (copy from Railway logs)
2. **Build logs** (from Deployments → Logs)
3. **Railway configuration:**
   - Root Directory setting
   - Build Command
   - Start Command
   - Environment variables (names only, not values)

### Check These:

1. **Local test:**
   ```bash
   cd server
   npm install
   npm start
   ```
   Should work locally!

2. **Verify files:**
   ```bash
   ls server/
   # Should show: package.json, server.js, paymongo-routes.js
   ```

3. **Check git status:**
   ```bash
   git status
   # Make sure server/ files are committed
   ```

---

## ✅ Most Common Fix

**90% of Railway errors are fixed by:**

1. Setting **Root Directory** to `server`
2. Binding server to `0.0.0.0` instead of default
3. Setting environment variables

Try these three things first!

---

**Need more help?** Share your Railway error logs and I'll help diagnose! 🚀




