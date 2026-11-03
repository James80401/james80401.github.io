// Canvas-drawn textures: nameplates, title cards, the area plaque and small patterns.
import * as THREE from 'three';

const SERIF = "'Instrument Serif', Georgia, serif", SANS = "'DM Sans', 'Segoe UI', Arial, sans-serif";
export async function fontsReady() {
  try { await Promise.all([document.fonts.load(`64px ${SERIF}`), document.fonts.load(`500 24px ${SANS}`), document.fonts.load(`italic 64px ${SERIF}`)]); } catch {}
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; t.needsUpdate = true; return t;
}
function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/), lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line); return lines;
}
function fit(ctx, text, family, weight, maxSize, maxWidth, minSize = 18) {
  let size = maxSize; do { ctx.font = `${weight} ${size}px ${family}`; if (ctx.measureText(text).width <= maxWidth) break; size -= 2; } while (size > minSize);
  return size;
}
export const STATUS_COLORS = {Live: '#24613f', Playable: '#2d6178', 'In progress': '#7d5a17', Prototype: '#6e4573', Concept: '#55584a'};
function chip(ctx, x, y, label, scale = 1) {
  ctx.font = `600 ${22 * scale}px ${SANS}`; const w = ctx.measureText(label.toUpperCase()).width + 34 * scale, h = 40 * scale;
  ctx.fillStyle = STATUS_COLORS[label] || '#7a7d6c'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#fbf6ea'; ctx.textBaseline = 'middle'; ctx.fillText(label.toUpperCase(), x + 17 * scale, y + h / 2 + 1); ctx.textBaseline = 'alphabetic';
  return w;
}

// Small sign on each booth's stand.
export function nameplate(item, accent, dark = false) {
  const [c, ctx] = canvas(1024, 420);
  ctx.fillStyle = dark ? '#16191f' : '#f3eee2'; ctx.fillRect(0, 0, 1024, 420);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, 14, 420);
  ctx.fillStyle = dark ? '#f1e9d6' : '#22362c';
  const size = fit(ctx, item.title, SERIF, 400, 92, 920, 40); ctx.font = `400 ${size}px ${SERIF}`; ctx.fillText(item.title, 52, 140);
  ctx.font = `400 34px ${SANS}`; ctx.fillStyle = dark ? '#b9b3a3' : '#5d6657';
  wrap(ctx, item.tagline, 920).slice(0, 2).forEach((l, i) => ctx.fillText(l, 52, 210 + i * 46));
  let x = 52; x += chip(ctx, x, 320, item.status) + 16;
  if (item.year) { ctx.font = `500 26px ${SANS}`; ctx.fillStyle = dark ? '#a8a291' : '#7c816f'; ctx.textBaseline = 'middle'; ctx.fillText(item.year, x + 6, 341); ctx.textBaseline = 'alphabetic'; }
  return texture(c);
}

// Stand-in screen for a project without imagery: an editorial title card.
export function titleCard(item, area, portrait = false) {
  const W = portrait ? 1000 : 1600, H = portrait ? 1500 : 1000; const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1d2f27'); g.addColorStop(1, area.accent); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.fillStyle = '#d7c49b'; ctx.font = `500 ${portrait ? 30 : 28}px ${SANS}`; ctx.fillText(area.name.toUpperCase(), 90, 140);
  ctx.fillStyle = '#f7f0df'; const maxW = W - 180; let size = fit(ctx, item.title, SERIF, 400, portrait ? 150 : 140, maxW, 60);
  ctx.font = `400 ${size}px ${SERIF}`; const lines = wrap(ctx, item.title, maxW).slice(0, 3);
  const top = portrait ? H * .42 : H * .5 - (lines.length - 1) * size * .5; lines.forEach((l, i) => ctx.fillText(l, 90, top + i * size * 1.02));
  ctx.font = `italic 400 ${portrait ? 54 : 50}px ${SERIF}`; ctx.fillStyle = '#e9d7ad';
  wrap(ctx, item.tagline, maxW).slice(0, 3).forEach((l, i) => ctx.fillText(l, 90, top + lines.length * size * 1.02 + 40 + i * 62));
  chip(ctx, 90, H - 150, item.status, 1.5);
  return texture(c);
}

