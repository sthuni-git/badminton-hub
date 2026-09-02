@echo off
chcp 65001 > nul
title 배드민턴 허브 (BadmintonHub) 프로덕션 빌드 및 실행기
color 0B

echo ================================================================
echo   🏸 배드민턴 허브 (BadmintonHub) 프로덕션 빌드 및 실행
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/3] 프로덕션 빌드 진행 중 (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] 빌드에 실패했습니다.
    pause
    exit /b %errorlevel%
)

echo [2/3] 브라우저를 엽니다: http://localhost:3000/
start "" "http://localhost:3000/"

echo [3/3] 프로덕션 서버를 시작합니다...
echo.
npm run start

pause
