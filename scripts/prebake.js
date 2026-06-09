/**
 * Flash-It Background Pre-baker
 * Run this once before an event to generate and cache background images.
 * Usage: node scripts/prebake.js [count_per_theme]
 * Example: node scripts/prebake.js 3
 */

require('dotenv').config();
const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const THEMES_FILE = path.resolve(__dirname, '../config/themes.json');
const COUNT = parseInt(process.argv[2]) || 3;

fal.config({ credentials: process.env.FAL_API_KEY });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function generateImage(prompt) {
  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: { width: 1800, height: 1200 },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: false,
    },
    logs: false,
  });
  return result.data.images[0].url;
}

async function uploadToR2(imageUrl, key) {
  const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: Buffer.from(res.data),
    ContentType: 'image/jpeg',
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log(`\n⚡ Flash-It Background Pre-baker`);
  console.log(`   Generating ${COUNT} backgrounds per theme...\n`);

  const themes = JSON.parse(fs.readFileSync(THEMES_FILE, 'utf8'));
  const themeIds = Object.keys(themes);
  let totalGenerated = 0;

  for (const themeId of themeIds) {
    const theme = themes[themeId];
    console.log(`📸 [${themeId}] ${theme.name.en}...`);

    const newUrls = [];
    for (let i = 0; i < COUNT; i++) {
      try {
        process.stdout.write(`   Generating ${i + 1}/${COUNT}...`);
        const falUrl = await generateImage(theme.prompt);
        const r2Key = `flash-it/backgrounds/${themeId}/bg_${Date.now()}_${i}.jpg`;
        const r2Url = await uploadToR2(falUrl, r2Key);
        newUrls.push(r2Url);
        process.stdout.write(` ✓\n`);
        totalGenerated++;
      } catch (err) {
        process.stdout.write(` ✗ ${err.message}\n`);
      }
    }

    theme.bgCache = [...(theme.bgCache || []).filter(u => u && !u.includes('fal.media')), ...newUrls];
    themes[themeId] = theme;

    // Save after each theme in case of interruption
    fs.writeFileSync(THEMES_FILE, JSON.stringify(themes, null, 2), 'utf8');
    console.log(`   ✅ ${newUrls.length} backgrounds cached for ${theme.name.en}\n`);
  }

  console.log(`\n🎉 Done! ${totalGenerated} backgrounds generated across ${themeIds.length} themes.`);
  console.log(`   Commit config/themes.json to lock them in:\n`);
  console.log(`   git add config/themes.json && git commit -m "chore: pre-baked backgrounds for all themes"\n`);
}

main().catch(err => {
  console.error('\n❌ Pre-bake failed:', err.message);
  process.exit(1);
});
