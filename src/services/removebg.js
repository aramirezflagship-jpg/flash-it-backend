const sharp = require('sharp');
const { removeBackground: imglyRemoveBg } = require('@imgly/background-removal-node');

async function removeBackground(imageBuffer) {
  // @imgly requires RGBA input — convert to PNG first
  const pngBuffer = await sharp(imageBuffer)
    .ensureAlpha()
    .png()
    .toBuffer();

  const blob = new Blob([pngBuffer], { type: 'image/png' });
  const resultBlob = await imglyRemoveBg(blob, {
    output: { format: 'image/png', quality: 0.9 },
  });
  const arrayBuffer = await resultBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { removeBackground };
