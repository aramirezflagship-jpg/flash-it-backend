const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_WIDTH = 1800;
const OUTPUT_HEIGHT = 1200;
const BANNER_HEIGHT = 100;
const LOGO_MAX_WIDTH = 200;
const LOGO_MAX_HEIGHT = 80;
const LOGO_MARGIN = 24;
const DEFAULT_LOGO_PATH = path.resolve(__dirname, '../../assets/flash-it-logo.svg');

function createBannerSvg(text, bgColor, textColor, accentColor) {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return Buffer.from(`
    <svg width="${OUTPUT_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${OUTPUT_WIDTH}" height="${BANNER_HEIGHT}" fill="${bgColor}" opacity="0.92"/>
      <rect width="${OUTPUT_WIDTH}" height="4" fill="${accentColor}" y="0"/>
      <rect width="${OUTPUT_WIDTH}" height="4" fill="${accentColor}" y="${BANNER_HEIGHT - 4}"/>
      <text
        x="${OUTPUT_WIDTH / 2}"
        y="${BANNER_HEIGHT / 2 + 14}"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="52"
        font-weight="bold"
        fill="${textColor}"
        text-anchor="middle"
        letter-spacing="2"
      >${escapedText}</text>
    </svg>
  `);
}

async function composite(cutoutBuffer, backgroundBuffer, event, theme) {
  const background = await sharp(backgroundBuffer)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const cutoutMeta = await sharp(cutoutBuffer).metadata();
  const cutoutAspect = cutoutMeta.width / cutoutMeta.height;

  const usableHeight = theme && theme.banner ? OUTPUT_HEIGHT - BANNER_HEIGHT : OUTPUT_HEIGHT;
  const maxPersonWidth = Math.round(OUTPUT_WIDTH * 0.65);
  const maxPersonHeight = Math.round(usableHeight * 0.9);

  let personWidth, personHeight;
  if (cutoutAspect > maxPersonWidth / maxPersonHeight) {
    personWidth = maxPersonWidth;
    personHeight = Math.round(maxPersonWidth / cutoutAspect);
  } else {
    personHeight = maxPersonHeight;
    personWidth = Math.round(maxPersonHeight * cutoutAspect);
  }

  const resizedCutout = await sharp(cutoutBuffer)
    .resize(personWidth, personHeight, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  const personLeft = Math.round((OUTPUT_WIDTH - personWidth) / 2);
  const bannerOffset = theme && theme.banner && theme.banner.position === 'top' ? BANNER_HEIGHT : 0;
  const personTop = bannerOffset + (usableHeight - personHeight);

  const compositeOps = [
    { input: resizedCutout, left: personLeft, top: personTop },
  ];

  if (theme && theme.banner) {
    const lang = event.lang || 'es';
    const bannerText = theme.banner[lang] || theme.banner.en;
    const bannerSvg = createBannerSvg(
      bannerText,
      theme.banner.bgColor,
      theme.banner.textColor,
      theme.banner.accentColor
    );
    const bannerTop = theme.banner.position === 'top' ? 0 : OUTPUT_HEIGHT - BANNER_HEIGHT;
    compositeOps.push({ input: bannerSvg, left: 0, top: bannerTop });
  }

  const logoPath = event.logo && fs.existsSync(event.logo) ? event.logo : DEFAULT_LOGO_PATH;
  if (fs.existsSync(logoPath)) {
    const resizedLogo = await sharp(logoPath)
      .resize(LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const logoMeta = await sharp(resizedLogo).metadata();
    const logoLeft = OUTPUT_WIDTH - logoMeta.width - LOGO_MARGIN;
    const logoTop = OUTPUT_HEIGHT - logoMeta.height - LOGO_MARGIN;
    compositeOps.push({ input: resizedLogo, left: logoLeft, top: logoTop, blend: 'over' });
  }

  return sharp(background)
    .composite(compositeOps)
    .jpeg({ quality: 95 })
    .withMetadata({ density: 300 })
    .toBuffer();
}

module.exports = { composite };
