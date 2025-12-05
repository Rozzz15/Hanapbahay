# Build APK with Cloud Backend
# This script ensures the APK uses the cloud backend and names it Hanapbahay.apk

Write-Host "🔧 Building APK with Cloud Backend..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Ensure .env has cloud backend
Write-Host "1️⃣ Checking .env configuration..." -ForegroundColor Yellow
node scripts/ensure-cloud-backend.js

# Step 2: Build the APK
Write-Host ""
Write-Host "2️⃣ Building release APK..." -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes..." -ForegroundColor Gray

$buildOutput = ""
try {
    Push-Location android
    $buildOutput = .\gradlew assembleRelease 2>&1 | Out-String
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Build successful!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Build failed!" -ForegroundColor Red
        Write-Host $buildOutput
        exit 1
    }
} catch {
    Write-Host "   ❌ Build error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 3: Find and rename the APK
Write-Host ""
Write-Host "3️⃣ Locating APK file..." -ForegroundColor Yellow

$apkPath = "android\app\build\outputs\apk\release"
$apkFiles = Get-ChildItem -Path $apkPath -Filter "*.apk" -ErrorAction SilentlyContinue

if ($apkFiles.Count -eq 0) {
    Write-Host "   ❌ No APK file found in $apkPath" -ForegroundColor Red
    exit 1
}

# Remove old Hanapbahay.apk if exists
$targetApk = Join-Path $apkPath "Hanapbahay.apk"
if (Test-Path $targetApk) {
    Remove-Item $targetApk -Force
    Write-Host "   🗑️  Removed old Hanapbahay.apk" -ForegroundColor Gray
}

# Find the release APK (usually app-release.apk)
$releaseApk = $apkFiles | Where-Object { $_.Name -like "*release*.apk" -and $_.Name -notlike "*unaligned*" } | Select-Object -First 1

if (-not $releaseApk) {
    $releaseApk = $apkFiles | Select-Object -First 1
}

if ($releaseApk) {
    $sourcePath = $releaseApk.FullName
    Copy-Item $sourcePath $targetApk -Force
    Write-Host "   ✅ APK renamed to: Hanapbahay.apk" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 APK Location:" -ForegroundColor Cyan
    Write-Host "   $targetApk" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Build complete! Your APK uses cloud backend:" -ForegroundColor Green
    Write-Host "   https://web-production-e66fb.up.railway.app" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ Could not find release APK" -ForegroundColor Red
    exit 1
}

