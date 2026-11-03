// Rover movement, collision and click-to-drive routing. Pure functions, no DOM or Three.js,
// so the rules can be unit tested in Node. Coordinates are browser world units (metres):
// x to the right, z toward the viewer. Forward at yaw = PI is -z (into the scene).
export const RADIUS = .8;

export function createWorld({bounds, obstacles = [], radius = RADIUS, interactables = []}) {
  const boxes = obstacles.map(o => Array.isArray(o) ? {x0: o[0], x1: o[1], z0: o[2], z1: o[3]} : o);
  return {bounds, boxes, radius, interactables};
}

export function blocked(world, x, z) {
  const {bounds: b, boxes, radius: r} = world;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
  if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
  for (const o of boxes) if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return true;
  return false;
}

export function createState(spawn) {
  return {x: spawn.x, z: spawn.z, yaw: spawn.yaw ?? Math.PI, speed: 0, path: null, distance: 0, spawn};
}
export function reset(state) {
  Object.assign(state, {x: state.spawn.x, z: state.spawn.z, yaw: state.spawn.yaw ?? Math.PI, speed: 0, path: null});
}
export function place(state, spot) {
  Object.assign(state, {x: spot.x, z: spot.z, yaw: spot.yaw ?? state.yaw, speed: 0, path: null});
}

export function nearest(world, state, range = 2.4) {
  let found = null, best = range;
  for (const e of world.interactables) {
    const d = Math.hypot(state.x - e.x, state.z - e.z);
    if (d < best) { found = e; best = d; }
  }
  return found;
}

export const SPEED = {cruise: 4.2, boost: 7.5};

export function move(world, state, input, seconds) {
  const dt = Math.min(Math.max(seconds, 0), .05);
  let throttle = input.forward ? 1 : input.back ? -1 : 0;
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  if (throttle || steer) state.path = null;
  let boost = input.boost;
  if (state.path?.length) {
    const t = state.path[0], dx = t.x - state.x, dz = t.z - state.z, d = Math.hypot(dx, dz);
    const last = state.path.length === 1;
    if (d < (last ? .3 : .7)) {
      state.path.shift();
      if (!state.path.length) { state.path = null; state.speed = 0; state.replans = 0; }
    } else {
      const desired = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(desired - state.yaw), Math.cos(desired - state.yaw));
      state.yaw += Math.max(-3 * dt, Math.min(3 * dt, diff));
      throttle = Math.abs(diff) < .5 ? Math.min(1, last ? d / 1.5 + .25 : 1) * Math.cos(diff) : 0;
      boost = !last && d > 6;
    }
  }
  const max = boost ? SPEED.boost : SPEED.cruise;
  const response = input.brake ? 18 : 6;
  state.speed += (throttle * max - state.speed) * (1 - Math.exp(-response * dt));
  if (!state.path) state.yaw += steer * dt * 2.3 * (state.speed < -.15 ? -1 : 1);
  const distance = state.speed * dt;
  const dx = Math.sin(state.yaw) * distance, dz = Math.cos(state.yaw) * distance;
  // Substeps prevent tunnelling on slow frames; separate axes let the rover slide along walls.
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / .12));
  let collided = false;
  for (let i = 0; i < steps; i++) {
    if (!blocked(world, state.x + dx / steps, state.z)) state.x += dx / steps; else collided = true;
    if (!blocked(world, state.x, state.z + dz / steps)) state.z += dz / steps; else collided = true;
  }
  if (collided) {
    state.speed *= .25;
    if (state.path) {
      state.stuck = (state.stuck || 0) + dt;
      if (state.stuck > .6) { // re-plan from here once or twice, then give up
        const goal = state.path[state.path.length - 1]; state.replans = (state.replans || 0) + 1; state.stuck = 0;
        state.path = state.replans <= 2 ? findPath(world, state, goal) : null;
        if (!state.path) state.replans = 0;
      }
    }
  }
  else state.stuck = 0;
  state.distance += Math.hypot(dx, dz);
  return state;
}

