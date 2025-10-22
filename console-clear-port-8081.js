// Console-friendly script to clear port 8081
// Copy and paste this entire code into your browser console or Node.js console

(async function clearPort8081() {
  console.log('🧹 Clearing all stored data on port 8081...\n');
  
  // Function to kill processes on port 8081 (Node.js only)
  function killProcessesOnPort(port) {
    const { execSync } = require('child_process');
    try {
      console.log(`🔍 Finding processes on port ${port}...`);
      
      if (process.platform === 'win32') {
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        if (result.trim()) {
          const lines = result.trim().split('\n');
          const pids = new Set();
          
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[4];
              if (pid && pid !== '0') pids.add(pid);
            }
          });
          
          pids.forEach(pid => {
            try {
              console.log(`💀 Killing process ${pid}...`);
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              console.log(`✅ Process ${pid} killed`);
            } catch (error) {
              console.log(`⚠️  Could not kill process ${pid}`);
            }
          });
        } else {
          console.log(`✅ No processes found on port ${port}`);
        }
      } else {
        const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
        if (result.trim()) {
          const pids = result.trim().split('\n');
          pids.forEach(pid => {
            try {
              console.log(`💀 Killing process ${pid}...`);
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
              console.log(`✅ Process ${pid} killed`);
            } catch (error) {
              console.log(`⚠️  Could not kill process ${pid}`);
            }
          });
        } else {
          console.log(`✅ No processes found on port ${port}`);
        }
      }
    } catch (error) {
      console.log(`✅ No processes found on port ${port}`);
    }
  }
  
  // Function to clear caches
  function clearCaches() {
    const { execSync } = require('child_process');
    console.log('🗑️  Clearing caches...');
    
    // Clear npm cache
    try {
      execSync('npm cache clean --force', { stdio: 'inherit' });
      console.log('✅ NPM cache cleared');
    } catch (error) {
      console.log('⚠️  Could not clear NPM cache');
    }
    
    // Clear yarn cache
    try {
      execSync('yarn cache clean', { stdio: 'inherit' });
      console.log('✅ Yarn cache cleared');
    } catch (error) {
      console.log('ℹ️  Yarn not found');
    }
    
    // Clear Expo cache
    try {
      execSync('npx expo r -c', { stdio: 'inherit' });
      console.log('✅ Expo cache cleared');
    } catch (error) {
      console.log('⚠️  Could not clear Expo cache');
    }
  }
  
  // Function to clear temp files
  function clearTempFiles() {
    const fs = require('fs');
    const path = require('path');
    console.log('🗂️  Clearing temporary files...');
    
    const tempDirs = [
      'node_modules/.cache',
      '.expo',
      'android/app/build',
      'ios/build',
      'web-build',
      'dist',
      '.next',
      '.metro'
    ];
    
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`✅ Cleared ${dir}`);
        } catch (error) {
          console.log(`⚠️  Could not clear ${dir}`);
        }
      }
    });
  }
  
  // Browser-specific clearing (if in browser)
  function clearBrowserData() {
    console.log('🌐 Clearing browser data...');
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
      console.log('✅ localStorage cleared');
    }
    
    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');
    }
    
    // Clear IndexedDB
    if (typeof indexedDB !== 'undefined') {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          indexedDB.deleteDatabase(db.name);
        });
        console.log('✅ IndexedDB cleared');
      }).catch(() => {
        console.log('⚠️  Could not clear IndexedDB');
      });
    }
    
    // Clear cookies (if possible)
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      console.log('✅ Cookies cleared');
    }
  }
  
  try {
    // Check if we're in Node.js environment
    if (typeof require !== 'undefined') {
      // Node.js environment
      killProcessesOnPort(8081);
      clearCaches();
      clearTempFiles();
    } else {
      // Browser environment
      clearBrowserData();
    }
    
    console.log('\n🎉 Port 8081 cleanup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm start');
    console.log('2. Or run: expo start --clear');
    console.log('3. Or run: npx react-native start --reset-cache');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
})();
