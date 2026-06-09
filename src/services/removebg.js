const { fal } = require('@fal-ai/client');
const axios = require('axios');

async function removeBackground(imageBuffer) {
  fal.config({ credentials: process.env.FAL_API_KEY });

  const base64Image = imageBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const result = await fal.subscribe('fal-ai/imageutils/rembg', {
    input: {
      image_url: dataUri,
      sync_mode: true,
    },
    logs: false,
  });

  const imageUrl = result.data.image.url;
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

module.exports = { removeBackground };
