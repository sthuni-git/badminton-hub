@echo off
cd /d "%~dp0"
title BadmintonHub Git Push to Vercel
color 0A

echo ======================================================
echo   BadmintonHub - Git Auto Commit and Push (Vercel)
echo ======================================================
echo.

echo [1/4] Git Add...
git add .

echo [2/4] Git Commit...
git commit -m "feat: update tournament details format, seoul filter, d-day fix"

echo [3/4] Git Pull Rebase (Sync with GitHub)...
git pull --rebase origin main

echo [4/4] Git Push to GitHub (Vercel Auto Deploy)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo   [SUCCESS] Push Complete! 
    echo   Vercel will automatically build and deploy within 1-2 minutes.
    echo   Visit: https://badminton-hub-mu.vercel.app/
    echo ======================================================
) else (
    echo ======================================================
    echo   [ERROR] Push Failed. Please check the error message above.
    echo ======================================================
)
echo.
pause
