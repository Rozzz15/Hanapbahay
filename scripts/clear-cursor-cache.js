#!/usr/bin/env node

/**
 * Script to clear Cursor IDE cache and restart language server
 * Run this if you're experiencing serialization errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Clearing Cursor IDE cache...');

const projectRoot = process.cwd();
const cachePaths = [
    '.vscode',
    '.cursor',
    'node_modules/.cache',
    '.expo',
    'android/.gradle',
    'android/app/build',
    'ios/build'
];

// Clear cache directories
cachePaths.forEach(cachePath => {
    const fullPath = path.join(projectRoot, cachePath);
    if (fs.existsSync(fullPath)) {
        try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`✅ Cleared: ${cachePath}`);
        } catch (error) {
            console.log(`⚠️ Could not clear: ${cachePath} - ${error.message}`);
        }
    }
});

// Clear TypeScript cache
try {
    execSync('npx tsc --build --clean', { stdio: 'inherit' });
    console.log('✅ Cleared TypeScript cache');
} catch (error) {
    console.log('⚠️ Could not clear TypeScript cache');
}

// Clear Metro cache
try {
    execSync('npx expo start --clear', { stdio: 'inherit' });
    console.log('✅ Cleared Metro cache');
} catch (error) {
    console.log('⚠️ Could not clear Metro cache');
}

console.log('🎉 Cache clearing complete!');
console.log('📝 Next steps:');
console.log('1. Close Cursor IDE completely');
console.log('2. Restart Cursor IDE');
console.log('3. Open your project again');
console.log('4. If issues persist, try using the refactored profile component');
