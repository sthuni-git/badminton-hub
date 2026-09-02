import fs from "node:fs";
import path from "node:path";

function generateStaticHtml() {
  const clientDir = path.resolve(process.cwd(), "dist/client");
  if (!fs.existsSync(clientDir)) {
    console.error("dist/client directory not found");
    return;
  }

  // CSS 파일 탐색
  const cssLinks = [];
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
  <div id="root"></div>
  <script type="module" src="/app-bundle.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(clientDir, "index.html"), html, "utf-8");
  console.log("✅ dist/client/index.html 정적 진입점 생성 완료!");
}

generateStaticHtml();

