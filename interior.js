// Builds an area's room from its project list: a long hall seen in cutaway, one stand and
// one screen per project along the back wall, the door back to the courtyard on the left.
import * as THREE from 'three';
import {createWorld} from './controller.js';
import {nameplate, titleCard, plaque, pattern} from './textures.js';

const THEMES = {
  shop: {bg: '#16201c', hemi: [0xd8e4ec, 0x4a3a2a, 1.6], wall: 'brick', lower: 'pegboard', floor: 'concrete', frame: 'monitor', stand: 'bench', dark: false, spacing: 3.8, lamp: 0xcfe6ff},
  arcade: {bg: '#0f1116', hemi: [0x9aa6c8, 0x2a2030, 1.15], wall: '#23252f', lower: '#1b1d25', floor: 'checker', frame: 'cabinet', stand: 'cabinet', dark: true, spacing: 3.7, lamp: 0xffd9a0},
  studio: {bg: '#1a201d', hemi: [0xfff6e6, 0x7a6a55, 2.1], wall: '#e7e0d0', lower: '#ddd5c3', floor: 'lightwood', frame: 'gallery', stand: 'plinth', dark: false, spacing: 3.8, lamp: 0xfff1d8},
  mill: {bg: '#171a14', hemi: [0xe6d8c0, 0x4a3420, 1.7], wall: 'brick', lower: 'brick', floor: 'planks', frame: 'iron', stand: 'pedestal', dark: false, spacing: 3.8, lamp: 0xffc27a},
  reading: {bg: '#141a16', hemi: [0xf3e2c4, 0x3a2a1a, 1.55], wall: '#22382e', lower: 'oak', floor: 'planks', frame: 'gilt', stand: 'lectern', dark: false, spacing: 3.0, lamp: 0xffd08a},
};
const ENTRY = 7.6, BACK = -6.1, FRONT = 5.6, H = 6.8;

