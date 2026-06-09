const sharp = require('sharp');

const WIDTH = 1800;
const HEIGHT = 1200;

// Themed SVG backgrounds — used when fal.ai credits are unavailable
const THEMES = {
  default: elegantWeddingSvg(),
  'elegant-wedding': elegantWeddingSvg(),
  'rustic-wedding': elegantWeddingSvg(),
  'beach-wedding': elegantWeddingSvg(),
  'xv-anos': elegantWeddingSvg(),
  'xv-jardin': elegantWeddingSvg(),
  'xv-real': elegantWeddingSvg(),
  'corporate-glow': elegantWeddingSvg(),
  'corporate-city': elegantWeddingSvg(),
  'corporate-minimal': elegantWeddingSvg(),
  'birthday-confetti': elegantWeddingSvg(),
  'birthday-neon': elegantWeddingSvg(),
  'tropical-fiesta': elegantWeddingSvg(),
  'mariachi-night': elegantWeddingSvg(),
  'futuristic-neon': elegantWeddingSvg(),
  'space-explorer': elegantWeddingSvg(),
  'winter-holiday': elegantWeddingSvg(),
  'dia-de-muertos': elegantWeddingSvg(),
  'carnival-fun': elegantWeddingSvg(),
  'retro-pop': elegantWeddingSvg(),
};

