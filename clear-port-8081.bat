@echo off
echo 🧹 Clearing all stored data on port 8081...
echo.

REM Kill processes on port 8081
echo 🔍 Finding processes on port 8081...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do (
    if not "%%a"=="0" (
        echo 💀 Killing process %%a...
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo ✅ Process %%a killed
        ) else (
            echo ⚠️  Could not kill process %%a
        )
    )
)

REM Clear npm cache
echo.
echo 🗑️  Clearing Metro bundler cache...
echo Clearing NPM cache...
call npm cache clean --force
if %errorlevel% equ 0 (
    echo ✅ NPM cache cleared
) else (
    echo ⚠️  Could not clear NPM cache
)

REM Clear yarn cache
echo Clearing Yarn cache...
call yarn cache clean >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Yarn cache cleared
) else (
    echo ℹ️  Yarn not found or cache already clean
)

REM Clear Expo cache
echo Clearing Expo cache...
call npx expo r -c >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Expo cache cleared
) else (
    echo ⚠️  Could not clear Expo cache
)

REM Clear temporary files
echo.
echo 🗂️  Clearing temporary files...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache" >nul 2>&1
    echo ✅ Cleared node_modules\.cache
)
if exist ".expo" (
    rmdir /s /q ".expo" >nul 2>&1
    echo ✅ Cleared .expo
)
if exist "android\app\build" (
    rmdir /s /q "android\app\build" >nul 2>&1
    echo ✅ Cleared android\app\build
)
if exist "ios\build" (
    rmdir /s /q "ios\build" >nul 2>&1
    echo ✅ Cleared ios\build
)
if exist "web-build" (
    rmdir /s /q "web-build" >nul 2>&1
    echo ✅ Cleared web-build
)
if exist "dist" (
    rmdir /s /q "dist" >nul 2>&1
    echo ✅ Cleared dist
)
if exist ".next" (
    rmdir /s /q ".next" >nul 2>&1
    echo ✅ Cleared .next
)
if exist ".metro" (
    rmdir /s /q ".metro" >nul 2>&1
    echo ✅ Cleared .metro
)

REM Clear Chrome cache
echo.
echo 🌐 Clearing browser cache...
if exist "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache" (
    rmdir /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache" >nul 2>&1
    echo ✅ Chrome cache cleared
)

echo.
echo 🎉 Port 8081 cleanup completed!
echo.
echo 📋 Next steps:
echo 1. Run: npm start
echo 2. Or run: expo start --clear
echo 3. Or run: npx react-native start --reset-cache
echo.
pause
