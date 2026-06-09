const { fal } = require('@fal-ai/client');
const axios = require('axios');
const { loadBgCache, saveBgCache } = require('./bgcache');
const { getStaticBackground } = require('./staticBackground');

fal.config({ credentials: process.env.FAL_API_KEY });

const path = require('path');
const fs = require('fs');

const THEMES_FILE = path.resolve(__dirname, '../../config/themes.json');

// Module-level in-memory cache: { [themeId]: string[] }
// Populated once at startup from R2; avoids hitting R2 on every request.
let memoryCache = {};

// Load bgCache from R2 at startup (non-blocking — failures are logged, not fatal)
loadBgCache()
  .then((cache) => {
    memoryCache = cache || {};
    console.log('[bgcache] Loaded from R2:', Object.keys(memoryCache).length, 'themes cached');
  })
  .catch((err) => {
    console.warn('[bgcache] Could not load from R2 at startup, starting empty:', err.message);
  });

function loadThemes() {
  return JSON.parse(fs.readFileSync(THEMES_FILE, 'utf8'));
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
// Checks memoryCache first, then falls back to live generation.
async function generateBackground(themeId) {
  const themes = loadThemes();
  const theme = themes[themeId];
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  // Use pre-baked background from in-memory cache (fastest path)
  const cached = memoryCache[themeId];
  if (cached && cached.length > 0) {
    const url = cached[Math.floor(Math.random() * cached.length)];
    return fetchBuffer(url);
  }

  // Fallback: generate live with flux/schnell (turbo — 4 steps)
  // If fal.ai fails (no credits/key), use static themed background
  try {
    const bgUrl = await generateBackgroundFast(theme.prompt);
    return fetchBuffer(bgUrl);
  } catch (err) {
    console.warn(`[ai-transform] fal.ai unavailable (${err.message}), using static background`);
    return getStaticBackground(themeId);
  }
}

// Pre-bake N backgrounds for a theme, update memoryCache, and persist to R2.
// Called once per theme from /admin/prebake — not on the hot path.
async function prebakeTheme(themeId, count = 5) {
  const themes = loadThemes();
  const theme = themes[themeId];
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  const generated = await Promise.all(
    Array.from({ length: count }, () => generateBackgroundFast(theme.prompt))
  );

  const existing = memoryCache[themeId] || [];
  memoryCache[themeId] = [...existing, ...generated];

  await saveBgCache(memoryCache);

  return memoryCache[themeId];
}

module.exports = { generateBackground, prebakeTheme, getMemoryCache: () => memoryCache };