function elegantWeddingSvg() {
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8e8f0"/>
      <stop offset="50%" stop-color="#fde8d8"/>
      <stop offset="100%" stop-color="#fdf0e0"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0e6d0"/>
      <stop offset="100%" stop-color="#e8d8b8"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#fff8f0" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#fff8f0" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>

  <!-- Sky gradient background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>

  <!-- Soft center glow -->
  <ellipse cx="${WIDTH/2}" cy="${HEIGHT*0.4}" rx="700" ry="500" fill="url(#glow)"/>

  <!-- Floor -->
  <rect x="0" y="${HEIGHT*0.78}" width="${WIDTH}" height="${HEIGHT*0.22}" fill="url(#floor)"/>
  <rect x="0" y="${HEIGHT*0.78}" width="${WIDTH}" height="3" fill="#d4b896" opacity="0.6"/>

  <!-- Rose petals scattered on floor -->
  ${petalRow(HEIGHT * 0.82, 12)}
  ${petalRow(HEIGHT * 0.88, 8)}

  <!-- Left floral arch column -->
  <rect x="220" y="${HEIGHT*0.1}" width="18" height="${HEIGHT*0.72}" rx="9" fill="#c8a882" opacity="0.7"/>
  ${floralCluster(229, HEIGHT * 0.12, '#e8b4c8', '#f0c8d8', '#d4889c')}
  ${floralCluster(229, HEIGHT * 0.28, '#f4c4a0', '#f8d4b4', '#e8a878')}
  ${floralCluster(229, HEIGHT * 0.44, '#e8b4c8', '#f0c8d8', '#d4889c')}
  ${floralCluster(229, HEIGHT * 0.60, '#c8d4b0', '#d8e4c0', '#a8b888')}

  <!-- Right floral arch column -->
  <rect x="${WIDTH-238}" y="${HEIGHT*0.1}" width="18" height="${HEIGHT*0.72}" rx="9" fill="#c8a882" opacity="0.7"/>
  ${floralCluster(WIDTH - 229, HEIGHT * 0.12, '#e8b4c8', '#f0c8d8', '#d4889c')}
  ${floralCluster(WIDTH - 229, HEIGHT * 0.28, '#f4c4a0', '#f8d4b4', '#e8a878')}
  ${floralCluster(WIDTH - 229, HEIGHT * 0.44, '#e8b4c8', '#f0c8d8', '#d4889c')}
  ${floralCluster(WIDTH - 229, HEIGHT * 0.60, '#c8d4b0', '#d8e4c0', '#a8b888')}

  <!-- Arch top -->
  <path d="M 229 ${HEIGHT*0.1} Q ${WIDTH/2} ${HEIGHT*-0.18} ${WIDTH-229} ${HEIGHT*0.1}"
    fill="none" stroke="#c8a882" stroke-width="18" stroke-linecap="round" opacity="0.7"/>

  <!-- Arch flowers along top curve -->
  ${archFlowers()}

  <!-- Hanging fabric drape left -->
  <path d="M 200 0 Q 300 ${HEIGHT*0.3} 220 ${HEIGHT*0.72}"
    fill="none" stroke="#f0d8e8" stroke-width="60" opacity="0.35"/>
  <!-- Hanging fabric drape right -->
  <path d="M ${WIDTH-200} 0 Q ${WIDTH-300} ${HEIGHT*0.3} ${WIDTH-220} ${HEIGHT*0.72}"
    fill="none" stroke="#f0d8e8" stroke-width="60" opacity="0.35"/>

  <!-- Fairy lights along arch -->
  ${fairyLights()}

  <!-- Center altar table -->
  <rect x="${WIDTH/2-120}" y="${HEIGHT*0.65}" width="240" height="14" rx="7" fill="#d4b896" opacity="0.8"/>
  <rect x="${WIDTH/2-90}" y="${HEIGHT*0.65}" width="16" height="${HEIGHT*0.14}" rx="8" fill="#c8a070" opacity="0.7"/>
  <rect x="${WIDTH/2+74}" y="${HEIGHT*0.65}" width="16" height="${HEIGHT*0.14}" rx="8" fill="#c8a070" opacity="0.7"/>

  <!-- Candles on altar -->
  <rect x="${WIDTH/2-20}" y="${HEIGHT*0.55}" width="12" height="${HEIGHT*0.1}" rx="6" fill="#f8f0e0"/>
  <rect x="${WIDTH/2+8}" y="${HEIGHT*0.57}" width="10" height="${HEIGHT*0.08}" rx="5" fill="#f8f0e0"/>
  <ellipse cx="${WIDTH/2-14}" cy="${HEIGHT*0.55}" rx="4" ry="7" fill="#f4c040" opacity="0.9"/>
  <ellipse cx="${WIDTH/2+13}" cy="${HEIGHT*0.57}" rx="3" ry="6" fill="#f4c040" opacity="0.9"/>

  <!-- Bokeh light circles (blurred) -->
  ${bokehCircles()}

  <!-- Subtle vignette -->
  <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
    <stop offset="60%" stop-color="transparent"/>
    <stop offset="100%" stop-color="rgba(180,140,120,0.25)"/>
  </radialGradient>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>

  <!-- Flash-It watermark (very subtle) -->
  <text x="${WIDTH/2}" y="${HEIGHT-18}" font-family="Georgia, serif" font-size="22"
    fill="#b89878" opacity="0.4" text-anchor="middle" letter-spacing="6">
    FLASH-IT • VALUCONNECT SOLUTIONS
  </text>
</svg>`;
}

function petalRow(y, count) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = 100 + (i * (WIDTH - 200) / count) + (Math.sin(i * 2.3) * 40);
    const r = 8 + (i % 3) * 4;
    out += `<ellipse cx="${x}" cy="${y + Math.sin(i) * 12}" rx="${r}" ry="${r*0.6}"
      fill="#e8a8b8" opacity="${0.3 + (i % 4) * 0.1}" transform="rotate(${i * 37} ${x} ${y})"/>`;
  }
  return out;
}

function floralCluster(cx, cy, c1, c2, c3) {
  return `
  <circle cx="${cx}" cy="${cy}" r="28" fill="${c1}" opacity="0.85"/>
  <circle cx="${cx-18}" cy="${cy+14}" r="20" fill="${c2}" opacity="0.8"/>
  <circle cx="${cx+18}" cy="${cy+14}" r="20" fill="${c2}" opacity="0.8"/>
  <circle cx="${cx}" cy="${cy+22}" r="22" fill="${c3}" opacity="0.75"/>
  <circle cx="${cx}" cy="${cy}" r="10" fill="#fff8f0" opacity="0.6"/>
  <circle cx="${cx-18}" cy="${cy+14}" r="7" fill="#fff8f0" opacity="0.5"/>
  <circle cx="${cx+18}" cy="${cy+14}" r="7" fill="#fff8f0" opacity="0.5"/>
  `;
}

function archFlowers() {
  let out = '';
  const points = [
    [WIDTH*0.22, HEIGHT*0.08], [WIDTH*0.30, HEIGHT*0.01], [WIDTH*0.38, HEIGHT*-0.03],
    [WIDTH*0.50, HEIGHT*-0.05], [WIDTH*0.62, HEIGHT*-0.03], [WIDTH*0.70, HEIGHT*0.01],
    [WIDTH*0.78, HEIGHT*0.08],
  ];
  const colors = ['#e8b4c8','#f4c4a0','#e8b4c8','#f0c8d8','#e8b4c8','#f4c4a0','#e8b4c8'];
  points.forEach(([x, y], i) => {
    out += `<circle cx="${x}" cy="${y}" r="32" fill="${colors[i]}" opacity="0.8"/>`;
    out += `<circle cx="${x}" cy="${y}" r="14" fill="#fff8f0" opacity="0.6"/>`;
  });
  return out;
}

function fairyLights() {
  let out = '';
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = 229 + t * (WIDTH - 458);
    const y = HEIGHT * 0.1 - Math.sin(Math.PI * t) * HEIGHT * 0.28;
    out += `<circle cx="${x}" cy="${y}" r="5" fill="#fff8c0" opacity="${0.5 + (i%3)*0.2}"/>`;
    out += `<circle cx="${x}" cy="${y}" r="10" fill="#fff8c0" opacity="0.15"/>`;
  }
  return out;
}

function bokehCircles() {
  const circles = [
    [350, 200, 60], [1450, 180, 45], [800, 100, 70], [200, 500, 40],
    [1600, 400, 55], [600, 300, 35], [1200, 250, 50], [900, 80, 42],
  ];
  return circles.map(([x, y, r]) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff8e0" opacity="0.12"/>`
  ).join('');
}

async function getStaticBackground(themeId) {
  const svg = THEMES[themeId] || THEMES['default'];
  return sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .jpeg({ quality: 92 })
    .toBuffer();
}

module.exports = { getStaticBackground };
