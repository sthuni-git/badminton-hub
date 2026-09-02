@echo off
chcp 65001 > nul
title 배드민턴 허브 (BadmintonHub) 실행기
color 0A

echo ================================================================
echo        🏸 배드민턴 허브 (BadmintonHub) 서버를 시작합니다
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/2] 브라우저를 엽니다: http://localhost:3000/
start "" "http://localhost:3000/"

echo [2/2] 개발 서버(vinext dev)를 구동합니다...
echo.
npm run dev

pause