export function buildInterior({area, items, kit, renderer, loadTexture}) {
  const T = THEMES[area.theme] || THEMES.studio;
  const n = items.length, S = T.spacing, L = ENTRY + n * S + 2.6;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(T.bg);
  scene.add(new THREE.HemisphereLight(...T.hemi));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12, near: .5, far: 40}); key.shadow.bias = -.0005; key.shadow.normalBias = .03;
  scene.add(key, key.target);
  const disposables = [];
  const std = (opts) => { const m = new THREE.MeshStandardMaterial({roughness: .8, ...opts}); disposables.push(m); return m; };
  const surface = (spec, repeat = [1, 1]) => {
    if (spec === 'brick' && kit.brick) { const t = kit.brick.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.needsUpdate = true; disposables.push(t); return std({map: t, color: '#d8c3b4'}); }
    if (spec === 'oak' && kit.oak) { const t = kit.oak.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.needsUpdate = true; disposables.push(t); return std({map: t, color: area.theme === 'studio' ? '#f3dcc0' : '#ffffff'}); }
    if (['pegboard', 'checker', 'concrete', 'planks', 'rug', 'lightwood'].includes(spec)) { const t = pattern(spec); t.repeat.set(...repeat); disposables.push(t); return std({map: t, roughness: spec === 'checker' ? .45 : .85}); }
    return std({color: spec});
  };
  const box = (w, h, d, mat, x, y, z, shadow = true) => {
    const g = new THREE.BoxGeometry(w, h, d); disposables.push(g); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
  };
  const iron = std({color: '#1d2421', roughness: .45, metalness: .6}), brass = std({color: '#b8863d', roughness: .35, metalness: .75});
  const glow = c => { const m = new THREE.MeshBasicMaterial({color: c, toneMapped: false}); disposables.push(m); return m; };

  // Shell: floor, back wall in two bands, side walls with the door on the left.
  box(L, .2, FRONT - BACK, surface(T.floor, T.floor === 'checker' ? [L / 2.2, (FRONT - BACK) / 2.2] : [L / 4, (FRONT - BACK) / 4]), L / 2, -.1, (FRONT + BACK) / 2, false);
  box(L + .6, .35, .25, iron, L / 2, .02, FRONT + .1, false);
  box(L, H - 1.3, .3, surface(T.wall, [L / 3.8, (H - 1.3) / 3.8]), L / 2, 1.3 + (H - 1.3) / 2, BACK - .15);
  box(L, 1.3, .32, surface(T.lower, [L / 3.8, 1.3 / 3.8]), L / 2, .65, BACK - .14);
  box(L, .12, .4, area.theme === 'reading' ? brass : iron, L / 2, 1.33, BACK + .02);
  const sideMat = surface(T.wall, [(FRONT - BACK) / 3.8, H / 3.8]);
  box(.3, H, FRONT - BACK, sideMat, L + .15, H / 2, (FRONT + BACK) / 2);
  const doorZ = 1.0, doorW = 2.8, doorH = 3.3;
  box(.3, H, (doorZ - doorW / 2) - BACK, sideMat, -.15, H / 2, (BACK + doorZ - doorW / 2) / 2);
  box(.3, H, FRONT - (doorZ + doorW / 2), sideMat, -.15, H / 2, (FRONT + doorZ + doorW / 2) / 2);
  box(.3, H - doorH, doorW, sideMat, -.15, doorH + (H - doorH) / 2, doorZ);
  box(.36, .16, doorW + .3, brass, -.12, doorH, doorZ); for (const s of [-1, 1]) box(.36, doorH, .14, iron, -.12, doorH / 2, doorZ + s * doorW / 2);
  const outside = box(.05, doorH - .1, doorW - .2, glow('#f1d39a'), -.32, doorH / 2, doorZ, false); outside.castShadow = false;
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .5), new THREE.MeshBasicMaterial({map: signTexture('BACK TO THE RIVERFRONT'), toneMapped: false}));
  exitSign.position.set(.02, doorH + .45, doorZ); exitSign.rotation.y = Math.PI / 2; scene.add(exitSign); disposables.push(exitSign.geometry, exitSign.material);

  // Plaque by the door.
  const pq = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.57), new THREE.MeshBasicMaterial({map: plaque(area, n, T.dark), toneMapped: false}));
  pq.position.set(3.9, 3.05, BACK + .08); scene.add(pq); disposables.push(pq.geometry, pq.material);
  box(3.85, 2.82, .06, area.theme === 'reading' || area.theme === 'mill' ? brass : iron, 3.9, 3.05, BACK + .0);

  // Theme decor between the booths.
  decorate({scene, box, T, area, L, n, S, iron, brass, glow, std, surface});

  // Booths.
  const booths = [], screens = [], lamps = [];
  items.forEach((item, i) => {
    const x = ENTRY + S * (i + .5);
    const media = item.media?.[0];
    const portrait = area.theme === 'reading' || (media && media.h > media.w * 1.1);
    let aspect = media ? media.w / media.h : (portrait ? 2 / 3 : 1.6);
    const cab = T.frame === 'cabinet';
    let fh = cab ? 1.45 : portrait ? 2.25 : 1.85, fw = fh * aspect;
    const maxW = S - (cab ? .9 : .6); if (fw > maxW) { fw = maxW; fh = fw / aspect; }
    const fy = cab ? 2.35 : portrait ? 2.85 : 2.95, fz = cab ? BACK + .95 : BACK + .06;
    // The screen itself.
    const screenMat = new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: false}); disposables.push(screenMat);
    const placeholder = titleCard(item, area, portrait); disposables.push(placeholder); screenMat.map = placeholder;
    if (media) loadTexture(media.file).then(t => { screenMat.map = t; screenMat.needsUpdate = true; disposables.push(t); }).catch(() => {});
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), screenMat); scr.position.set(x, fy, fz + .125); scr.userData.item = item; scene.add(scr); screens.push(scr); disposables.push(scr.geometry);
    frame({scene, box, T, x, y: fy, z: fz, fw, fh, iron, brass, std, glow, area, item});
    // The stand and its nameplate.
    const stand = standFor({scene, box, T, x, fw, iron, brass, std, glow, area, cab, fh, fy});
    const np = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .51), new THREE.MeshBasicMaterial({map: nameplate(item, area.accent, T.dark), toneMapped: false}));
    np.position.copy(stand.plate); np.rotation.x = stand.tilt; scene.add(np); disposables.push(np.geometry, np.material, np.material.map);
    booths.push({id: item.id, item, x, z: -3.05, label: item.title, kind: 'project', top: new THREE.Vector3(x, fy + fh / 2 + .55, fz)});
    lamps.push(new THREE.Vector3(x, 4.6, BACK + 1.6));
  });

  const pool = Array.from({length: 4}, () => { const l = new THREE.PointLight(T.lamp, 14, 6.5, 1.8); scene.add(l); return l; });
  let lastPick = -1;
  const obstacles = booths.map(b => [b.x - .6, b.x + .6, -5.35, -4.15]);
  obstacles.push([L - 1.4, L + 1, BACK, FRONT]); // keep a margin at the far end
  const exit = {id: 'exit', kind: 'exit', x: 1.45, z: doorZ, label: 'Back to the riverfront'};
  const world = createWorld({bounds: {x0: .75, x1: L - .75, z0: -4.25, z1: FRONT - .9}, obstacles, interactables: [exit, ...booths]});
  return {
    id: area.id, area, scene, world, booths, screens, exit,
    spawn: {x: 3.0, z: doorZ, yaw: Math.PI / 2},
    labels: booths.map(b => ({id: b.id, label: b.label, status: b.item.status, position: b.top})),
    camera: {offset: new THREE.Vector3(1.2, 6.9, 12.6), look: new THREE.Vector3(0, 1.7, -4.4), clampX: [6, Math.max(6, L - 6)]},
    intro: null,
    update(dt, t, focus) {
      const fx = focus.x; key.target.position.set(fx, 0, -1); key.position.set(fx + 4, 12, 9);
      if (t - lastPick > .3) { lastPick = t; lamps.sort((a, b) => Math.abs(a.x - fx) - Math.abs(b.x - fx)); pool.forEach((l, i) => { const p = lamps[i]; if (p) l.position.copy(p); else l.intensity = 0; }); }
    },
    setQuality(low) { key.castShadow = !low; },
    dispose() { for (const d of disposables) d.dispose?.(); },
  };
}

