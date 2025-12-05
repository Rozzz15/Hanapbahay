# Expo Environment Variables Setup Script for Windows
# This script helps you set environment variables in Expo for production builds

Write-Host "🚀 Expo Environment Variables Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if EAS CLI is installed
Write-Host "Checking for EAS CLI..." -ForegroundColor Yellow
try {
    $easVersion = eas --version 2>&1
    Write-Host "✅ EAS CLI found: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Please run: npm install -g eas-cli" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host ""
Write-Host "Checking Expo login status..." -ForegroundColor Yellow
$loginStatus = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Expo" -ForegroundColor Red
    Write-Host "Please run: eas login" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Logged in as: $loginStatus" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Current Environment Variables:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
eas secret:list

Write-Host ""
Write-Host "📝 Setting up environment variables..." -ForegroundColor Cyan
Write-Host ""

# Read .env file
if (Test-Path .env) {
    Write-Host "Reading .env file..." -ForegroundColor Yellow
    $envContent = Get-Content .env
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your configuration." -ForegroundColor Yellow
    exit 1
}

# Parse environment variables
$supabaseUrl = ""
$supabaseKey = ""
$apiUrl = ""

foreach ($line in $envContent) {
    if ($line -match "^EXPO_PUBLIC_SUPABASE_URL=(.+)$") {
        $supabaseUrl = $matches[1].Trim()
    }
    elseif ($line -match "^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$") {
        $supabaseKey = $matches[1].Trim()
    }
    elseif ($line -match "^EXPO_PUBLIC_API_URL=(.+)$") {
        $apiUrl = $matches[1].Trim()
    }
}

# Display found variables
Write-Host "Found environment variables:" -ForegroundColor Yellow
if ($supabaseUrl) {
    Write-Host "  ✅ EXPO_PUBLIC_SUPABASE_URL: $($supabaseUrl.Substring(0, [Math]::Min(50, $supabaseUrl.Length)))..." -ForegroundColor Green
} else {
    Write-Host "  ⚠️  EXPO_PUBLIC_SUPABASE_URL: Not found" -ForegroundColor Yellow
}

if ($supabaseKey) {
    Write-Host "  ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY: $($supabaseKey.Substring(0, [Math]::Min(30, $supabaseKey.Length)))..." -ForegroundColor Green
} else {
    Write-Host "  ⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY: Not found" -ForegroundColor Yellow
}

if ($apiUrl) {
    if ($apiUrl -match "your-backend-url|placeholder|localhost") {
        Write-Host "  ⚠️  EXPO_PUBLIC_API_URL: $apiUrl (PLACEHOLDER - Needs real URL!)" -ForegroundColor Red
    } else {
        Write-Host "  ✅ EXPO_PUBLIC_API_URL: $apiUrl" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  EXPO_PUBLIC_API_URL: Not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Setting variables in Expo..." -ForegroundColor Cyan
Write-Host ""

# Set Supabase URL
if ($supabaseUrl) {
    Write-Host "Setting EXPO_PUBLIC_SUPABASE_URL..." -ForegroundColor Yellow
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value $supabaseUrl --force 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ EXPO_PUBLIC_SUPABASE_URL set successfully" -ForegroundColor Green
    }
}

# Set Supabase Key
if ($supabaseKey) {
    Write-Host "Setting EXPO_PUBLIC_SUPABASE_ANON_KEY..." -ForegroundColor Yellow
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value $supabaseKey --force 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ EXPO_PUBLIC_SUPABASE_ANON_KEY set successfully" -ForegroundColor Green
    }
}

# Set API URL
if ($apiUrl) {
    if ($apiUrl -match "your-backend-url|placeholder|localhost") {
        Write-Host ""
        Write-Host "⚠️  WARNING: API URL is a placeholder!" -ForegroundColor Red
        Write-Host "Please deploy your backend first or update the URL in .env" -ForegroundColor Yellow
        Write-Host "Do you want to set it anyway? (y/N)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -eq "y" -or $response -eq "Y") {
            Write-Host "Setting EXPO_PUBLIC_API_URL..." -ForegroundColor Yellow
            eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value $apiUrl --force 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ EXPO_PUBLIC_API_URL set (but it's a placeholder!)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Setting EXPO_PUBLIC_API_URL..." -ForegroundColor Yellow
        eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value $apiUrl --force 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ EXPO_PUBLIC_API_URL set successfully" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Verify your secrets:" -ForegroundColor Cyan
Write-Host "Run: eas secret:list" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Ready to build!" -ForegroundColor Green
Write-Host "Run: eas build --platform android --profile production" -ForegroundColor Yellow




