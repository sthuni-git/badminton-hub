@echo off
cd /d "%~dp0"
title BadmintonHub Data Restore and Git Push
color 0A

echo ======================================================
echo   BadmintonHub - 800+ Full Data Restore & Git Push
echo ======================================================
echo.

echo [1/4] Restoring 800+ full tournaments dataset...
git checkout b4282c645b15670f1c979d47cfd1740d4ad5b0b6 -- lib/tournaments-scraped.json

echo [2/4] Git Add...
git add .

echo [3/4] Git Commit...
git commit -m "fix: restore 800+ full tournaments dataset and protect persistent merge"

echo [4/4] Git Push to GitHub (Vercel Auto Deploy)...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo   [SUCCESS] Full Data Restored & Pushed!
    echo   All 800+ tournaments and sources are back.
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
