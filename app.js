import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {move, nearest, place, createState, reset, findPath} from './controller.js';
import {loadDistrict} from './district.js';
import {buildInterior} from './interior.js';
import {fontsReady} from './textures.js';
import {AREAS, AREA, BUILDINGS} from './areas.js';
import {PROJECTS} from './data.js';
import {render as renderPage, mediaFor, mediaLabel, mediaCaption, esc} from './pages.js';
import {CONTACT} from './contact.js';

const $ = s => document.querySelector(s);
const asset = name => 'assets/' + name;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const panel = $('#panel'), input = {};
let lowPower = matchMedia('(pointer:coarse)').matches;
let renderer, camera, district, current, rover, state, started = false, ready = false, failed = false, paused = false, busy = false, initializing = false;
let pendingVisit = null, clock = 0, frames = 0, frameMs = 0, lastNear = null, lastFocus = null;
const interiors = new Map();
const markers = [];
const lookNow = new THREE.Vector3(), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3(), tmp = new THREE.Vector3();

// ---------------------------------------------------------------- pages and routing
function routeFromHash() { return decodeURIComponent(location.hash.replace(/^#\/?/, '')); }
function go(route) { if (routeFromHash() === route) handleRoute(); else location.hash = '/' + route; }
const TITLE = 'James Shields: The Workshop';
function closePanel() {
  if (panel.open) panel.close();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  document.title = TITLE;
}
function ensureWorld() { if (!initializing && !ready && !failed) { initializing = true; init(); } }
function handleRoute() {
  const route = routeFromHash();
  if (!route) { if (panel.open) panel.close(); document.title = TITLE; return; }
  if (route.startsWith('visit/')) {
    history.replaceState(null, '', location.pathname + location.search); if (panel.open) panel.close();
    if (ready) visit(route.slice(6)); else { pendingVisit = route.slice(6); ensureWorld(); }
    return;
  }
  const page = renderPage(route);
  if (!page) { closePanel(); notify('That page could not be found.'); return; }
  clearInput();
  if (!panel.open) lastFocus = document.activeElement;
  $('#panel-content').innerHTML = page.html;
  const h2 = $('#panel-content h2'); if (h2) h2.id = 'panel-title';
  $('#panel-crumb').textContent = crumb(route);
  if (!panel.open) panel.showModal();
  panel.scrollTop = 0; $('#close-panel').focus({preventScroll: true});
  document.title = `${page.title} · James Shields`;
  panel.dataset.route = route;
}
function crumb(route) {
  const p = route.split('/');
  if (p[0] === 'area') return p.length === 3 ? `${AREA[p[1]]?.name || ''} / Project` : `The riverfront / ${AREA[p[1]]?.name || ''}`;
  if (p[0] === 'venture') return 'Own ventures';
  return 'James Shields / Independent development';
}
window.addEventListener('hashchange', handleRoute);
$('.skip').addEventListener('click', e => { e.preventDefault(); $('#navigation').focus(); });
panel.addEventListener('close', () => { clearInput(); if (location.hash && !location.hash.startsWith('#/visit')) history.replaceState(null, '', location.pathname + location.search); document.title = TITLE; const f = lastFocus && lastFocus !== document.body && lastFocus.closest?.('#experience') && !lastFocus.closest('.utilities,header,.intro') ? $('#world') : lastFocus; f?.focus?.({preventScroll: true}); ensureWorld(); });
$('#close-panel').addEventListener('click', closePanel);
document.addEventListener('click', e => {
  const r = e.target.closest('button[data-route], a[data-route]'); if (r) { e.preventDefault(); go(r.dataset.route); return; }
  const v = e.target.closest('[data-visit]'); if (v) { e.preventDefault(); closePanel(); visit(v.dataset.visit); return; }
  const t = e.target.closest('[data-thumb]'); if (t) {
    const m = mediaFor(panel.dataset.route || '')[+t.dataset.thumb]; if (!m) return;
    const gallery = $('#panel-content .gallery'), main = gallery.querySelector('.gallery-main');
    main.src = m.file; main.alt = m.alt || `${gallery.dataset.title}: ${m.caption || mediaLabel(m)}`; main.width = m.w || main.width; main.height = m.h || main.height;
    gallery.querySelector('.gallery-caption').textContent = mediaCaption(m);
    const open = gallery.querySelector('.gallery-open'); open.href = m.file; open.setAttribute('aria-label', `Open full-size image: ${gallery.dataset.title}, ${mediaCaption(m)}`);
    document.querySelectorAll('#panel-content .thumb').forEach(b => { b.classList.toggle('active', b === t); b.setAttribute('aria-pressed', String(b === t)); });
  }
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('#contact-form'); if (!f) return; e.preventDefault();
  const data = Object.fromEntries(new FormData(f)), status = f.querySelector('.form-status');
  const bad = [...f.elements].find(x => x.required && !x.value.trim()) || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && f.elements.email);
  if (bad) { status.textContent = 'Please fill in your name, a valid email and a short message.'; bad.focus(); return; }
  if (CONTACT.formEndpoint) {
    status.textContent = 'Sending…';
    try {
      const r = await fetch(CONTACT.formEndpoint, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(data)});
      if (!r.ok) throw new Error(r.status); f.reset(); status.textContent = 'Thanks. Your message is on its way, and I will reply by email.';
    } catch { status.textContent = CONTACT.email ? `That did not go through. Please email ${CONTACT.email} instead.` : 'That did not go through. Please try again in a moment.'; }
  } else if (CONTACT.email) {
    location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Project enquiry from ' + data.name)}&body=${encodeURIComponent(data.message + '\n\n' + data.name + ' <' + data.email + '>')}`;
    status.textContent = 'Your email app should open with the message ready to send.';
  }
});

// ---------------------------------------------------------------- HUD helpers
function notify(text) { $('#notice').textContent = text; clearTimeout(notify.t); notify.t = setTimeout(() => $('#notice').textContent = '', 4200); }
function clearInput() { for (const k of Object.keys(input)) input[k] = false; if (state) { state.speed = 0; state.path = null; } }
function start() { if (started) return; started = true; document.body.classList.add('exploring'); $('#world').focus({preventScroll: true}); }
function fade(on) { return new Promise(res => { const f = $('#fade'); f.classList.toggle('on', on); setTimeout(res, reduced ? 0 : 380); }); }

function buildMarkers(world) {
  $('#markers').replaceChildren(); markers.length = 0;
  for (const l of world.labels) {
    const b = document.createElement('button'); b.className = 'marker' + (world.id === 'district' ? ' building' : ' booth');
    b.innerHTML = world.id === 'district' ? esc(l.label) : `${esc(l.label)}<small>${esc(l.status || '')}</small>`;
    b.setAttribute('aria-label', world.id === 'district' ? `Go to ${l.label}` : `Open ${l.label}`);
    b.addEventListener('click', () => world.id === 'district' ? openBuilding(l.id) : go(`area/${world.id}/${l.id}`));
    $('#markers').append(b); markers.push({button: b, label: l});
  }
}
function setPlace(world) {
  const inside = world.id !== 'district';
  document.body.classList.toggle('inside', inside);
  $('#place').hidden = !inside;
  if (inside) { $('#place-name').textContent = world.area.name; $('#place-count').textContent = `${world.booths.length} projects`; $('#booth-count').textContent = `${world.booths.length} stands`; state.booth = null; }
}

// ---------------------------------------------------------------- moving between the row and the rooms
function openBuilding(id) {
  const b = BUILDINGS[id]; if (!b) return;
  if (b.kind === 'area') return visit(b.area);
  go(b.page);
}
async function enterArea(areaId) {
  const area = AREA[areaId]; if (!area || busy) return; busy = true; clearInput();
  await fade(true);
  try {
    let room = interiors.get(areaId);
    if (!room) {
      room = buildInterior({area, items: PROJECTS[areaId] || [], kit: district.kit, renderer, loadTexture});
      interiors.set(areaId, room);
      if (interiors.size > 3) { const [oldId, old] = interiors.entries().next().value; if (old !== current) { old.dispose(); interiors.delete(oldId); } }
    }
    switchTo(room, room.spawn);
    notify(`${area.name}: drive along the wall, or click a screen.`);
  } catch (e) { console.error(e); notify('That building could not open. Try Simple view.'); }
  await fade(false); busy = false;
}
async function leaveArea() {
  if (current === district || busy) return; busy = true; clearInput();
  const id = current.area.id, e = district.manifest.entrances.find(x => x.id === id);
  await fade(true);
  switchTo(district, {x: e.x, z: e.z + .4, yaw: 0});
  await fade(false); busy = false;
}
async function visit(areaOrBuilding) {
  if (!ready) { pendingVisit = areaOrBuilding; ensureWorld(); notify('Opening the riverfront.'); return; }
  start();
  if (AREA[areaOrBuilding]) {
    if (current.id === areaOrBuilding) return;
    if (current !== district) { await leaveArea(); }
    return enterArea(areaOrBuilding);
  }
  const e = district.manifest.entrances.find(x => x.id === areaOrBuilding); if (!e) return;
  if (current !== district) await leaveArea();
  busy = true; await fade(true); place(state, {x: e.x, z: e.z + .4, yaw: Math.PI}); snapCamera(); await fade(false); busy = false;
}
function switchTo(world, spot) {
  if (current) current.scene.remove(rover);
  current = world; world.scene.add(rover); place(state, spot); state.spawn = spot.spawn || world.spawn;
  buildMarkers(world); setPlace(world); world.setQuality?.(lowPower); lastNear = null; snapCamera();
}
function loadTexture(file) {
  return new THREE.TextureLoader().loadAsync(file).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; });
}

