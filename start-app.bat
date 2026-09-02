@echo off
chcp 65001 > nul
title 민턴파인더 (MintonFinder) 실행기

echo ========================================================
echo        🏸 민턴파인더 (BadmintonHub) 서버를 시작합니다
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 브라우저를 엽니다: http://localhost:3000/
start "" "http://localhost:3000/"

echo [2/2] 개발 서버(vinext dev)를 구동합니다...
echo.
npm run dev

pause
