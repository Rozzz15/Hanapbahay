# ⚡ Railway Build Errors - Quick Fix Guide

## 🚨 Most Common Issues & Quick Fixes

### Issue 1: Server Won't Start / Connection Refused

**Quick Fix:** Your server needs to bind to `0.0.0.0`

I've already fixed this in `server/server.js`! ✅

**What changed:**
```javascript
// Before (doesn't work on Railway)
app.listen(PORT, () => { ... });

// After (works on Railway)
app.listen(PORT, '0.0.0.0', () => { ... });
```

**Action:** Commit and push this fix:
```bash
git add server/server.js
git commit -m "Fix: Bind server to 0.0.0.0 for Railway"
git push
```

---

### Issue 2: "Cannot find module" Errors

**Check these:**

1. **Root Directory Must Be Set:**
   - Railway Dashboard → Your Service → Settings
   - **Root Directory:** `server`
   - Click Save

2. **Build Command:**
   - Settings → Deploy
   - **Build Command:** `npm install`
   - Click Save

3. **Verify package.json exists:**
   ```bash
   # Check locally
   ls server/package.json
   # Should show the file
   ```

---

### Issue 3: Wrong Start Command

**Fix:**

1. Railway Dashboard → Your Service → Settings → Deploy
2. **Start Command:** `npm start`
3. Click Save

---

### Issue 4: Missing Environment Variables

**Fix:**

1. Railway Dashboard → Your Service → Variables
2. Add these:
   - `PAYMONGO_SECRET_KEY` = your key
   - `PAYMONGO_PUBLIC_KEY` = your key
3. **Don't set PORT** - Railway handles this automatically

---

## 🔧 Step-by-Step Fix

### Step 1: Fix Server Binding (Already Done! ✅)

The server.js file has been updated. Just commit and push:

```bash
git add server/server.js
git commit -m "Fix server binding for Railway deployment"
git push
```

### Step 2: Check Railway Configuration

1. Go to Railway Dashboard
2. Click your service
3. Go to **Settings** tab
4. Verify:
   - ✅ **Root Directory:** `server`
   - ✅ **Build Command:** `npm install` (or leave empty)
   - ✅ **Start Command:** `npm start`

### Step 3: Check Environment Variables

1. Go to **Variables** tab
2. Make sure you have:
   - ✅ `PAYMONGO_SECRET_KEY`
   - ✅ `PAYMONGO_PUBLIC_KEY`
   - ❌ **Don't add PORT** (Railway sets it)

### Step 4: Redeploy

After pushing the server.js fix:
1. Railway will auto-redeploy
2. Watch the **Deployments** tab
3. Check **Logs** for errors

---

## 📋 Common Error Messages & Fixes

| Error Message | Quick Fix |
|--------------|-----------|
| `Cannot find module` | Set Root Directory to `server` |
| `Connection refused` | Server binding fix (already done!) |
| `Port already in use` | Remove PORT from env vars |
| `Start command failed` | Set Start Command to `npm start` |
| `Module not found` | Check Root Directory is `server` |
| `Build timeout` | Normal for first build, wait longer |

---

## 🆘 Still Not Working?

**Share these details:**

1. Copy the error message from Railway logs
2. Check these settings:
   - Root Directory value
   - Build Command
   - Start Command
3. Verify files are committed:
   ```bash
   git status
   # Should show no uncommitted changes in server/
   ```

---

## ✅ Checklist

Before deploying, make sure:

- [ ] Root Directory = `server`
- [ ] Start Command = `npm start`
- [ ] Server.js binds to `0.0.0.0` (already fixed!)
- [ ] Environment variables set
- [ ] All files committed and pushed
- [ ] package.json exists in server/

---

**The server.js fix should solve 90% of Railway issues!** Just push the changes and redeploy. 🚀




