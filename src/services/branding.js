const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_WIDTH = 1800;
const OUTPUT_HEIGHT = 1200;
const LOGO_MAX_WIDTH = 200;
const LOGO_MAX_HEIGHT = 80;
const LOGO_MARGIN = 24;
const DEFAULT_LOGO_PATH = path.resolve(__dirname, '../../assets/flash-it-logo.png');

async function composite(cutoutBuffer, backgroundBuffer, event) {
  const background = await sharp(backgroundBuffer)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const cutoutMeta = await sharp(cutoutBuffer).metadata();
  const cutoutAspect = cutoutMeta.width / cutoutMeta.height;

  const maxPersonWidth = Math.round(OUTPUT_WIDTH * 0.65);
  const maxPersonHeight = Math.round(OUTPUT_HEIGHT * 0.9);

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
  const personTop = OUTPUT_HEIGHT - personHeight;

  const logoPath = event.logo && fs.existsSync(event.logo) ? event.logo : DEFAULT_LOGO_PATH;

  const compositeOps = [
    { input: resizedCutout, left: personLeft, top: personTop },
  ];

  if (fs.existsSync(logoPath)) {
    const resizedLogo = await sharp(logoPath)
      .resize(LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const logoMeta = await sharp(resizedLogo).metadata();
    const logoLeft = OUTPUT_WIDTH - logoMeta.width - LOGO_MARGIN;
    const logoTop = OUTPUT_HEIGHT - logoMeta.height - LOGO_MARGIN;

    compositeOps.push({
      input: resizedLogo,
      left: logoLeft,
      top: logoTop,
      blend: 'over',
    });
  }

  const finalBuffer = await sharp(background)
    .composite(compositeOps)
    .jpeg({ quality: 95 })
    .withMetadata({ density: 300 })
    .toBuffer();

  return finalBuffer;
}

module.exports = { composite };
