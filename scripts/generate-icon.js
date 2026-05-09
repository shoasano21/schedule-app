const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'assets', 'icon.svg');
const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const ADAPTIVE_PATH = path.join(__dirname, '..', 'assets', 'adaptive-icon.png');
const FAVICON_PATH = path.join(__dirname, '..', 'assets', 'favicon.png');
const SPLASH_PATH = path.join(__dirname, '..', 'assets', 'splash-icon.png');

const svg = fs.readFileSync(SVG_PATH);

async function main() {
  await sharp(svg, { density: 384 })
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(ICON_PATH);
  console.log('icon.png generated');

  await sharp(svg, { density: 384 })
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(ADAPTIVE_PATH);
  console.log('adaptive-icon.png generated');

  await sharp(svg, { density: 200 })
    .resize(48, 48, { fit: 'cover' })
    .png()
    .toFile(FAVICON_PATH);
  console.log('favicon.png generated');

  await sharp(svg, { density: 384 })
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(SPLASH_PATH);
  console.log('splash-icon.png generated');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
