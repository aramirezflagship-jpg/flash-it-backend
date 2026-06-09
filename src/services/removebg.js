const sharp = require('sharp');

// Background removal — using Remove.bg API (50 free/month)
// Falls back to original image with alpha if key not set
async function removeBackground(imageBuffer) {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (apiKey) {
    try {
      const FormData = require('form-data');
      const axios = require('axios');
      const form = new FormData();
      form.append('image_file', imageBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });
      form.append('size', 'auto');

      const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
        headers: { ...form.getHeaders(), 'X-Api-Key': apiKey },
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (err) {
      console.warn('[removebg] remove.bg failed:', err.message, '— using original image');
    }
  }

  // Fallback: return original image as RGBA PNG (no cutout — composites as rectangle)
  console.warn('[removebg] No REMOVE_BG_API_KEY set — skipping background removal');
  return sharp(imageBuffer).ensureAlpha().png().toBuffer();
}

module.exports = { removeBackground };
