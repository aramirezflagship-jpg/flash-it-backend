const { fal } = require('@fal-ai/client');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

fal.config({ credentials: process.env.FAL_API_KEY });

const THEMES_FILE = path.resolve(__dirname, '../../config/themes.json');

function loadThemes() {
  const raw = fs.readFileSync(THEMES_FILE, 'utf8');
  return JSON.parse(raw);
}

async function generateBackground(imageBuffer, themeId) {
  const themes = loadThemes();
  const theme = themes[themeId];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }

  const base64Image = imageBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const result = await fal.subscribe('fal-ai/bria/background/replace', {
    input: {
      image_url: dataUri,
      prompt: theme.prompt,
      negative_prompt: 'blurry, low quality, distorted',
      num_inference_steps: 30,
      guidance_scale: 7.5,
      num_images: 1,
    },
    logs: false,
  });

  const imageUrl = result.data.images[0].url;
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

module.exports = { generateBackground };
