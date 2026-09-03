@echo off
chcp 65001 > nul
title 배드민턴 대회 검증 데이터 자동 수집기

echo ========================================================
echo   🏸 원문 확인 가능한 배드민턴 대회 수집 시작
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 상세 원문이 확인되는 최신 대회만 수집합니다...
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
