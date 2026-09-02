import fs from "node:fs";
import path from "node:path";
import React from "react";

// React JSX 전역 객체 주입
(globalThis as any).React = React;

import { renderToString } from "react-dom/server";
import { TournamentExplorer } from "../components/tournament-explorer";
import { mockTournaments } from "../lib/tournaments";

function generateStaticHtml() {
  const clientDir = path.resolve(process.cwd(), "dist/client");
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  // 빌드 타임에 React 컴포넌트를 100% 완전한 HTML로 프리렌더링
  console.log("⚡ React 컴포넌트 프리렌더링(SSG)을 시작합니다...");
  const renderedAppHtml = renderToString(
    React.createElement(TournamentExplorer, { tournaments: mockTournaments })
  );
  console.log(`✅ 프리렌더링 성공! HTML 크기: ${renderedAppHtml.length} bytes`);

  // CSS 파일 탐색
  const cssLinks: string[] = [];
  if (fs.existsSync(path.join(clientDir, "sites-project.css"))) {
    cssLinks.push(`<link rel="stylesheet" href="/sites-project.css" />`);
  }
  if (fs.existsSync(path.join(clientDir, "style.css"))) {
    cssLinks.push(`<link rel="stylesheet" href="/style.css" />`);
  }
  const nextCssDir = path.join(clientDir, "_next/static/css");
  if (fs.existsSync(nextCssDir)) {
    const files = fs.readdirSync(nextCssDir);
    const cssMatch = files.find((f) => f.endsWith(".css"));
    if (cssMatch) {
      cssLinks.push(`<link rel="stylesheet" href="/_next/static/css/${cssMatch}" />`);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>배드민턴 허브 | 전국 배드민턴 대회를 한눈에</title>
  <meta name="description" content="전국 9대 플랫폼의 700+건 배드민턴 대회 일정과 온라인 접수 정보를 한눈에 모아보세요." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta property="og:title" content="배드민턴 허브 (BadmintonHub)" />
  <meta property="og:description" content="전국 배드민턴 대회 일정을 한눈에" />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  ${cssLinks.join("\n  ")}
</head>
<body class="antialiased">
  <div id="root">${renderedAppHtml}</div>
  <script src="/app-bundle.js" defer></script>
  <script>
    if (typeof window !== "undefined" && window.__mountApp) {
      window.__mountApp();
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(clientDir, "index.html"), html, "utf-8");
  console.log("🎉 dist/client/index.html 완전 프리렌더링 SSG 생성 완료!");
}

generateStaticHtml();

