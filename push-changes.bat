@echo off
cd /d "%~dp0"
title BadmintonHub Git Push
color 0A

echo ======================================================
echo   BadmintonHub - Git Auto Commit and Push
echo ======================================================
echo.

echo [1/3] Git Add...
git add .

echo [2/3] Git Commit...
git commit -m "feat: tournament details format, seoul region filter, d-day fix, github actions scheduler"

echo [3/3] Git Push origin main...
git push origin main

echo.
echo ======================================================
echo   Push Complete!
echo ======================================================
echo.
pause
