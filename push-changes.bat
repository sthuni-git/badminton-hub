@echo off
cd /d "%~dp0"
title BadmintonHub Band, Daum Cafe and Admin Push
color 0A

echo ======================================================
echo   BadmintonHub - Band, Daum Cafe and Admin Push
echo ======================================================
echo.

echo [1/3] Git Add...
git add .

echo [2/3] Git Commit...
git commit -m "feat: add 16 Daum Cafe tournaments, priority filter and card badges" || echo [INFO] No new changes to commit.

echo [3/3] Git Push to GitHub (Vercel Auto Deploy)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo   [SUCCESS] Band, Daum Cafe and Admin Features Pushed!
    echo   Vercel will update within 1-2 minutes.
    echo   Visit: https://badminton-hub-mu.vercel.app/
    echo ======================================================
) else (
    echo ======================================================
    echo   [ERROR] Push Failed. Please check the error message.
    echo ======================================================
)
echo.
pause