function signTexture(text) {
  const c = document.createElement('canvas'); c.width = 760; c.height = 200; const ctx = c.getContext('2d');
  ctx.fillStyle = '#20372e'; ctx.fillRect(0, 0, 760, 200); ctx.strokeStyle = '#d7b36d'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, 740, 180);
  ctx.fillStyle = '#f3ead4'; ctx.font = "500 46px 'DM Sans', Arial, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 380, 104);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function frame({scene, box, T, x, y, z, fw, fh, iron, brass, std, glow, area}) {
  const m = T.frame;
  if (m === 'monitor') {
    box(fw + .16, fh + .16, .1, iron, x, y, z + .02); box(.12, y - fh / 2 - 1.15, .1, iron, x, (y - fh / 2 + 1.15) / 2, z + .02);
    box(fw + .05, .04, .03, glow('#7fc4ff'), x, y - fh / 2 - .09, z + .08, false);
  } else if (m === 'gallery') {
    const mat = std({color: '#f7f4ec', roughness: .95}); box(fw + .36, fh + .36, .05, mat, x, y, z + .03); box(fw + .46, fh + .46, .04, std({color: '#111', roughness: .4}), x, y, z + .005);
  } else if (m === 'iron') {
    box(fw + .3, fh + .3, .1, iron, x, y, z + .02);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const r = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), brass); r.position.set(x + sx * (fw / 2 + .08), y + sy * (fh / 2 + .08), z + .08); scene.add(r); }
  } else if (m === 'gilt') {
    box(fw + .28, fh + .28, .1, brass, x, y, z + .02); box(fw + .12, fh + .12, .11, std({color: '#5a3a1c', roughness: .6}), x, y, z + .025);
  } else if (m === 'cabinet') {
    const body = std({color: '#2a2d38', roughness: .5}), trim = glow(area.accent);
    box(fw + .7, 3.55, 1.0, body, x, 1.775, z - .45);
    box(fw + .14, fh + .14, .06, std({color: '#08090c', roughness: .3}), x, y, z + .03);
    box(fw + .7, .5, .3, glow('#1e2230'), x, 3.75, z - .15);
    box(fw + .66, .06, .02, trim, x, 3.52, z + .01, false); box(fw + .66, .06, .02, trim, x, 3.98, z + .01, false);
    for (const s of [-1, 1]) box(.05, 3.4, .02, trim, x + s * (fw / 2 + .33), 1.75, z + .06, false);
  }
}

function standFor({scene, box, T, x, iron, brass, std, glow, cab, fy, fh}) {
  const plateTilt = -.55;
  if (cab) {
    const panel = box(1.5, .14, .7, std({color: '#30333f', roughness: .5}), x, 1.18, -4.55);
    panel.rotation.x = -.35;
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .05, 12), glow(['#e8584a', '#f2c14e', '#3fc1c9', '#ffffff'][k])); b.position.set(x - .45 + k * .3, 1.3, -4.62); b.rotation.x = -.35; scene.add(b); }
    return {plate: new THREE.Vector3(x, 1.0, -4.2), tilt: -.2};
  }
  if (T.stand === 'bench') {
    box(1.7, .1, .8, std({color: '#7a5634', roughness: .75}), x, .95, -4.65); for (const s of [-1, 1]) box(.08, .95, .7, iron, x + s * .75, .475, -4.65);
    return {plate: new THREE.Vector3(x, 1.22, -4.55), tilt: plateTilt};
  }
  if (T.stand === 'plinth') {
    box(1.4, 1.0, .7, std({color: '#f4f1e8', roughness: .9}), x, .5, -4.65);
    return {plate: new THREE.Vector3(x, 1.18, -4.55), tilt: plateTilt};
  }
  if (T.stand === 'pedestal') {
    box(.28, .95, .28, iron, x, .475, -4.65); box(1.4, .08, .7, iron, x, .98, -4.65); box(.8, .06, .5, iron, x, .03, -4.65);
    return {plate: new THREE.Vector3(x, 1.2, -4.55), tilt: plateTilt};
  }
  // lectern
  box(.22, 1.0, .22, std({color: '#5a3a1c', roughness: .6}), x, .5, -4.65); box(.9, .06, .5, std({color: '#5a3a1c'}), x, .03, -4.65);
  const top = box(1.4, .07, .66, std({color: '#6b4524', roughness: .55}), x, 1.08, -4.6); top.rotation.x = -.45;
  return {plate: new THREE.Vector3(x, 1.2, -4.53), tilt: -.55};
}

