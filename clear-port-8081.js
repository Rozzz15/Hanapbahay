#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing all stored data on port 8081...\n');

// Function to kill processes on port 8081
function killProcessesOnPort(port) {
  try {
    console.log(`🔍 Finding processes on port ${port}...`);
    
    // For Windows
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      if (result.trim()) {
        const lines = result.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              pids.add(pid);
            }
          }
        });
        
        pids.forEach(pid => {
          try {
            console.log(`💀 Killing process ${pid}...`);
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`✅ Process ${pid} killed`);
          } catch (error) {
            console.log(`⚠️  Could not kill process ${pid}: ${error.message}`);
          }
        });
      } else {
        console.log(`✅ No processes found on port ${port}`);
      }
    } else {
      // For macOS/Linux
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      if (result.trim()) {
        const pids = result.trim().split('\n');
        pids.forEach(pid => {
          try {
            console.log(`💀 Killing process ${pid}...`);
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`✅ Process ${pid} killed`);
          } catch (error) {
            console.log(`⚠️  Could not kill process ${pid}: ${error.message}`);
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

// Function to clear Metro cache
function clearMetroCache() {
  try {
    console.log('🗑️  Clearing Metro bundler cache...');
    
    // Clear npm cache
    try {
      execSync('npm cache clean --force', { stdio: 'inherit' });
      console.log('✅ NPM cache cleared');
    } catch (error) {
      console.log('⚠️  Could not clear NPM cache:', error.message);
    }
    
    // Clear yarn cache if it exists
    try {
      execSync('yarn cache clean', { stdio: 'inherit' });
      console.log('✅ Yarn cache cleared');
    } catch (error) {
      console.log('ℹ️  Yarn not found or cache already clean');
    }
    
    // Clear Expo cache
    try {
      execSync('npx expo r -c', { stdio: 'inherit' });
      console.log('✅ Expo cache cleared');
    } catch (error) {
      console.log('⚠️  Could not clear Expo cache:', error.message);
    }
    
  } catch (error) {
    console.log('⚠️  Error clearing Metro cache:', error.message);
  }
}

// Function to clear temporary files
function clearTempFiles() {
  try {
    console.log('🗂️  Clearing temporary files...');
    
    const tempDirs = [
      path.join(process.cwd(), 'node_modules/.cache'),
      path.join(process.cwd(), '.expo'),
      path.join(process.cwd(), 'android/app/build'),
      path.join(process.cwd(), 'ios/build'),
      path.join(process.cwd(), 'web-build'),
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd(), '.next'),
      path.join(process.cwd(), '.metro'),
    ];
    
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`✅ Cleared ${dir}`);
        } catch (error) {
          console.log(`⚠️  Could not clear ${dir}: ${error.message}`);
        }
      }
    });
    
    // Clear system temp directories
    const systemTempDirs = [
      path.join(require('os').tmpdir(), 'metro-*'),
      path.join(require('os').tmpdir(), 'expo-*'),
      path.join(require('os').tmpdir(), 'react-native-*'),
    ];
    
    systemTempDirs.forEach(pattern => {
      try {
        const glob = require('glob');
        const files = glob.sync(pattern);
        files.forEach(file => {
          try {
            fs.rmSync(file, { recursive: true, force: true });
            console.log(`✅ Cleared ${file}`);
          } catch (error) {
            console.log(`⚠️  Could not clear ${file}: ${error.message}`);
          }
        });
      } catch (error) {
        // glob might not be available, skip
      }
    });
    
  } catch (error) {
    console.log('⚠️  Error clearing temporary files:', error.message);
  }
}

// Function to clear browser cache (if running web)
function clearBrowserCache() {
  try {
    console.log('🌐 Clearing browser cache...');
    
    // Clear Chrome cache (Windows)
    if (process.platform === 'win32') {
      const chromeCachePath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Cache');
      if (fs.existsSync(chromeCachePath)) {
        try {
          fs.rmSync(chromeCachePath, { recursive: true, force: true });
          console.log('✅ Chrome cache cleared');
        } catch (error) {
          console.log('⚠️  Could not clear Chrome cache:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.log('⚠️  Error clearing browser cache:', error.message);
  }
}

// Function to reset network connections
function resetNetwork() {
  try {
    console.log('🌐 Resetting network connections...');
    
    if (process.platform === 'win32') {
      try {
        execSync('netsh winsock reset', { stdio: 'inherit' });
        console.log('✅ Network stack reset');
      } catch (error) {
        console.log('⚠️  Could not reset network stack:', error.message);
      }
    }
    
  } catch (error) {
    console.log('⚠️  Error resetting network:', error.message);
  }
}

// Main execution
async function main() {
  try {
    // Step 1: Kill processes on port 8081
    killProcessesOnPort(8081);
    
    // Step 2: Clear Metro cache
    clearMetroCache();
    
    // Step 3: Clear temporary files
    clearTempFiles();
    
    // Step 4: Clear browser cache
    clearBrowserCache();
    
    // Step 5: Reset network (optional)
    // resetNetwork();
    
    console.log('\n🎉 Port 8081 cleanup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm start');
    console.log('2. Or run: expo start --clear');
    console.log('3. Or run: npx react-native start --reset-cache');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
main();
