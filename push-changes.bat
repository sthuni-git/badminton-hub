@echo off
cd /d "%~dp0"
title BadmintonHub Band, Daum Cafe & Admin Push
color 0A

echo ======================================================
echo   BadmintonHub - Band, Daum Cafe & Admin Push
echo ======================================================
echo.

echo [1/3] Git Add...
git add .

echo [2/3] Git Commit...
git commit -m "feat: add Naver Band and Daum Cafe tournaments, crawler sources and admin UI integration"

echo [3/3] Git Push to GitHub (Vercel Auto Deploy)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo   [SUCCESS] Band, Daum Cafe & Admin Features Pushed!
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