function decorate({scene, box, T, area, L, n, S, iron, brass, glow, std}) {
  const xs = Array.from({length: n + 1}, (_, i) => ENTRY + S * i);
  if (area.theme === 'arcade') {
    for (const y of [.18, 4.95, H - .35]) box(L - .2, .06, .04, glow(y < 1 ? '#3fc1c9' : '#e8584a'), L / 2, y, BACK + .04, false);
    for (const x of xs) { box(.05, 3.6, .04, glow('#f2c14e'), x, 2.9, BACK + .05, false); }
  }
  if (area.theme === 'shop') {
    for (const x of xs.slice(1, -1)) { box(.12, H - .4, .12, iron, x, (H - .4) / 2, BACK + .12); }
    for (let i = 0; i < n; i++) { const x = ENTRY + S * (i + .5); box(.04, .9, .04, iron, x, 4.95, BACK + 1.6, false); const shade = new THREE.Mesh(new THREE.ConeGeometry(.32, .3, 16, 1, true), iron); shade.position.set(x, 4.38, BACK + 1.6); scene.add(shade); box(.14, .1, .14, glow('#fff2d0'), x, 4.25, BACK + 1.6, false); }
  }
  if (area.theme === 'studio') {
    box(L - .4, .06, .12, iron, L / 2, 4.95, BACK + 1.4, false);
    for (let i = 0; i < n; i++) { const x = ENTRY + S * (i + .5); const head = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .32, 12), iron); head.position.set(x, 4.78, BACK + 1.4); head.rotation.x = .7; scene.add(head); }
  }
  if (area.theme === 'mill') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, L - .4, 10), iron); shaft.rotation.z = Math.PI / 2; shaft.position.set(L / 2, 4.75, BACK + .9); scene.add(shaft);
    for (let i = 0; i < n; i++) { const x = ENTRY + S * (i + .5); const p = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .16, 20), brass); p.rotation.z = Math.PI / 2; p.position.set(x, 4.75, BACK + .9); scene.add(p); }
    for (const x of xs.slice(1, -1)) { gear(scene, iron, brass, x, 2.4, BACK + .12, .55); }
    for (const x of xs) box(.22, H, .22, std({color: '#3a2a1c'}), x, H / 2, BACK + .2);
  }
  if (area.theme === 'reading') {
    const rug = std({map: pattern('rug'), roughness: .95}); rug.map.repeat.set(Math.max(1, L / 6), 1);
    box(L - 2, .02, 2.2, rug, L / 2 + .6, .01, -1.6, false);
    const books = ['#6e2f22', '#2c4a3c', '#b8863d', '#24324a', '#7a4a2c', '#cdbb94'].map(c => std({color: c, roughness: .7}));
    for (const x of xs) {
      box(.5, 3.9, .45, std({color: '#4a2f17', roughness: .7}), x, 1.95, BACK + .28);
      for (let s = 0; s < 6; s++) { box(.5, .04, .45, std({color: '#3a2412'}), x, .3 + s * .62, BACK + .28); for (let k = 0; k < 3; k++) box(.1, .28 + Math.random() * .1, .3, books[(s * 3 + k + Math.round(x)) % books.length], x - .14 + k * .13, .47 + s * .62, BACK + .3, false); }
    }
  }
}

function gear(scene, iron, brass, x, y, z, r) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 8, 28), iron); ring.position.set(x, y, z); scene.add(ring);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; const t = new THREE.Mesh(new THREE.BoxGeometry(.1, .14, .1), iron); t.position.set(x + Math.cos(a) * (r + .08), y + Math.sin(a) * (r + .08), z); t.rotation.z = a; scene.add(t); }
  for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(r * 2, .05, .05), brass); s.position.set(x, y, z); s.rotation.z = k * Math.PI / 4; scene.add(s); }
}
