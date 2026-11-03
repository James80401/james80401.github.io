// The riverfront row: loads the Blender environment, instances the paving and adds light.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createWorld} from './controller.js';
import {BUILDINGS} from './areas.js';

export const SKY = '#c9c8b6';

export async function loadDistrict(renderer, asset, onProgress) {
  const manifest = await (await fetch(asset('district.json'))).json();
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const [env, vehicle] = await Promise.all([
    loader.loadAsync(asset('district.glb'), e => onProgress?.('env', e)),
    loader.loadAsync(asset('rover.glb'), e => onProgress?.('rover', e)),
  ]);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(SKY, 55, 140);
  scene.add(new THREE.HemisphereLight(0xc6d8e3, 0x6a5236, 2.0));
  const sun = new THREE.DirectionalLight(0xffc98a, 4.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -20, right: 20, top: 20, bottom: -20, near: .5, far: 70});
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);

  let wheel = null;
  env.scene.traverse(o => {
    if (o.name === manifest.waterwheel.name || o.name === manifest.waterwheel.name.replace(/\s/g, '_')) wheel = o;
    if (!o.isMesh) return;
    const name = o.name || '';
    o.castShadow = !/River|Lawn|Plaza bed|Landscape|distant|skyline|Distant|Rapids|granite outcrop/i.test(name) || /Mill/.test(name);
    o.receiveShadow = true;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (/Warm window/.test(m.name)) { m.emissive = new THREE.Color('#eab461'); m.emissiveIntensity = .14; m.color.multiplyScalar(.67); }
      if (m.name === 'James river') { m.roughness = .3; m.metalness = .15; }
      if (m.map) m.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    }
  });
  scene.add(env.scene);
  // Compression stores the wheel in a shared quantization frame, so spin it about its true centre.
  let pivot = null;
  if (wheel) {
    env.scene.updateMatrixWorld(true);
    const centre = new THREE.Box3().setFromObject(wheel).getCenter(new THREE.Vector3());
    pivot = new THREE.Group(); pivot.position.copy(centre); scene.add(pivot); pivot.updateMatrixWorld(true); pivot.attach(wheel);
  }
  const rover = vehicle.scene; rover.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(rover);

  // Paving: one instanced draw call instead of thousands of modeled stones.
  const cobbles = buildCobbles(manifest);
  if (cobbles) scene.add(cobbles);

  // A small pool of warm point lights follows the camera between the facade lamps.
  const pool = Array.from({length: 7}, () => { const l = new THREE.PointLight(0xffb961, 9, 4.5, 2); scene.add(l); return l; });
  const lamps = manifest.lamps.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  let lastPick = -1;
  function pickLights(focus, t) {
    if (t - lastPick < .4) return; lastPick = t;
    lamps.sort((a, b) => Math.hypot(a.x - focus.x, a.z - focus.z) - Math.hypot(b.x - focus.x, b.z - focus.z));
    pool.forEach((l, i) => { const p = lamps[i]; if (p) l.position.set(p.x, p.y - .15, p.z + .1); });
  }

  const interactables = manifest.entrances.map(e => ({...e, ...BUILDINGS[e.id], building: e.id, kind: BUILDINGS[e.id]?.kind || 'page'}));
  const world = createWorld({bounds: manifest.bounds, obstacles: manifest.obstacles, interactables});
  const sunOffset = new THREE.Vector3(14, 22, 16);
  return {
    id: 'district', scene, world, rover, manifest, sun, cobbles,
    spawn: manifest.spawn,
    labels: manifest.entrances.map(e => ({id: e.id, label: BUILDINGS[e.id]?.label || e.label, position: new THREE.Vector3(e.sign[0], e.sign[2], e.sign[1])})),
    camera: {offset: new THREE.Vector3(5.5, 9.2, 16.5), look: new THREE.Vector3(0, 1.6, -3.5), clampX: [manifest.bounds.x0 + 6, manifest.bounds.x1 - 6]},
    intro: {position: new THREE.Vector3(10.5, 10.2, 26.5), target: new THREE.Vector3(0, 2.2, -2.2)},
    update(dt, t, focus) {
      if (pivot) pivot.rotation.x -= dt * .55;
      // Shadow frustum follows the action; snapping avoids shimmer.
      const s = 40 / 2048, fx = Math.round(focus.x / s) * s, fz = Math.round(focus.z / s) * s;
      sun.target.position.set(fx, 0, fz); sun.position.set(fx + sunOffset.x, sunOffset.y, fz + sunOffset.z);
      pickLights(focus, t);
    },
    setQuality(low) { sun.castShadow = !low; },
  };
}

function buildCobbles(m) {
  const {x0, x1, z0, z1} = m.paving;
  const geo = new THREE.BoxGeometry(.65, .13, .43);
  const mat = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .92});
  const skip = m.obstacles.filter(o => (o[1] - o[0]) > 2.5 && (o[3] - o[2]) > 2.5); // building footprints and the millrace
  const spots = []; let row = 0;
  for (let z = z0 + .25; z < z1 - .2; z += .49, row++)
    for (let x = x0 + .35 + (row % 2) * .35; x < x1 - .3; x += .70) {
      if (skip.some(o => x > o[0] + .2 && x < o[1] - .2 && z > o[2] + .2 && z < o[3] - .2)) continue;
      spots.push([x, z]);
    }
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length); mesh.name = 'Cobbles'; mesh.receiveShadow = true;
  const tones = ['#3f3d36', '#46433a', '#4d493f', '#544f44', '#5b5549', '#4a4740'].map(c => new THREE.Color(c));
  const dummy = new THREE.Object3D(); let seed = 32; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  spots.forEach(([x, z], i) => {
    dummy.position.set(x + (rnd() - .5) * .05, -.01 + (rnd() - .5) * .02, z + (rnd() - .5) * .04);
    dummy.rotation.set(0, (rnd() - .5) * .07, 0); dummy.scale.set(.94 + rnd() * .09, 1, .92 + rnd() * .1); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, tones[(rnd() * tones.length) | 0]);
  });
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  return mesh;
}
