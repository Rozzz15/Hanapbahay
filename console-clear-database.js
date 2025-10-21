/**
 * COMPLETE STORAGE CLEANER - Browser Console Script
 * 
 * USAGE:
 * 1. Open your app in browser (http://localhost:8081)
 * 2. Open Developer Console (F12 or Right-click > Inspect)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 
 * ⚠️ WARNING: This will clear ALL stored data (localStorage, sessionStorage, cookies, cache)
 */

(function() {
  console.log('\n╔═════════════════════════════════════════════════════╗');
  console.log('║  💥 COMPLETE STORAGE CLEANER                       ║');
  console.log('║  ⚠️  DELETES ALL DATA ON PORT 8081                 ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  // Check if we're in a browser
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.error('❌ This script must be run in a browser console!');
    return;
  }

  console.log('📊 Current Storage Status:');
  console.log(`   localStorage items: ${localStorage.length}`);
  console.log(`   sessionStorage items: ${sessionStorage.length}`);
  
  // Count and list all items
  const allKeys = [];
  
  console.log('\n🔍 All localStorage items:\n');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    allKeys.push(key);
    
    // Try to parse and show size
    const value = localStorage.getItem(key);
    const size = value ? (value.length / 1024).toFixed(2) : '0';
    
    if (key.startsWith('hb_db_')) {
      const data = JSON.parse(value || '{}');
      const count = Object.keys(data).length;
      console.log(`   📂 ${key} (${count} records, ${size} KB)`);
    } else {
      console.log(`   📦 ${key} (${size} KB)`);
    }
  }

  console.log('\n🔍 All sessionStorage items:\n');
  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    sessionKeys.push(key);
    const value = sessionStorage.getItem(key);
    const size = value ? (value.length / 1024).toFixed(2) : '0';
    console.log(`   🔐 ${key} (${size} KB)`);
  }

  const totalItems = allKeys.length + sessionKeys.length;

  if (totalItems === 0) {
    console.log('\n✅ Storage is already empty!');
    return;
  }

  // Confirm deletion
  console.log('\n⚠️  WARNING: ABOUT TO DELETE ALL STORED DATA!');
  console.log(`   - ${allKeys.length} localStorage items`);
  console.log(`   - ${sessionKeys.length} sessionStorage items`);
  console.log('   - All cookies for localhost:8081');
  console.log('   - Service worker cache (if any)\n');

  console.log('💥 Deleting in 3 seconds... (refresh page to cancel)\n');

  setTimeout(() => {
    console.log('🗑️  Starting deletion process...\n');

    // Clear localStorage
    console.log('📂 Clearing localStorage...');
    const localStorageCount = localStorage.length;
    localStorage.clear();
    console.log(`   ✅ Deleted ${localStorageCount} items from localStorage\n`);

    // Clear sessionStorage
    console.log('🔐 Clearing sessionStorage...');
    const sessionStorageCount = sessionStorage.length;
    sessionStorage.clear();
    console.log(`   ✅ Deleted ${sessionStorageCount} items from sessionStorage\n`);

    // Clear cookies
    console.log('🍪 Clearing cookies...');
    const cookies = document.cookie.split(';');
    let cookieCount = 0;
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        cookieCount++;
      }
    });
    console.log(`   ✅ Deleted ${cookieCount} cookies\n`);

    // Clear cache if available
    if ('caches' in window) {
      console.log('💾 Clearing cache...');
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      }).then(() => {
        console.log('   ✅ Cache cleared\n');
      });
    }

    // Clear IndexedDB if available
    if ('indexedDB' in window) {
      console.log('🗄️  Clearing IndexedDB...');
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
            console.log(`   ✅ Deleted database: ${db.name}`);
          }
        });
      }).catch(() => {
        console.log('   ⚠️  IndexedDB clearing not fully supported');
      });
    }

    console.log('\n╔═════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL STORAGE CLEARED SUCCESSFULLY!              ║');
    console.log('╚═════════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`   localStorage: ${localStorageCount} items deleted`);
    console.log(`   sessionStorage: ${sessionStorageCount} items deleted`);
    console.log(`   Cookies: ${cookieCount} items deleted`);
    console.log(`   Cache: Cleared`);
    console.log('\n💡 Refreshing page in 2 seconds...\n');

    // Auto-refresh after 2 seconds
    setTimeout(() => {
      console.log('🔄 Refreshing...\n');
      location.reload();
    }, 2000);

  }, 3000);

})();