// Grid A* over the free space, then string-pulled to a short list of waypoints.
export function findPath(real, from, to, cell = .5, margin = .35) {
  // Plan with extra clearance so the rover's turning arcs stay off the obstacles.
  const world = {...real, radius: real.radius + margin}; const {bounds: b} = world;
  const cols = Math.ceil((b.x1 - b.x0) / cell) + 1, rows = Math.ceil((b.z1 - b.z0) / cell) + 1;
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) free[r * cols + c] = blocked(world, b.x0 + c * cell, b.z0 + r * cell) ? 0 : 1;
  const idx = (x, z) => {
    const c = Math.round((x - b.x0) / cell), r = Math.round((z - b.z0) / cell);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  };
  const snap = (x, z) => { // nearest free cell to a point
    let best = -1, bd = Infinity;
    const c0 = Math.round((x - b.x0) / cell), r0 = Math.round((z - b.z0) / cell);
    for (let rad = 0; rad < 12 && best < 0; rad++)
      for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows || !free[r * cols + c]) continue;
        const d = (c - c0) ** 2 + (r - r0) ** 2; if (d < bd) { bd = d; best = r * cols + c; }
      }
    return best;
  };
  const start = free[idx(from.x, from.z)] ? idx(from.x, from.z) : snap(from.x, from.z);
  const goal = free[idx(to.x, to.z)] ? idx(to.x, to.z) : snap(to.x, to.z);
  if (start < 0 || goal < 0) return null;
  const g = new Float32Array(cols * rows).fill(Infinity), came = new Int32Array(cols * rows).fill(-1), closed = new Uint8Array(cols * rows);
  const gc = goal % cols, gr = (goal / cols) | 0;
  const h = i => Math.hypot(i % cols - gc, ((i / cols) | 0) - gr);
  const open = [[h(start), start]]; g[start] = 0;
  const push = (f, i) => { open.push([f, i]); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break; [open[p], open[k]] = [open[k], open[p]]; k = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === k) break; [open[m], open[k]] = [open[k], open[m]]; k = m; } } return top; };
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  let found = false, guard = 0;
  while (open.length && guard++ < 200000) {
    const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
    if (cur === goal) { found = true; break; }
    const c = cur % cols, r = (cur / cols) | 0;
    for (const [dc, dr, cost] of dirs) {
      const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const n = nr * cols + nc; if (!free[n] || closed[n]) continue;
      if (dc && dr && (!free[r * cols + nc] || !free[nr * cols + c])) continue; // no corner cutting
      const ng = g[cur] + cost; if (ng < g[n]) { g[n] = ng; came[n] = cur; push(ng + h(n), n); }
    }
  }
  if (!found) return null;
  const cells = []; for (let i = goal; i !== -1; i = came[i]) cells.push(i); cells.reverse();
  const pts = cells.map(i => ({x: b.x0 + (i % cols) * cell, z: b.z0 + ((i / cols) | 0) * cell}));
  // String pulling: keep a waypoint only when the straight line to the next one is blocked.
  const clear = (a, c) => { const d = Math.hypot(c.x - a.x, c.z - a.z), n = Math.ceil(d / (cell * .5)); for (let k = 1; k < n; k++) { const t = k / n; if (blocked(world, a.x + (c.x - a.x) * t, a.z + (c.z - a.z) * t)) return false; } return true; };
  const out = []; let anchor = {x: from.x, z: from.z}, k = 0;
  while (k < pts.length - 1) {
    let j = pts.length - 1; while (j > k + 1 && !clear(anchor, pts[j])) j--;
    out.push(pts[j]); anchor = pts[j]; k = j;
  }
  if (!out.length) out.push(pts[pts.length - 1]);
  const end = out[out.length - 1];
  if (!blocked(real, to.x, to.z) && Math.hypot(end.x - to.x, end.z - to.z) < 1.5) out.push({x: to.x, z: to.z});
  return out.filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.z - a[i - 1].z) > .05);
}
