const sharp = require('sharp');

// Try to load @imgly — it downloads ONNX models on first use (~50MB, cached after)
let imglyRemoveBg = null;
try {
  imglyRemoveBg = require('@imgly/background-removal-node').removeBackground;
} catch {
  console.warn('[removebg] @imgly not available, will use sharp fallback');
}

async function removeBackground(imageBuffer) {
  if (imglyRemoveBg) {
    try {
      // @imgly requires RGBA PNG input
      const pngBuffer = await sharp(imageBuffer).ensureAlpha().png().toBuffer();
      const blob = new Blob([pngBuffer], { type: 'image/png' });
      const resultBlob = await imglyRemoveBg(blob, {
        output: { format: 'image/png', quality: 0.9 },
      });
      const arrayBuffer = await resultBlob.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.warn('[removebg] @imgly failed, using original image:', err.message);
    }
  }

  // Fallback: return original image with alpha channel (no bg removal — photo composites as rectangle)
  return sharp(imageBuffer).ensureAlpha().png().toBuffer();
}

module.exports = { removeBackground };