// ---------------------------------------------------------------- input
$('#explore').addEventListener('click', start);
$('#home').addEventListener('click', e => { e.preventDefault(); closePanel(); if (current !== district) leaveArea(); });
$('#leave').addEventListener('click', leaveArea);
$('#reset').addEventListener('click', () => { reset(state); clearInput(); snapCamera(); notify('Rover returned to the start.'); });
$('#quality').addEventListener('click', () => { lowPower = !lowPower; applyQuality(); notify(lowPower ? 'Low-power mode on.' : 'Full quality on.'); });
$('#interact').addEventListener('click', interact);
$('#prev-booth').addEventListener('click', () => stepBooth(-1));
$('#next-booth').addEventListener('click', () => stepBooth(1));
$('#map-toggle').addEventListener('click', () => toggleMap());
function toggleMap(force) {
  const m = $('#map'), open = force ?? m.hidden; m.hidden = !open; $('#map-toggle').setAttribute('aria-expanded', String(open));
  if (open) m.querySelector('button')?.focus();
}
$('#map').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; toggleMap(false); const id = b.dataset.go; BUILDINGS[id]?.kind === 'area' ? visit(BUILDINGS[id].area) : visit(id); });
function buildMap() {
  const row = district.manifest.entrances.slice().sort((a, b) => a.x - b.x);
  $('#map-list').innerHTML = row.map(e => {
    const b = BUILDINGS[e.id], n = b.kind === 'area' ? (PROJECTS[b.area] || []).length : 0;
    return `<li><button data-go="${e.id}"><span>${esc(b.label)}</span><small>${b.kind === 'area' ? `${n} projects` : b.page === 'about' ? 'About James' : b.page === 'contact' ? 'Contact' : 'Own venture'}</small></button></li>`;
  }).join('');
}
// Clicking HUD buttons should not swallow driving keys afterwards.
document.querySelector('#experience').addEventListener('click', e => {
  if (!e.detail || e.target.closest('#map-toggle')) return;
  if (e.target.closest('button') && !panel.open) setTimeout(() => { if (!panel.open && $('#map').hidden) $('#world').focus({preventScroll: true}); }, 0);
});
const keymap = {KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'brake'};
window.addEventListener('keydown', e => {
  if (panel.open) return;
  if (e.code === 'Escape') { if (!$('#map').hidden) return toggleMap(false); if (current !== district) return leaveArea(); }
  if (e.target.closest('input,textarea,select,button,a,#map')) return;
  if (keymap[e.code]) { e.preventDefault(); input[keymap[e.code]] = true; start(); }
  if (e.code === 'KeyR') { reset(state); clearInput(); }
  if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) interact();
  if (e.code === 'KeyM') toggleMap();
  if (current !== district && (e.code === 'BracketLeft' || e.code === 'KeyQ')) stepBooth(-1);
  if (current !== district && (e.code === 'BracketRight' || e.code === 'KeyF')) stepBooth(1);
});
window.addEventListener('keyup', e => { if (keymap[e.code]) input[keymap[e.code]] = false; });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { paused = document.hidden; clearInput(); clock = 0; });
for (const b of document.querySelectorAll('[data-drive]')) {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); input[b.dataset.drive] = true; start(); });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(n, () => input[b.dataset.drive] = false);
}
function interact() {
  if (!ready || panel.open || busy) return;
  const near = nearest(current.world, state); if (!near) return;
  if (near.kind === 'exit') return leaveArea();
  if (near.kind === 'project') return go(`area/${current.id}/${near.id}`);
  openBuilding(near.building || near.id);
}
function stepBooth(dir) {
  if (current === district || !current.booths.length) return;
  const b = current.booths;
  // Continue from the stand we are heading to; otherwise from the closest one along the wall.
  let from = state.path && Number.isInteger(state.booth) ? state.booth : null;
  if (from === null) {
    let best = Infinity; from = 0; b.forEach((x, k) => { const d = Math.abs(x.x - state.x); if (d < best) { best = d; from = k; } });
    const atStand = Math.abs(b[from].x - state.x) < 1.2 && state.z < -1.5;
    if (!atStand) from = dir > 0 ? (b[from].x > state.x ? from - 1 : from) : (b[from].x < state.x ? from + 1 : from);
  }
  const i = Math.max(0, Math.min(b.length - 1, from + dir));
  state.booth = i; driveTo({x: b[i].x, z: b[i].z});
  $('#booth-count').textContent = `${i + 1} of ${b.length}`;
}
function driveTo(p) { const path = findPath(current.world, state, p); if (path) { start(); state.path = path; } else notify('Choose a clear spot on the floor.'); }

