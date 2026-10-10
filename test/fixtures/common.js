// Builds fixture content. Images are SVG data URIs with real pixel sizes, so layout matches a real reader.
const art = (w, h, hue, label) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<rect width="100%" height="100%" fill="hsl(${hue} 30% 88%)"/>` +
  `<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="#111" stroke-width="6"/>` +
  `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 5}" fill="hsl(${hue} 50% 45%)"/>` +
  `<text x="50%" y="${h - 60}" font-size="48" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`);
const img = (w, h, hue, label, attrs = '') => `<img src="${art(w, h, hue, label)}" width="${w}" height="${h}" alt="${label}" ${attrs}>`;
// deterministic prose
const WORDS = 'the a moon river night quiet small heart under over sword light shadow city long road ran she he they it was is were to from with into and but because then never always slowly bright cold old letter door window story'.split(' ');
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const sentence = () => { const n = 8 + Math.floor(rnd() * 14); const w = Array.from({ length: n }, () => WORDS[Math.floor(rnd() * WORDS.length)]); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; };
const paragraph = () => Array.from({ length: 3 + Math.floor(rnd() * 4) }, sentence).join(' ');
