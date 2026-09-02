@echo off
chcp 65001 > nul
title 배드민턴 대회 최신 데이터 자동 수집기

echo ========================================================
echo   🏸 전국 배드민턴 대회 전수 데이터 스크랩 시작
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 배드민톡 및 주요 사이트에서 최신 대회 데이터를 긁어옵니다...
npx tsx scripts/scrape-tournaments.ts

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 데이터 수집 중 오류가 발생했습니다.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] 수집이 성공적으로 완료되었습니다!
echo       (lib/tournaments-scraped.json 갱신됨)
echo.

pause
