#!/usr/bin/env node

/**
 * Verification script to check if the app setup is correct
 * Run with: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 HanapBahay App - Setup Verification\n');
console.log('=' .repeat(50));

let errors = [];
let warnings = [];
let passed = [];

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    passed.push(`✅ Node.js version: ${nodeVersion} (>= 18 required)`);
  } else {
    errors.push(`❌ Node.js version: ${nodeVersion} (>= 18 required)`);
  }
}

// Check if required files exist
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'app.json',
    'tsconfig.json',
    'babel.config.js',
    'metro.config.js',
    'tailwind.config.js',
    'app/_layout.tsx',
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      passed.push(`✅ Required file exists: ${file}`);
    } else {
      errors.push(`❌ Missing required file: ${file}`);
    }
  });
}

// Check if assets exist
function checkAssets() {
  const assets = [
    'assets/images/icon.png',
    'assets/images/splash-icon.png',
    'assets/images/favicon.png',
    'assets/fonts/SpaceMono-Regular.ttf',
  ];

  assets.forEach(asset => {
    const assetPath = path.join(__dirname, '..', asset);
    if (fs.existsSync(assetPath)) {
      passed.push(`✅ Asset exists: ${asset}`);
    } else {
      warnings.push(`⚠️  Missing asset: ${asset} (app may work but with issues)`);
    }
  });
}

// Check if node_modules exists
function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    passed.push('✅ node_modules directory exists');
    
    // Check if expo is installed
    const expoPath = path.join(nodeModulesPath, 'expo');
    if (fs.existsSync(expoPath)) {
      passed.push('✅ Expo is installed');
    } else {
      errors.push('❌ Expo is not installed - run: npm install');
    }
  } else {
    errors.push('❌ node_modules directory not found - run: npm install');
  }
}

// Check package.json scripts
function checkScripts() {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = ['start', 'android', 'ios', 'web'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        passed.push(`✅ Script exists: npm run ${script}`);
      } else {
        warnings.push(`⚠️  Missing script: ${script}`);
      }
    });
  } catch (error) {
    errors.push(`❌ Error reading package.json: ${error.message}`);
  }
}

// Check TypeScript configuration
function checkTypeScript() {
  try {
    const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      passed.push('✅ TypeScript configuration exists');
    }
  } catch (error) {
    warnings.push(`⚠️  TypeScript config issue: ${error.message}`);
  }
}

// Run all checks
checkNodeVersion();
checkRequiredFiles();
checkAssets();
checkNodeModules();
checkScripts();
checkTypeScript();

// Print results
console.log('\n📋 Verification Results:\n');

if (passed.length > 0) {
  console.log('✅ PASSED:');
  passed.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:');
  errors.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

// Summary
console.log('=' .repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Passed: ${passed.length}`);
console.log(`   ⚠️  Warnings: ${warnings.length}`);
console.log(`   ❌ Errors: ${errors.length}`);

if (errors.length === 0) {
  console.log('\n✅ Setup looks good! You should be able to run: npm start');
  process.exit(0);
} else {
  console.log('\n❌ Please fix the errors above before running the app.');
  console.log('   See SETUP_GUIDE.md for detailed instructions.');
  process.exit(1);
}