// Big plaque by the door of each room.
export function plaque(area, count, dark = false) {
  const [c, ctx] = canvas(1400, 1000);
  ctx.fillStyle = dark ? '#15181e' : '#f2ede1'; ctx.fillRect(0, 0, 1400, 1000);
  ctx.strokeStyle = area.accent; ctx.lineWidth = 6; ctx.strokeRect(30, 30, 1340, 940);
  ctx.fillStyle = area.accent; ctx.font = `600 32px ${SANS}`; ctx.fillText(area.kicker, 90, 150);
  ctx.fillStyle = dark ? '#f3ead4' : '#21352b'; const size = fit(ctx, area.name, SERIF, 400, 190, 1220, 90); ctx.font = `400 ${size}px ${SERIF}`; ctx.fillText(area.name, 84, 360);
  ctx.font = `400 40px ${SANS}`; ctx.fillStyle = dark ? '#c4bca8' : '#58614f';
  wrap(ctx, area.lead, 1180).slice(0, 4).forEach((l, i) => ctx.fillText(l, 90, 480 + i * 58));
  ctx.font = `italic 400 64px ${SERIF}`; ctx.fillStyle = dark ? '#e7c983' : '#9f4a32';
  ctx.fillText(`${count} project${count === 1 ? '' : 's'} along this wall`, 90, 820);
  ctx.font = `500 30px ${SANS}`; ctx.fillStyle = dark ? '#9d978a' : '#7c816f'; ctx.fillText('DRIVE UP TO A STAND AND PRESS E, OR CLICK A SCREEN', 90, 900);
  return texture(c);
}

export function pattern(kind) {
  const [c, ctx] = canvas(512, 512);
  if (kind === 'checker') { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.fillStyle = (x + y) % 2 ? '#24262d' : '#8f8a7c'; ctx.fillRect(x * 64, y * 64, 64, 64); } }
  if (kind === 'pegboard') { ctx.fillStyle = '#2f4a40'; ctx.fillRect(0, 0, 512, 512); ctx.fillStyle = '#1b2b25'; for (let y = 16; y < 512; y += 32) for (let x = 16; x < 512; x += 32) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); } }
  if (kind === 'rug') { ctx.fillStyle = '#6e2f22'; ctx.fillRect(0, 0, 512, 512); ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 10; ctx.strokeRect(24, 24, 464, 464); ctx.lineWidth = 4; ctx.strokeRect(48, 48, 416, 416); ctx.strokeStyle = '#2c3b33'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(256, 256, 40 + i * 30, 0, Math.PI * 2); ctx.stroke(); } }
  if (kind === 'concrete') { ctx.fillStyle = '#6d6a62'; ctx.fillRect(0, 0, 512, 512); for (let i = 0; i < 6000; i++) { const v = 90 + Math.random() * 40 | 0; ctx.fillStyle = `rgba(${v},${v - 4},${v - 10},.35)`; ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); } ctx.strokeStyle = '#4f4c46'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, 512, 512); }
  if (kind === 'lightwood') { for (let i = 0; i < 8; i++) { const v = 196 + (Math.random() * 18 | 0); ctx.fillStyle = `rgb(${v},${v * .86 | 0},${v * .7 | 0})`; ctx.fillRect(0, i * 64, 512, 64); ctx.fillStyle = '#a89270'; ctx.fillRect(0, i * 64, 512, 2); for (let k = 0; k < 3; k++) { ctx.fillRect(((i * 197 + k * 171) % 512), i * 64, 2, 64); } } }
  if (kind === 'planks') { for (let i = 0; i < 8; i++) { const v = 120 + (Math.random() * 30 | 0); ctx.fillStyle = `rgb(${v},${v * .72 | 0},${v * .45 | 0})`; ctx.fillRect(0, i * 64, 512, 64); ctx.fillStyle = '#3d2a17'; ctx.fillRect(0, i * 64, 512, 3); } }
  const t = texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
