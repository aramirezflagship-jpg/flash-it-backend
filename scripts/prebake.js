/**
 * Flash-It Background Pre-baker (remote)
 * Triggers pre-baking on the deployed Railway backend via the admin API.
 *
 * Usage:
 *   node scripts/prebake.js [RAILWAY_URL] [ADMIN_KEY] [count_per_theme]
 *   node scripts/prebake.js https://flash-it-backend-production.up.railway.app YOUR_ADMIN_KEY 3
 *
 * Falls back to env vars RAILWAY_URL and ADMIN_KEY if CLI args are omitted.
 */

const https = require('https');
const http = require('http');

const RAILWAY_URL = process.argv[2] || process.env.RAILWAY_URL || '';
const ADMIN_KEY   = process.argv[3] || process.env.ADMIN_KEY   || '';
const COUNT       = parseInt(process.argv[4] || process.env.COUNT || '3', 10);

if (!RAILWAY_URL || !ADMIN_KEY) {
  console.error('Usage: node scripts/prebake.js <RAILWAY_URL> <ADMIN_KEY> [count]');
  console.error('   or: RAILWAY_URL=https://... ADMIN_KEY=... node scripts/prebake.js');
  process.exit(1);
}

const base = RAILWAY_URL.replace(/\/$/, '');
const endpoint = `${base}/admin/prebake-all?count=${COUNT}`;

console.log(`\nFlash-It Background Pre-baker (remote)`);
console.log(`  Target : ${base}`);
console.log(`  Count  : ${COUNT} backgrounds per theme`);
console.log(`  Calling: POST /admin/prebake-all?count=${COUNT}\n`);

function post(url, adminKey) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
          'Content-Length': 0,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); }
            catch { resolve(body); }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

post(endpoint, ADMIN_KEY)
  .then((data) => {
    console.log('Done!', data.message || 'Pre-bake complete.');
    if (data.results) {
      for (const [themeId, urls] of Object.entries(data.results)) {
        console.log(`  ${themeId}: ${urls.length} backgrounds cached`);
      }
    }
    console.log('\nBackground cache is persisted to R2 — no commit needed.');
  })
  .catch((err) => {
    console.error('\nPre-bake failed:', err.message);
    process.exit(1);
  });
