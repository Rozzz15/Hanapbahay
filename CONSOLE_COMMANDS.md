# 🖥️ Browser Console Commands for HanapBahay

## Quick Commands to Clear ALL Data on Web (localhost:8081)

---

## 💥 Option 1: NUCLEAR CLEAR (Delete Everything)

**Copy and paste this into your browser console:**

```javascript
(() => { console.log('💥 Clearing ALL storage...'); const lc = localStorage.length; const sc = sessionStorage.length; localStorage.clear(); sessionStorage.clear(); document.cookie.split(';').forEach(c => { const n = c.split('=')[0].trim(); document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; }); console.log(`✅ Cleared ${lc} localStorage items`); console.log(`✅ Cleared ${sc} sessionStorage items`); console.log('🎉 All storage cleared!'); setTimeout(() => location.reload(), 1000); })();
```

**What it does:**
- 💥 Deletes ALL localStorage items
- 💥 Deletes ALL sessionStorage items
- 💥 Deletes ALL cookies
- 🔄 Auto-refreshes the page
- ⚡ Runs instantly (1 sec delay before refresh)

---

## 📊 Option 2: With Preview (Shows what will be deleted)

**Copy and paste this into your browser console:**

```javascript
(function() {
  console.log('\n💥 COMPLETE STORAGE CLEANER\n');
  console.log('📊 Current storage:');
  console.log(`   localStorage: ${localStorage.length} items`);
  console.log(`   sessionStorage: ${sessionStorage.length} items`);
  
  if (localStorage.length === 0 && sessionStorage.length === 0) {
    console.log('\n✅ Storage is already empty!');
    return;
  }
  
  console.log('\n🔍 All items to be deleted:\n');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`   📦 ${key}`);
  }
  
  console.log('\n⚠️  WARNING: About to delete ALL stored data!');
  console.log('💥 Deleting in 3 seconds... (refresh to cancel)\n');
  
  setTimeout(() => {
    const lc = localStorage.length;
    const sc = sessionStorage.length;
    localStorage.clear();
    sessionStorage.clear();
    console.log(`✅ Cleared ${lc} localStorage items`);
    console.log(`✅ Cleared ${sc} sessionStorage items`);
    console.log('🎉 All storage cleared!');
    console.log('🔄 Refreshing in 1 second...\n');
    setTimeout(() => location.reload(), 1000);
  }, 3000);
})();
```

**What it does:**
- 📊 Shows all items that will be deleted
- ⏱️ Waits 3 seconds (you can refresh to cancel)
- 💥 Deletes ALL localStorage and sessionStorage
- 🔄 Auto-refreshes after clearing

---

## 🔍 Option 3: View All Data (No Delete)

**Just view what's stored without deleting:**

```javascript
(function() {
  console.log('\n📊 ALL STORED DATA\n');
  console.log(`Total localStorage items: ${localStorage.length}`);
  console.log(`Total sessionStorage items: ${sessionStorage.length}\n`);
  
  console.log('📂 localStorage Contents:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    const size = (value.length / 1024).toFixed(2);
    console.log(`\n   ${key} (${size} KB):`);
    try {
      const parsed = JSON.parse(value);
      console.log(parsed);
    } catch {
      console.log(value.substring(0, 100) + '...');
    }
  }
  
  console.log('\n🔐 sessionStorage Contents:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    console.log(`\n   ${key}:`);
    console.log(value);
  }
  
  console.log('\n✅ Data inspection complete!\n');
})();
```

**What it does:**
- 👀 Shows ALL stored data
- 📊 Shows sizes and contents
- ❌ Does NOT delete anything

---

## 📋 How to Use

### Step 1: Open Developer Console
1. Open your app in browser: `http://localhost:8081`
2. Press `F12` OR right-click anywhere and select "Inspect"
3. Click on the **Console** tab

### Step 2: Paste Command
1. Copy one of the commands above
2. Paste into the console
3. Press `Enter`

### Step 3: Wait for Completion
- **Option 1:** Clears immediately and refreshes
- **Option 2:** Shows preview, waits 3 seconds, then clears
- **Option 3:** Just displays data, no action

---

## ⚡ Quick Reference

| Command | What It Does | Auto-Refresh |
|---------|--------------|--------------|
| **Option 1** | Delete ALL storage instantly | ✅ Yes (1 sec) |
| **Option 2** | Delete ALL with 3 sec preview | ✅ Yes (after clear) |
| **Option 3** | View only, no deletion | ❌ No |

---

## 🛡️ Safety Notes

- ⚠️ **These commands delete EVERYTHING on localhost:8081**
- 💥 Includes ALL app data, not just HanapBahay
- ❌ Cannot undo after deletion
- ✅ Can cancel Option 2 by refreshing within 3 seconds

---

## 💡 Common Use Cases

**Complete fresh start:**
```javascript
localStorage.clear(); sessionStorage.clear(); location.reload();
```

**Force logout only:**
```javascript
localStorage.removeItem('auth_user'); location.href = '/login';
```

**Check storage size:**
```javascript
let total = 0; for (let i = 0; i < localStorage.length; i++) { total += localStorage.getItem(localStorage.key(i)).length; } console.log(`Total storage: ${(total / 1024).toFixed(2)} KB`);
```

---

## 🔧 Troubleshooting

**Q: Command doesn't work?**
- Make sure you're on `localhost:8081`
- Check you're in the Console tab (not Elements, Network, etc.)
- Try refreshing the page first

**Q: Data comes back after refresh?**
- The app may recreate default users/data on startup
- Check `utils/mock-auth.ts` for `createDefaultUsers()`
- This is normal behavior for development

**Q: Need to clear browser cache too?**
- Press `Ctrl + Shift + Delete` (Windows)
- Or `Cmd + Shift + Delete` (Mac)
- Select "Cached images and files"

---

**Last Updated:** October 21, 2025  
**Tested On:** Chrome, Firefox, Edge, Safari