const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
let down = null;
$('#world').addEventListener('pointerdown', e => { down = {x: e.clientX, y: e.clientY}; });
$('#world').addEventListener('pointermove', e => {
  if (!ready || current === district || e.pointerType !== 'mouse') return;
  setPointer(e); const h = ray.intersectObjects(current.screens, false)[0]; $('#world').style.cursor = h ? 'pointer' : '';
});
$('#world').addEventListener('pointerup', e => {
  if (!ready || panel.open || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12 || busy) return; down = null;
  setPointer(e);
  if (current !== district) { const h = ray.intersectObjects(current.screens, false)[0]; if (h) { go(`area/${current.id}/${h.object.userData.item.id}`); return; } }
  if (ray.ray.intersectPlane(ground, hit)) { state.booth = null; driveTo({x: hit.x, z: hit.z}); }
});
function setPointer(e) { const r = $('#world').getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera); }

// ---------------------------------------------------------------- rendering
function applyQuality() {
  if (renderer) { renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1 : 1.6)); renderer.shadowMap.enabled = true; renderer.setSize(innerWidth, innerHeight, false); }
  district?.setQuality(lowPower); for (const r of interiors.values()) r.setQuality(lowPower);
  $('#quality').setAttribute('aria-pressed', String(lowPower));
}
function fallback(error) {
  failed = true; console.error('The 3D riverfront could not start:', error);
  document.body.classList.add('error-mode'); $('#loading').classList.remove('hidden');
  $('#load-status').textContent = 'The 3D riverfront could not load on this device. Everything is in Simple view.';
  $('#loading>span').textContent = 'THE WORKSHOP';
}
function fitScale() { const a = camera.aspect; return a < 1 ? 1 + (1 / a - 1) * .55 : 1; }
function cameraGoals() {
  const c = current.camera, f = fitScale();
  if (current === district && !started && current.intro) { camGoal.copy(current.intro.position); lookGoal.copy(current.intro.target); return; }
  const slack = camera.aspect < 1 ? 3.6 : 0, fx = THREE.MathUtils.clamp(state.x, c.clampX[0] - slack, c.clampX[1] + slack);
  lookGoal.set(fx + c.look.x, c.look.y, state.z + c.look.z);
  camGoal.set(fx + c.offset.x * f, c.offset.y * f, state.z + c.offset.z * f);
}
function snapCamera() { cameraGoals(); camera.position.copy(camGoal); lookNow.copy(lookGoal); camera.lookAt(lookNow); }
function resize() { if (!camera) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); }
window.addEventListener('resize', resize);

