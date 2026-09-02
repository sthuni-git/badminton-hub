import fs from "node:fs";
import path from "node:path";

function generateStaticHtml() {
  const clientDir = path.resolve(process.cwd(), "dist/client");
  if (!fs.existsSync(clientDir)) {
    console.error("dist/client directory not found");
    return;
  }

  // manifest.json 읽기
  const manifestPath = path.join(clientDir, ".vite/manifest.json");
  let entryJs = "";
  let cssFile = "";

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const entryKey = "virtual:vinext-app-browser-entry";
      if (manifest[entryKey] && manifest[entryKey].file) {
        entryJs = "/" + manifest[entryKey].file;
      }
    } catch (e) {
      console.warn("Could not parse manifest.json", e);
    }
  }

  // CSS 파일 탐색
  const cssDir = path.join(clientDir, "_next/static/css");
  if (fs.existsSync(cssDir)) {
    const files = fs.readdirSync(cssDir);
    const cssMatch = files.find((f) => f.endsWith(".css"));
    if (cssMatch) {
      cssFile = `/_next/static/css/${cssMatch}`;
    }
  }

  // JS chunks 폴더에서 index 엔트리 fallback 탐색
  if (!entryJs) {
    const chunksDir = path.join(clientDir, "_next/static/chunks");
    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      const indexMatch = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
      if (indexMatch) {
        entryJs = `/_next/static/chunks/${indexMatch}`;
      }
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
  ${cssFile ? `<link rel="stylesheet" href="${cssFile}" />` : ""}
</head>
<body class="antialiased">
  <div id="root"></div>
  ${entryJs ? `<script type="module" src="${entryJs}"></script>` : ""}
</body>
</html>`;

  fs.writeFileSync(path.join(clientDir, "index.html"), html, "utf-8");
  console.log("✅ dist/client/index.html 정적 진입점 생성 완료!");
}

generateStaticHtml();

