// lib/icons.js
// Inline SVG icons. Paths are from Lucide (https://lucide.dev, ISC license) so the UI
// has one consistent icon set instead of OS-dependent emoji. Icons inherit
// `currentColor`; size them with the `size` argument or CSS on .icon.

const PATHS = {
  "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M4.929 4.929 19.07 19.071\"/>",
  "calendar": "<path d=\"M8 2v3\"/><path d=\"M16 2v3\"/><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18\"/>",
  "chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>",
  "circle-x": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m15 9-6 6\"/><path d=\"m9 9 6 6\"/>",
  "circle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>",
  "coffee": "<path d=\"M10 2v2\"/><path d=\"M14 2v2\"/><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\"/><path d=\"M6 2v2\"/>",
  "flag-triangle-right": "<path d=\"M6 22V2.8a.8.8 0 0 1 1.17-.71l11.38 5.69a.8.8 0 0 1 0 1.44L6 15.5\"/>",
  "flag": "<path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\"/>",
  "gauge": "<path d=\"m12 14 4-4\"/><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>",
  "map-pin": "<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
  "medal": "<path d=\"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15\"/><path d=\"M11 12 5.12 2.2\"/><path d=\"m13 12 5.88-9.8\"/><path d=\"M8 7h8\"/><circle cx=\"12\" cy=\"17\" r=\"5\"/><path d=\"M12 18v-2h-.5\"/>",
  "play": "<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\"/>",
  "swords": "<path d=\"m13 19 6-6\"/><path d=\"M14.5 17.5 3.586 6.586A2 2 0 013 5.172V3h2.172a2 2 0 011.414.586L17.5 14.5\"/><path d=\"m14.828 6.172 2.586-2.586A2 2 0 0118.828 3H21v2.172a2 2 0 01-.586 1.414l-2.586 2.586\"/><path d=\"m16 16 4 4\"/><path d=\"m19 21 2-2\"/><path d=\"m5 14 4 4\"/><path d=\"m5 21-2-2\"/><path d=\"M7.5 16.5 4 20\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
  "timer": "<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\"/><line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\"/><circle cx=\"12\" cy=\"14\" r=\"8\"/>",
  "trending-down": "<path d=\"M16 17h6v-6\"/><path d=\"m22 17-8.5-8.5-5 5L2 7\"/>",
  "trending-up": "<path d=\"M16 7h6v6\"/><path d=\"m22 7-8.5 8.5-5-5L2 17\"/>",
  "trophy": "<path d=\"M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2\"/><path d=\"M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2\"/><path d=\"M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3\"/><path d=\"M4 22h16\"/><path d=\"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z\"/><path d=\"M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3\"/>",
  "zap": "<path d=\"M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z\"/>",
};

/**
 * Returns an inline <svg> string for a Lucide icon name.
 * @param {string} name - key of PATHS (e.g. 'trophy')
 * @param {number} [size=16] - width/height in px
 * @param {string} [extraClass] - extra class names appended to 'icon'
 */
export function icon(name, size = 16, extraClass = '') {
  const paths = PATHS[name];
  if (!paths) return '';
  return `<svg class="icon icon-${name} ${extraClass}`.trim() + `" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

// Emoji → icon mapping for the stat tiles, so call sites can keep their data
// definitions (label/value/icon) and render the icon through statIcon().
const EMOJI_TO_ICON = {
  '🏆': { name: 'trophy' },
  '📊': { name: 'chart-column' },
  '🥇': { name: 'medal', tone: 'gold' },
  '🏁': { name: 'flag' },
  '🎯': { name: 'target' },
  '🟣': { name: 'timer', tone: 'purple' },
  '🟢': { name: 'circle', tone: 'green', fill: true },
  '🟡': { name: 'circle', tone: 'yellow', fill: true },
  '🔴': { name: 'circle', tone: 'red', fill: true },
  '🏎️': { name: 'gauge' },
  '🏎': { name: 'gauge' },
  '❌': { name: 'circle-x', tone: 'red' },
  '📈': { name: 'trending-up' },
  '📍': { name: 'map-pin' },
  '📅': { name: 'calendar' },
  '🕐': { name: 'clock' },
  '🌍': { name: 'globe' },
  '🏖️': { name: 'coffee' },
  '⚔️': { name: 'swords' },
  '⛔': { name: 'ban' },
  '▶': { name: 'play' },
};

/**
 * Renders the icon for a legacy emoji key (e.g. '🏆') as a tone-coloured inline SVG.
 * Falls back to the raw text when the emoji has no mapping.
 * @param {string} emoji
 * @param {number} [size=16]
 */
export function statIcon(emoji, size = 16) {
  const entry = EMOJI_TO_ICON[emoji];
  if (!entry) return emoji;
  const svg = icon(entry.name, size, entry.tone ? `tone-${entry.tone}` : '');
  return entry.fill ? svg.replace('fill="none"', 'fill="currentColor"') : svg;
}

/** Podium badge (gold/silver/bronze numbered disc) for positions 1–3; plain number otherwise. */
export function medalIcon(position) {
  return position >= 1 && position <= 3
    ? `<span class="medal medal-${position}" aria-label="P${position}">${position}</span>`
    : String(position);
}