function frame(time) {
  if (paused || !ready) return;
  const dt = clock ? Math.min((time - clock) / 1000, .05) : 1 / 60; clock = time;
  if (!panel.open && !busy) move(current.world, state, input, dt);
  rover.position.set(state.x, .04, state.z); rover.rotation.y = state.yaw;
  cameraGoals();
  const k = reduced ? 1 : 1 - Math.exp(-3.2 * dt);
  camera.position.lerp(camGoal, k); lookNow.lerp(lookGoal, k); camera.lookAt(lookNow);
  current.update(dt, time / 1000, state);
  const near = (!busy && started) ? nearest(current.world, state) : null;
  $('#nearby').hidden = !near || panel.open;
  if (near && lastNear !== near) {
    lastNear = near;
    const b = BUILDINGS[near.building || near.id];
    $('#nearby-label').textContent = near.kind === 'exit' ? 'The door to the riverfront' : near.kind === 'project' ? near.label : b?.label || near.label;
    $('#interact-text').textContent = near.kind === 'exit' ? 'Back outside' : near.kind === 'project' ? 'Open project' : b?.kind === 'area' ? `Go inside` : 'Open';
  }
  if (current !== district && current.booths.length) {
    let k = 0, best = Infinity; current.booths.forEach((b, i) => { const d = Math.abs(b.x - state.x); if (d < best) { best = d; k = i; } });
    const text = state.x < current.booths[0].x - 2.5 ? `${current.booths.length} stands` : `${(state.path && Number.isInteger(state.booth) ? state.booth : k) + 1} of ${current.booths.length}`;
    if ($('#booth-count').textContent !== text) $('#booth-count').textContent = text;
  }
  for (const m of markers) {
    tmp.copy(m.label.position).project(camera);
    const off = tmp.z > 1 || Math.abs(tmp.x) > .9 || Math.abs(tmp.y) > 1.05 || panel.open;
    m.button.hidden = off;
    if (!off) { m.button.style.transform = `translate(${(tmp.x + 1) * innerWidth / 2}px, ${(-tmp.y + 1) * innerHeight / 2}px) translate(-50%,-100%)`; }
    m.button.classList.toggle('active', !!near && (near.id === m.label.id || near.building === m.label.id));
  }
  renderer.render(current.scene, camera);
  frames++; frameMs += dt * 1000;
  if (frames === 240 && frameMs / 240 > 30 && !lowPower) { lowPower = true; applyQuality(); notify('Switched to low-power mode for smoother driving.'); }
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({canvas: $('#world'), antialias: !lowPower, powerPreference: 'high-performance'});
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .1, 260);
    applyQuality();
    const timeout = setTimeout(() => { if (!ready && !failed) { $('#load-status').textContent = 'Still loading. Simple view has everything in the meantime.'; $('#loading').style.pointerEvents = 'none'; } }, 20000);
    const done = {env: 0, rover: 0};
    const fontsP = fontsReady();
    district = await loadDistrict(renderer, asset, (k, e) => { if (e.lengthComputable) { done[k] = e.loaded / e.total; const p = Math.round((done.env * .92 + done.rover * .08) * 100); $('#progress').value = p; $('#load-status').textContent = `Opening the riverfront · ${p}%`; } });
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, .06).texture; room.dispose(); pmrem.dispose();
    district.scene.environment = envMap; district.scene.environmentIntensity = .45;
    district.kit = findKit(district.scene);
    rover = district.rover; state = createState(district.spawn);
    await fontsP;
    switchTo(district, district.spawn); buildMap();
    ready = true; clearTimeout(timeout); $('#loading').classList.add('hidden'); document.body.classList.add('ready'); resize();
    renderer.setAnimationLoop(frame);
    const r = routeFromHash(); if (r && !panel.open) handleRoute();
    if (pendingVisit) { const v = pendingVisit; pendingVisit = null; visit(v); }
  } catch (error) { fallback(error); }
}
function findKit(scene) {
  const kit = {};
  scene.traverse(o => { if (!o.isMesh) return; for (const m of [o.material].flat()) { if (m.name === 'Warm red brick' && m.map) kit.brick = m.map; if (m.name === 'Aged oak' && m.map) kit.oak = m.map; } });
  return kit;
}
$('#world').addEventListener('webglcontextlost', e => { e.preventDefault(); clearInput(); fallback(new Error('Graphics context lost')); });
if (routeFromHash()) handleRoute();
window.__workshop = {get district() { return district; }, get state() { return state; }, get camera() { return camera; }, THREE};
if (!routeFromHash()) ensureWorld();
