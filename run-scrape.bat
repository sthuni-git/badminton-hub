@echo off
cd /d "%~dp0"
title BadmintonHub - Manual Scrape and Update
color 0B

echo ======================================================
echo   BadmintonHub - Manual Scrape Execution
echo ======================================================
echo.

echo [1/4] Scraping 12 Official Platforms...
call npm run scrape
echo.

echo [2/4] AI Discovering Tournaments (Google, Cafe, Blog, Band)...
call npm run scrape:ai
echo.

echo [3/4] Validating Dataset Integrity...
call npm run validate:data
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Data validation failed. Push aborted.
    pause
    exit /b 1
)
echo.

echo [4/4] Git Commit and Push (Vercel Auto Deploy)...
git add lib/tournaments-scraped.json
git commit -m "chore: manual scrape update - tournaments and AI discovery"
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ======================================================
    echo   [SUCCESS] Manual Scrape and Push Complete!
    echo   Vercel will update within 1-2 minutes.
    echo   Visit: https://badminton-hub-mu.vercel.app/
    echo ======================================================
) else (
    echo ======================================================
    echo   [NOTICE] No new changes or push completed.
    echo ======================================================
)

echo.
pause
