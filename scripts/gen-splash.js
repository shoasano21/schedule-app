// 透過背景の splash 用ロゴを生成。expo-splash-screen の backgroundColor に重なる。
// 出力: assets/splash-icon.png (1024x1024, transparent bg)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 中央配置 + ロゴを小さめに (約 40%) してスプラッシュにフィット
// 元 viewBox の中心 (512, 512) に対し、C+ドット全体の中心は約 (575, 512)
// → 中心を (512, 512) に揃えるため translate(-63, 0) し、その後 scale(0.7) で 70% に縮小
const SVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FF453A" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="#FF453A" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#FF453A" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 中央寄せ + 70% スケール -->
  <g transform="translate(512 512) scale(0.7) translate(-575 -512)">
    <!-- subtle glow behind dot -->
    <circle cx="780" cy="512" r="180" fill="url(#dotGlow)"/>

    <!-- White C arc -->
    <path
      d="M 685 339 A 245 245 0 1 0 685 685"
      fill="none"
      stroke="white"
      stroke-width="96"
      stroke-linecap="round"
    />

    <!-- Red pulse dot -->
    <circle cx="780" cy="512" r="42" fill="#FF453A"/>
    <circle cx="780" cy="512" r="42" fill="none" stroke="white" stroke-width="6" stroke-opacity="0.9"/>
  </g>
</svg>
`;

(async () => {
  const out = path.resolve(__dirname, '..', 'assets', 'splash-icon.png');
  await sharp(Buffer.from(SVG))
    .resize(1024, 1024)
    .png()
    .toFile(out);
  console.log('wrote', out);
})();
