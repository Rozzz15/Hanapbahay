# PowerShell script to clear all stored data on port 8081
# Run with: powershell -ExecutionPolicy Bypass -File clear-port-8081.ps1

Write-Host "🧹 Clearing all stored data on port 8081..." -ForegroundColor Green
Write-Host ""

# Function to kill processes on port 8081
function Kill-ProcessesOnPort {
    param([int]$Port)
    
    Write-Host "🔍 Finding processes on port $Port..." -ForegroundColor Yellow
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($processes) {
            $processes | ForEach-Object {
                $pid = $_.OwningProcess
                if ($pid) {
                    try {
                        Write-Host "💀 Killing process $pid..." -ForegroundColor Red
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "✅ Process $pid killed" -ForegroundColor Green
                    } catch {
                        Write-Host "⚠️  Could not kill process $pid" -ForegroundColor Yellow
                    }
                }
            }
        } else {
            Write-Host "✅ No processes found on port $Port" -ForegroundColor Green
        }
    } catch {
        Write-Host "✅ No processes found on port $Port" -ForegroundColor Green
    }
}

# Function to clear Metro cache
function Clear-MetroCache {
    Write-Host "🗑️  Clearing Metro bundler cache..." -ForegroundColor Yellow
    
    # Clear npm cache
    try {
        Write-Host "Clearing NPM cache..." -ForegroundColor Cyan
        npm cache clean --force
        Write-Host "✅ NPM cache cleared" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not clear NPM cache" -ForegroundColor Yellow
    }
    
    # Clear yarn cache
    try {
        Write-Host "Clearing Yarn cache..." -ForegroundColor Cyan
        yarn cache clean
        Write-Host "✅ Yarn cache cleared" -ForegroundColor Green
    } catch {
        Write-Host "ℹ️  Yarn not found or cache already clean" -ForegroundColor Blue
    }
    
    # Clear Expo cache
    try {
        Write-Host "Clearing Expo cache..." -ForegroundColor Cyan
        npx expo r -c
        Write-Host "✅ Expo cache cleared" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not clear Expo cache" -ForegroundColor Yellow
    }
}

# Function to clear temporary files
function Clear-TempFiles {
    Write-Host "🗂️  Clearing temporary files..." -ForegroundColor Yellow
    
    $tempDirs = @(
        "node_modules\.cache",
        ".expo",
        "android\app\build",
        "ios\build",
        "web-build",
        "dist",
        ".next",
        ".metro"
    )
    
    foreach ($dir in $tempDirs) {
        if (Test-Path $dir) {
            try {
                Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "✅ Cleared $dir" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not clear $dir" -ForegroundColor Yellow
            }
        }
    }
    
    # Clear system temp directories
    $tempPath = $env:TEMP
    $systemTempDirs = @(
        "$tempPath\metro-*",
        "$tempPath\expo-*",
        "$tempPath\react-native-*"
    )
    
    foreach ($pattern in $systemTempDirs) {
        try {
            Get-ChildItem $pattern -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignore errors
        }
    }
}

# Function to clear browser cache
function Clear-BrowserCache {
    Write-Host "🌐 Clearing browser cache..." -ForegroundColor Yellow
    
    $chromeCachePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromeCachePath) {
        try {
            Remove-Item $chromeCachePath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Chrome cache cleared" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Could not clear Chrome cache" -ForegroundColor Yellow
        }
    }
}

# Main execution
try {
    # Step 1: Kill processes on port 8081
    Kill-ProcessesOnPort -Port 8081
    
    # Step 2: Clear Metro cache
    Clear-MetroCache
    
    # Step 3: Clear temporary files
    Clear-TempFiles
    
    # Step 4: Clear browser cache
    Clear-BrowserCache
    
    Write-Host ""
    Write-Host "🎉 Port 8081 cleanup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm start" -ForegroundColor White
    Write-Host "2. Or run: expo start --clear" -ForegroundColor White
    Write-Host "3. Or run: npx react-native start --reset-cache" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error during cleanup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
