const { fal } = require('@fal-ai/client');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const THEMES_FILE = path.resolve(__dirname, '../../config/themes.json');

function loadThemes() {
  const raw = fs.readFileSync(THEMES_FILE, 'utf8');
  return JSON.parse(raw);
}

async function generateBackground(imageBuffer, themeId) {
  fal.config({ credentials: process.env.FAL_API_KEY });

  const themes = loadThemes();
  const theme = themes[themeId];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }

  const base64Image = imageBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt: theme.prompt,
      image_url: dataUri,
      image_size: { width: 1800, height: 1200 },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
    },
    logs: false,
  });

  const imageUrl = result.data.images[0].url;
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

module.exports = { generateBackground };
