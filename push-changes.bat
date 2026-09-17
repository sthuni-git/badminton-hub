@echo off
cd /d "%~dp0"
title BadmintonHub Data Restore and Git Push
color 0A

echo ======================================================
echo   BadmintonHub - Advanced Scraping Pipeline Push
echo ======================================================
echo.

echo [1/3] Git Add...
git add .

echo [2/3] Git Commit...
git commit -m "feat: upgrade scraping pipeline with detailed specifications, retry engine and persistent merge"

echo [3/3] Git Push to GitHub (Vercel Auto Deploy)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo   [SUCCESS] Advanced Scraping Pipeline Pushed!
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
