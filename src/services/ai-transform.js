const { fal } = require('@fal-ai/client');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

fal.config({ credentials: process.env.FAL_API_KEY });

const THEMES_FILE = path.resolve(__dirname, '../../config/themes.json');

function loadThemes() {
  return JSON.parse(fs.readFileSync(THEMES_FILE, 'utf8'));
}

function saveThemes(themes) {
  fs.writeFileSync(THEMES_FILE, JSON.stringify(themes, null, 2), 'utf8');
}

// Fetch a remote image URL into a buffer
async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
  return Buffer.from(res.data);
}

// Generate one background image using FLUX Schnell (4 steps, ~2-3s)
async function generateBackgroundFast(themePrompt) {
  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt: themePrompt,
      image_size: { width: 1800, height: 1200 },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    },
    logs: false,
  });
  return result.data.images[0].url;
}

// Main: returns a background image buffer for a given themeId.
// Uses pre-baked cache if available, otherwise generates with flux/schnell.
async function generateBackground(themeId) {
  const themes = loadThemes();
  const theme = themes[themeId];
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  // Use pre-baked background if available (fastest path)
  if (theme.bgCache && theme.bgCache.length > 0) {
    const url = theme.bgCache[Math.floor(Math.random() * theme.bgCache.length)];
    return fetchBuffer(url);
  }

  // Fallback: generate live with flux/schnell (turbo — 4 steps)
  const bgUrl = await generateBackgroundFast(theme.prompt);
  return fetchBuffer(bgUrl);
}

// Pre-bake N backgrounds for a theme and save URLs to themes.json bgCache.
// Called once per theme from /admin/prebake — not on the hot path.
async function prebakeTheme(themeId, count = 5) {
  const themes = loadThemes();
  const theme = themes[themeId];
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  const generated = await Promise.all(
    Array.from({ length: count }, () => generateBackgroundFast(theme.prompt))
  );

  theme.bgCache = [...(theme.bgCache || []), ...generated];
  themes[themeId] = theme;
  saveThemes(themes);

  return theme.bgCache;
}

module.exports = { generateBackground, prebakeTheme };
