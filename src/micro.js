// Molecular-scale scene: a stretch of inner membrane with the electron
// transport chain and ATP synthase. Driven each frame by the rate model.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GlowPoints, mulberry, skyDome, clamp, lerp } from './fx.js';

export const X = { c1: -24, c2: -13, c3: -2, c4: 10, syn: 24 };
export const wave = (x, z, t) => 0.5 * Math.sin(0.13 * x + 0.7 * t) + 0.35 * Math.sin(0.21 * z + 0.5 * t + x * 0.05);
const WAVE_GLSL = `transformed.y += 0.5*sin(0.13*instanceMatrix[3][0]+0.7*uTime)+0.35*sin(0.21*instanceMatrix[3][2]+0.5*uTime+instanceMatrix[3][0]*0.05);`;

function blob(spheres, rnd, seg = 16) {
  const geos = spheres.map(([x, y, z, r]) => {
    const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
    const p = g.attributes.position, f = 2.2 / r, a = rnd() * 6, b = rnd() * 6;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const k = 1 + 0.09 * Math.sin(px * f * 2 + a) * Math.cos(py * f * 2 + b) + 0.06 * Math.sin(pz * f * 3 + a + b);
      p.setXYZ(i, px * k, py * k, pz * k);
    }
    g.translate(x, y, z); return g;
  });
  return mergeGeometries(geos);
}

export function createMicro(lite) {
  const rnd = mulberry(42);
  const R = (a, b) => a + (b - a) * rnd();
  const scene = new THREE.Scene();
  const fogCool = new THREE.Color(0x031419), fogHot = new THREE.Color(0x1d0a0a);
  scene.fog = new THREE.FogExp2(fogCool.clone(), 0.0105);
  scene.add(skyDome(0x0a3f4d, 0x031419, 0x02060d));
  const hemi = new THREE.HemisphereLight(0x8fe6ff, 0x0b1436, 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xd4f6ff, 2.1); sun.position.set(-12, 30, 26); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x3b6bff, 0.9); rim.position.set(20, -18, -10); scene.add(rim);
  const synLight = new THREE.PointLight(0xffc860, 0, 40, 2); synLight.position.set(X.syn, -9, 6); scene.add(synLight);
  const chainLight = new THREE.PointLight(0x58e8ff, 0, 46, 2); chainLight.position.set(-8, 5, 7); scene.add(chainLight);

  const uTime = { value: 0 };
  const waveMat = (m) => { m.onBeforeCompile = (s) => { s.uniforms.uTime = uTime; s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WAVE_GLSL); }; return m; };

  // ---------- proteins ----------
  const proteins = {};
  const holes = [];
  function protein(id, x, color, spheres, extra) {
    const g = new THREE.Group(); g.position.x = x;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.05, emissive: color, emissiveIntensity: 0.1 });
    if (spheres) g.add(new THREE.Mesh(blob(spheres, rnd), mat));
    for (const s of spheres || []) if (Math.abs(s[1]) < 2.4) holes.push([x + s[0], s[2], s[3] * 0.95]);
    scene.add(g);
    proteins[id] = { g, mat, x, pulse: 0, base: new THREE.Color(color), ...extra };
    return proteins[id];
  }
  { // Complex I: membrane arm plus an arm reaching into the matrix
    const s = [];
    for (let i = 0; i < 8; i++) s.push([-5 + i * 1.25, R(-0.5, 0.5), R(-0.7, 0.7), R(2.0, 2.45)]);
    for (let j = 0; j < 6; j++) s.push([3 + R(-0.4, 0.4), -2.6 - j * 1.4, R(-0.5, 0.5), R(1.9, 2.3)]);
    s.push([3.3, -10.6, 0.2, 2.7]);
    protein('c1', X.c1, 0x4f7dff, s);
  }
  { // Complex II: small, mostly on the matrix side
    const s = [[0, -0.4, 0, 1.7], [0.6, 0.5, 0.5, 1.4], [-0.3, -2.8, 0.2, 2.0], [0.9, -4.6, -0.3, 2.1], [-0.9, -5.2, 0.5, 1.9], [0.1, -6.6, 0.1, 1.8]];
    protein('c2', X.c2, 0x2fc7a0, s);
  }
  { // Complex III: a symmetric pair
    const s = [];
    for (const sx of [-1.55, 1.55]) { for (let j = 0; j < 5; j++) s.push([sx + R(-0.3, 0.3), -4.4 + j * 2.0, R(-0.4, 0.4), R(1.7, 2.1)]); s.push([sx * 1.5, 4.6, R(-0.8, 0.8), 1.6]); }
    protein('c3', X.c3, 0xa678ff, s);
  }
  { // Complex IV: a squat barrel with a bright oxygen site underneath
    const s = [];
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; s.push([Math.cos(a) * 1.7, R(-0.8, 0.8), Math.sin(a) * 1.7, 1.95]); }
    s.push([0, 2.7, 0, 2.0], [0.9, 3.6, 0.5, 1.3], [0, -2.4, 0, 1.9]);
    const p = protein('c4', X.c4, 0xff8a4a, s);
    p.core = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffc27a }));
    p.core.position.set(0, -3.9, 1.0); p.g.add(p.core);
    // cyanide marker: a dark plug and a warning ring on the oxygen site
    p.plug = new THREE.Group();
    const pm = new THREE.MeshStandardMaterial({ color: 0x0b1410, roughness: 0.3, emissive: 0x22ff99, emissiveIntensity: 0.25 });
    const a1 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), pm), a2 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), pm); a2.position.set(0.95, -0.5, 0.3);
    p.ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff3b4e }));
    p.ring.rotation.x = Math.PI / 2;
    p.plug.add(a1, a2, p.ring); p.plug.position.set(0, -4.1, 1.0); p.plug.scale.setScalar(0.001); p.g.add(p.plug);
  }
  { // ATP synthase: rotor ring in the membrane, stalk, six-lobed head in the matrix, stator arm
    const p = protein('syn', X.syn, 0xf0c85a, null);
    const rotorMatA = new THREE.MeshStandardMaterial({ color: 0xf3cf62, roughness: 0.4, emissive: 0xf0a020, emissiveIntensity: 0.15 });
    const rotorMatB = new THREE.MeshStandardMaterial({ color: 0xc98f2c, roughness: 0.45, emissive: 0xc06010, emissiveIntensity: 0.15 });
    p.rotor = new THREE.Group();
    const cg = new THREE.CapsuleGeometry(0.78, 2.9, 6, 12);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; const m = new THREE.Mesh(cg, k % 2 ? rotorMatA : rotorMatB); m.position.set(Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25); p.rotor.add(m); }
    const stalk = new THREE.Mesh(blob([[0, -3, 0, 1.15], [0.35, -4.6, 0.1, 1.05], [0.6, -6.2, -0.1, 1.0], [0.3, -7.8, 0, 0.95], [1.1, -5.4, 0.4, 0.7]], rnd, 12), rotorMatA);
    p.rotor.add(stalk); p.g.add(p.rotor);
    p.rotorMats = [rotorMatA, rotorMatB];
    const lobes = [];
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.3; lobes.push([Math.cos(a) * 2.35, -9.2 + (k % 2 ? 0.25 : -0.1), Math.sin(a) * 2.35, k % 2 ? 2.15 : 1.95]); }
    p.headMat = new THREE.MeshStandardMaterial({ color: 0xe2a53a, roughness: 0.5, emissive: 0xff9d1e, emissiveIntensity: 0.12 });
    p.g.add(new THREE.Mesh(blob(lobes, rnd), p.headMat));
    const st = new THREE.MeshStandardMaterial({ color: 0x5fb4c8, roughness: 0.5, emissive: 0x1a6a80, emissiveIntensity: 0.2 });
    const stator = blob([[3.6, 0, 0.4, 1.7], [3.9, 1.6, 0.2, 1.2], [4.3, -2.6, 0.2, 0.8], [4.6, -4.4, 0.1, 0.75], [4.7, -6.2, 0, 0.75], [4.4, -8, 0, 0.8], [3.6, -11.2, 0, 1.3], [4.3, -9.8, 0, 0.9]], rnd, 12);
    p.g.add(new THREE.Mesh(stator, st));
    holes.push([X.syn, 0, 3.3], [X.syn + 3.7, 0.4, 1.7]);
  }

  // ---------- lipid bilayer ----------
  const sp = lite ? 1.08 : 0.86, X0 = -47, X1 = 47, Z0 = -27, Z1 = 3.2;
  const pts = [];
  for (let x = X0; x <= X1; x += sp) for (let z = Z0; z <= Z1; z += sp) {
    const px = x + R(-0.22, 0.22), pz = z + R(-0.22, 0.22);
    let ok = true; for (const h of holes) { const dx = px - h[0], dz = pz - h[1]; if (dx * dx + dz * dz < h[2] * h[2]) { ok = false; break; } }
    if (ok) pts.push(px, pz);
  }
  const nL = pts.length / 2;
  const headMat = waveMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.05, emissive: 0x0a4652, emissiveIntensity: 0.55 }));
  const tailMat = waveMat(new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.8, emissive: 0x2a1c08, emissiveIntensity: 0.5 }));
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.43, 1), headMat, nL * 2);
  const tg = (dir) => { const a = new THREE.CylinderGeometry(0.075, 0.05, 1.55, 4, 1, true); a.rotateZ(0.09); a.translate(-0.15, dir * -1.05, 0); const b = new THREE.CylinderGeometry(0.075, 0.05, 1.45, 4, 1, true); b.rotateZ(-0.12); b.translate(0.15, dir * -1.0, 0.05); return mergeGeometries([a, b]); };
  const tailsT = new THREE.InstancedMesh(tg(1), tailMat, nL), tailsB = new THREE.InstancedMesh(tg(-1), tailMat, nL);
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  for (let i = 0; i < nL; i++) {
    const x = pts[i * 2], z = pts[i * 2 + 1];
    for (const top of [1, 0]) {
      const y = (top ? 1.95 : -1.95) + R(-0.1, 0.1);
      Q4.setFromAxisAngle(UP, rnd() * 6.283); S3.setScalar(R(0.9, 1.12));
      M4.compose(P3.set(x, y, z), Q4, S3);
      heads.setMatrixAt(i * 2 + top, M4);
      col.setHSL(R(0.50, 0.545), R(0.55, 0.8), R(0.36, 0.5)); heads.setColorAt(i * 2 + top, col);
      (top ? tailsT : tailsB).setMatrixAt(i, M4);
    }
  }
  for (const m of [heads, tailsT, tailsB]) { m.frustumCulled = false; scene.add(m); }

  // A second membrane sheet far overhead hints at the narrow fold of a crista.
  { const n = lite ? 900 : 2200, far = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshBasicMaterial({ color: 0x0e4a58 }), n);
    for (let i = 0; i < n; i++) { M4.makeTranslation(R(-110, 110), 44 + R(-1, 1) + 6 * Math.sin(i), R(-120, 10)); far.setMatrixAt(i, M4); } far.frustumCulled = false; scene.add(far); }

  // ---------- small molecules (instanced meshes) ----------
  function inst(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; scene.add(m); const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) m.setMatrixAt(i, zero); return m; }
  const put = (mesh, i, x, y, z, s, ry = 0, rz = 0) => { Q4.setFromEuler(E3.set(0, ry, rz)); M4.compose(P3.set(x, y, z), Q4, S3.setScalar(s)); mesh.setMatrixAt(i, M4); };
  const E3 = new THREE.Euler();
  const std = (c, e = 0.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.4 });
  const NQ = 14, NC = 6, NO = 28, NN = 8, ND = 18;
  const qMesh = inst(new THREE.CapsuleGeometry(0.42, 1.0, 6, 10), std(0xf2e85c, 0.55), NQ);
  const cyMesh = inst(blob([[0, 0, 0, 0.8], [0.5, 0.3, 0.2, 0.55], [-0.4, 0.35, -0.2, 0.5]], rnd, 10), std(0xff4d6d, 0.5), NC);
  const o2Mesh = inst(mergeGeometries([new THREE.SphereGeometry(0.36, 12, 8).translate(-0.28, 0, 0), new THREE.SphereGeometry(0.36, 12, 8).translate(0.28, 0, 0)]), std(0x9fd4ff, 0.12), NO);
  const nadhMesh = inst(blob([[0, 0, 0, 0.75], [0.8, 0.2, 0, 0.6], [-0.7, -0.2, 0.1, 0.55]], rnd, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), NN * 2);
  const dnpMesh = inst(new THREE.TorusGeometry(0.75, 0.2, 8, 6), std(0xff5cc8, 1.0), ND);

  // ---------- electron routes ----------
  function route(raw) {
    const p = raw.map((a) => new THREE.Vector3(a[0], a[1], a[2])), cum = [0];
    for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + p[i].distanceTo(p[i - 1]));
    const tags = {}; raw.forEach((a, i) => { if (a[3]) tags[a[3]] = i; });
    return { p, cum, L: cum[cum.length - 1], tags };
  }
  const RA = route([[-21, -10.5, 0, 'dock'], [-21, -3, 0], [-23, 0, 0, 'c1'], [-19.5, 0, 1.6, 'q0'], [-5, 0, 1.6, 'q1'], [-2, 0, 0, 'c3'], [-1, 4.4, 0.6, 'cy0'], [8.8, 4.6, 0.6, 'cy1'], [10, 0.4, 0, 'end']]);
  const RB = route([[-12.2, -6.8, 0, 'dock'], [-12.6, -1.6, 0, 'c2'], [-11, 0, -1.6, 'q0'], [-5, 0, -1.6, 'q1'], [-2, 0, 0, 'c3'], [-1, 4.4, 0.6, 'cy0'], [8.8, 4.6, 0.6, 'cy1'], [10, 0.4, 0, 'end']]);
  const remAt = (r, tag) => r.L - r.cum[r.tags[tag]];
  const REM = { c1: remAt(RA, 'c1'), q1: remAt(RA, 'q1'), c3: remAt(RA, 'c3'), cy0: remAt(RA, 'cy0'), cy1: remAt(RA, 'cy1') };
  const REM_BLOCK = REM.cy1 + 0.2;
  const ev = new THREE.Vector3();
  function routePos(r, rem, t, out) {
    const d = clamp(r.L - rem, 0, r.L); let i = 1; while (i < r.cum.length - 1 && r.cum[i] < d) i++;
    const u = (d - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1]);
    out.lerpVectors(r.p[i - 1], r.p[i], u);
    if (i === r.tags.cy1) out.y += Math.sin(u * Math.PI) * 2.2;
    out.y += wave(out.x, out.z, t) * (out.y > -3 ? 1 : 0.4);
    return i;
  }
  const energy = (e) => { const r = e.rem; let v = e.route === RA ? 1 : 0.72; if (e.route === RA && r < REM.c1) v = 0.8; if (r < REM.c3) v = 0.5; if (r < REM.cy1) v = 0.32; return v; };

  const electrons = []; const GAP = 1.5, VE = 11;
  const carriers = [];  // NADH and FADH2 shuttles
  for (let i = 0; i < NN * 2; i++) carriers.push({ kind: i < NN ? 0 : 1, state: 0, t: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), p: new THREE.Vector3() });
  const acc = { a: 0, b: 0, gate: 0, o2: 0, atp: 0, exit: 0, leak: 0, ember: 0 };
  const stats = { atp: 0, water: 0, jam: 0 };
  const listeners = [];
  const emit = (type, v) => { for (const f of listeners) f(type, v); };

  // ---------- protons ----------
  const NP = lite ? 620 : 1050, PMAX = NP + 320;
  const pr = { x: new Float32Array(PMAX), y: new Float32Array(PMAX), z: new Float32Array(PMAX), vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX), hx: new Float32Array(PMAX), hy: new Float32Array(PMAX), hz: new Float32Array(PMAX), st: new Uint8Array(PMAX), t: new Float32Array(PMAX), a: new Float32Array(PMAX), k: new Float32Array(PMAX) };
  let imsCount = 0; const free = [];
  const home = (i) => { pr.hx[i] = R(-44, 44); pr.hz[i] = R(-25, 4.2); pr.hy[i] = 3.0 + Math.min(13, -Math.log(1 - rnd() * 0.98) * 2.7); };
  const slot = () => { for (let i = 0; i < PMAX; i++) if (!pr.st[i]) return i; return -1; };
  function pumpProton(cx, n) { for (let k = 0; k < n; k++) { const i = slot(); if (i < 0) return; pr.st[i] = 2; pr.t[i] = -k * 0.07; pr.x[i] = cx + R(-1.6, 1.6); pr.z[i] = R(0.6, 2.6); pr.y[i] = -5; pr.a[i] = 1; pr.k[i] = rnd(); home(i); pr.hx[i] = clamp(cx + R(-26, 26), -44, 44); imsCount++; } }
  const dnpSites = []; for (let i = 0; i < ND; i++) { let x, z, ok, n = 0; do { x = R(-40, 40); z = R(-20, 2.0); ok = ++n > 200;if(ok)break; ok = true; for (const h of holes) if (Math.hypot(x - h[0], z - h[1]) < h[2] + 2) ok = false; for (const s of dnpSites) if (Math.hypot(x - s[0], z - s[1]) < 5.5) ok = false; } while (!ok); dnpSites.push([x, z]); }
  let dnpVis = 0, cnVis = 0;

  // ---------- glow particles ----------
  const glow = new GlowPoints(lite ? 4200 : 6200); scene.add(glow.points);
  // electrons draw without depth test so they stay visible inside the membrane
  const glowX = new GlowPoints(600); glowX.mat.depthTest = false; glowX.points.renderOrder = 11; scene.add(glowX.points);
  const skyM = scene.children.find((o) => o.material && o.material.uniforms && o.material.uniforms.uMid);
  const skyCool = new THREE.Color(0x031419), skyHot = new THREE.Color(0x3a1208);
  const fx = []; // transient glow sprites: {x,y,z,vx,vy,vz,life,max,r,g,b,s}
  const spark = (x, y, z, vx, vy, vz, life, r, g, b, s) => { if (fx.length < 700) fx.push({ x, y, z, vx, vy, vz, life, max: life, r, g, b, s }); };
  const dustN = lite ? 450 : 900, dust = [];
  for (let i = 0; i < dustN; i++) dust.push(R(-80, 80), R(-34, 36), R(-70, 16), rnd() * 6.28, rnd());
  const o2 = []; for (let i = 0; i < NO; i++) o2.push({ on: false, x: 0, y: 0, z: 0, ph: rnd() * 6.28, s: 0, inb: -1 });
  const o2home = (o) => { o.x = R(-6, 30); o.y = R(-15, -4.5); o.z = R(-9, 4.5); };
  o2.forEach(o2home);
  const qIdle = []; for (let i = 0; i < NQ; i++) qIdle.push({ x: R(-21, -5), z: R(-2.5, 3), ph: rnd() * 6.28, cx: 0, cy: 0, cz: 0 });
  const cIdle = []; for (let i = 0; i < NC; i++) cIdle.push({ x: R(0, 8), z: R(-1.5, 2.5), ph: rnd() * 6.28, cx: 4, cy: 4, cz: 0 });

  const labels = [
    { id: 'c1', text: 'Complex I', p: [X.c1, 5.0, 0] }, { id: 'c2', text: 'Complex II', p: [X.c2, 4.0, 0] },
    { id: 'c3', text: 'Complex III', p: [X.c3, 8.6, 0] }, { id: 'c4', text: 'Complex IV', p: [X.c4 + 1.5, 7.4, 0] },
    { id: 'syn', text: 'ATP synthase', p: [X.syn + 1, 5.2, 0] }, { id: 'q', text: 'Q (ubiquinone)', p: [-13.5, 0.2, 3.6], small: true },
    { id: 'cy', text: 'Cytochrome c', p: [4, 8.2, 0.6], small: true },
    { id: 'ims', text: 'Intermembrane space', p: [-25, 12, -4], zone: true }, { id: 'mat', text: 'Matrix', p: [-4, -12.5, 2], zone: true },
  ];

  const glowQ = [], out = { heatX: 0 };
  function reset() { electrons.length = 0; fx.length = 0; for (const c of carriers) c.state = 0; pr.st.fill(0); imsCount = 0; stats.atp = 0; stats.water = 0; acc.a = acc.b = 0; }

  function launch(kind) {
    const c = carriers.find((k) => k.kind === kind && k.state === 0); if (!c) return false;
    const r = kind ? RB : RA; c.state = 1; c.t = 0; c.b.copy(r.p[0]); c.b.y -= 1.2;
    c.a.set(c.b.x + R(-9, 9), c.b.y - R(6, 12), R(-6, 8)); c.left = 2; c.cool = 0; return true;
  }

  function update(dt, t, m, c, base) {
    uTime.value = t;
    const blocked = c.cyanide || c.o2 < 0.03;
    const active = m.drive > 0.02;

    // --- NADH / FADH2 arrivals feed electrons into the chain ---
    const spawnRate = blocked ? (electrons.length < 34 ? 2.2 * m.drive : 0) : m.J * 5;
    const eN = c.nadh, eF = 0.6 * c.fadh, tot = eN + eF || 1;
    acc.a += spawnRate * (eN / tot) * dt; acc.b += spawnRate * (eF / tot) * dt;
    if (acc.a >= 2) { if (launch(0)) acc.a -= 2; else acc.a = 2; }
    if (acc.b >= 2) { if (launch(1)) acc.b -= 2; else acc.b = 2; }
    let ci = 0; glowQ.length = 0;
    for (const k of carriers) {
      const r = k.kind ? RB : RA; let s = 0, cr = 0.5, cg = 1, cb = 0.55;
      if (k.kind) { cr = 1; cg = 0.5; cb = 0.62; }
      if (k.state === 1) { k.t += dt / 1.1; const u = Math.min(1, k.t); const e = u * u * (3 - 2 * u); k.p.lerpVectors(k.a, k.b, e); s = Math.min(1, k.t * 3); if (k.t >= 1) { k.state = 2; k.cool = 0; } }
      else if (k.state === 2) {
        s = 1; k.cool -= dt;
        const entryClear = !electrons.some((e) => e.route === r && r.L - e.rem < GAP);
        if (k.cool <= 0 && entryClear && electrons.length < 60) { electrons.push({ route: r, rem: r.L, flags: 0 }); k.left--; k.cool = 0.22; emit('dock', k.kind); proteins[k.kind ? 'c2' : 'c1'].pulse = 1; }
        if (k.left <= 0) { k.state = 3; k.t = 0; k.a.copy(k.b); k.b.set(k.a.x + R(-10, 10), k.a.y - R(8, 13), R(-4, 9)); }
      } else if (k.state === 3) { k.t += dt / 1.6; k.p.lerpVectors(k.a, k.b, k.t); s = 1 - k.t; cr *= 0.35; cg *= 0.4; cb *= 0.45; if (k.t >= 1) k.state = 0; }
      if (k.state && k.state < 3) glowQ.push(k.p.x, k.p.y, k.p.z, k.kind);
      if (k.state) { k.p.y += Math.sin(t * 3 + ci) * 0.02; put(nadhMesh, ci, k.p.x, k.p.y, k.p.z, s, t * 0.7 + ci, ci); }
      else put(nadhMesh, ci, 0, -99, 0, 0);
      nadhMesh.setColorAt(ci, col.setRGB(cr * (k.state === 3 ? 1 : 1.5), cg * (k.state === 3 ? 1 : 1.5), cb * (k.state === 3 ? 1 : 1.5)));
      ci++;
    }
    nadhMesh.instanceMatrix.needsUpdate = true; if (nadhMesh.instanceColor) nadhMesh.instanceColor.needsUpdate = true;

    // --- electrons advance, queue and jam ---
    acc.gate = Math.min(3, acc.gate + (blocked ? 0 : m.J * 7.5 + 0.2) * dt);
    if (blocked) acc.gate = 0;
    electrons.sort((a, b) => a.rem - b.rem);
    let prevRem = -1e9, jam = 0;
    for (let i = 0; i < electrons.length; i++) {
      const e = electrons[i]; const old = e.rem; let nr = e.rem - VE * dt;
      if (old > REM_BLOCK && nr <= REM_BLOCK) { if (acc.gate >= 1) acc.gate -= 1; else nr = REM_BLOCK + 0.001; }
      nr = Math.max(nr, prevRem + GAP); if (nr > old) nr = old;
      if (old - nr < VE * dt * 0.3) jam++;
      e.rem = nr; prevRem = e.rem;
      if (e.route === RA && !(e.flags & 1) && e.rem < REM.c1) { e.flags |= 1; pumpProton(X.c1 - 1, 4); proteins.c1.pulse = 1; emit('step', 0); }
      if (!(e.flags & 2) && e.rem < REM.c3) { e.flags |= 2; pumpProton(X.c3, 4); proteins.c3.pulse = 1; emit('step', 1); }
      if (!(e.flags & 4) && e.rem < REM.cy1) { e.flags |= 4; emit('step', 2); }
    }
    stats.jam = jam;
    while (electrons.length && electrons[0].rem <= 0.05) {
      electrons.shift(); proteins.c4.pulse = 1; emit('step', 3); acc.o2 += 0.25;
      spark(X.c4, -3.6, 1, 0, 0, 0, 0.35, 1.6, 0.9, 0.4, 2.6);
    }
    if (acc.o2 >= 1) { // one O2 takes four electrons and four H+ and leaves as two waters
      acc.o2 -= 1; const o = o2.find((q) => q.on && q.inb < 0); if (o) o.inb = 0;
      for (let k = 0; k < 4; k++) spark(X.c4 + R(-3, 3), -9 + R(-1, 1), R(-1, 4), 0, 0, 0, 0.5, 1.5, 0.85, 0.25, 0.55, 1);
      stats.water += 2; emit('water');
      for (let k = 0; k < 2; k++) fx.push({ x: X.c4, y: -4.2, z: 1.2, vx: R(1.5, 4) * (k ? 1 : -0.6), vy: R(-3.5, -2), vz: R(0.5, 3), life: 2.6, max: 2.6, r: 0.35, g: 0.75, b: 1.6, s: 1.15, delay: 0.5 });
    }

    // --- draw glow ---
    glow.begin(); glowX.begin();
    for (let i = 0; i < dustN; i++) { const ph = dust[i * 5 + 3], b = 0.16 + 0.1 * Math.sin(t * 0.7 + ph * 3); const y = dust[i * 5 + 1] + Math.cos(t * 0.1 + ph) * 1.5;
      if (dust[i * 5 + 4] < 0.1 && y < -3) glow.add(dust[i * 5] + Math.sin(t * 0.12 + ph) * 2, y, dust[i * 5 + 2], 1.2 * b, 0.7 * b, 0.2 * b, 0.5);
      else glow.add(dust[i * 5] + Math.sin(t * 0.12 + ph) * 2, y, dust[i * 5 + 2], 0.2 * b, 0.8 * b, 1.0 * b, 0.3 + dust[i * 5 + 4] * 0.5); }

    for (let i = 0; i < glowQ.length; i += 4) glowQ[i + 3] ? glow.add(glowQ[i], glowQ[i + 1], glowQ[i + 2], 1.6, 0.5, 0.7, 2.6) : glow.add(glowQ[i], glowQ[i + 1], glowQ[i + 2], 0.5, 1.6, 0.6, 2.6);
    let qi = 0, cyi = 0; const qT = [], cT = [];
    for (const e of electrons) {
      const en = energy(e), seg = routePos(e.route, e.rem, t, ev), r = e.route;
      const br = 0.45 + 1.0 * en, flick = 0.9 + 0.1 * Math.sin(t * 30 + e.rem);
      glowX.add(ev.x, ev.y, ev.z, (0.25 + 0.75 * en * en) * br * flick, (0.75 + 0.25 * en) * br * flick, 1.0 * br, 0.75 + 1.05 * en);
      if (seg === r.tags.q1) qT.push(ev.x, ev.y - 0.45, ev.z); else if (seg === r.tags.cy1) cT.push(ev.x, ev.y - 0.75, ev.z);
      for (let k = 1; k <= 5; k++) { const rr = e.rem + k * 0.42; if (rr > r.L) break; routePos(r, rr, t, ev); const f = (1 - k / 6) * 0.55; glowX.add(ev.x, ev.y, ev.z, 0.2 * br * f, 0.8 * br * f, 1.0 * br * f, (0.65 + 0.8 * en) * (1 - k / 7)); }
    }
    // Q and cytochrome c ride with the electrons they carry; spares idle nearby
    for (let i = 0; i < NQ; i++) { const q = qIdle[i]; let tx, ty, tz;
      if (qi < qT.length) { tx = qT[qi]; ty = qT[qi + 1]; tz = qT[qi + 2]; qi += 3; } else { tx = q.x + Math.sin(t * 0.4 + q.ph) * 2.5; tz = q.z + Math.cos(t * 0.33 + q.ph) * 1.2; ty = wave(tx, tz, t) + Math.sin(t + q.ph) * 0.3; }
      const kk = Math.min(1, dt * 9); q.cx = lerp(q.cx || tx, tx, kk); q.cy = lerp(q.cy, ty, kk); q.cz = lerp(q.cz || tz, tz, kk);
      put(qMesh, i, q.cx, q.cy, q.cz, i < 9 || qi > 0 ? 1 : 0.9, q.ph, Math.PI / 2 + Math.sin(t * 2 + q.ph) * 0.3); }
    qMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NC; i++) { const q = cIdle[i]; let tx, ty, tz;
      if (cyi < cT.length) { tx = cT[cyi]; ty = cT[cyi + 1]; tz = cT[cyi + 2]; cyi += 3; } else { tx = q.x + Math.sin(t * 0.5 + q.ph) * 1.5; tz = q.z + Math.cos(t * 0.4 + q.ph); ty = 3.3 + wave(tx, tz, t) + Math.abs(Math.sin(t * 1.3 + q.ph)) * 0.7; }
      const kk = Math.min(1, dt * 9); q.cx = lerp(q.cx, tx, kk); q.cy = lerp(q.cy, ty, kk); q.cz = lerp(q.cz, tz, kk);
      put(cyMesh, i, q.cx, q.cy, q.cz, 1, t * 0.5 + q.ph, q.ph); }
    cyMesh.instanceMatrix.needsUpdate = true;

    // --- protons: pile-up in the intermembrane space is the gradient ---
    const target = m.G * NP; free.length = 0;
    acc.exit += m.synth * 50 * dt; acc.leak += (c.dnp ? m.leak : 0) * 50 * dt;
    for (let i = 0; i < PMAX; i++) {
      const st = pr.st[i]; if (!st) continue;
      if (st === 1) {
        pr.vx[i] += ((pr.hx[i] - pr.x[i]) * 0.9 + (rnd() - 0.5) * 26) * dt; pr.vy[i] += ((pr.hy[i] - pr.y[i]) * 2.2 + (rnd() - 0.5) * 22) * dt; pr.vz[i] += ((pr.hz[i] - pr.z[i]) * 0.9 + (rnd() - 0.5) * 26) * dt;
        const d = Math.exp(-2.2 * dt); pr.vx[i] *= d; pr.vy[i] *= d; pr.vz[i] *= d;
        pr.x[i] += pr.vx[i] * dt; pr.y[i] += pr.vy[i] * dt; pr.z[i] += pr.vz[i] * dt; if (pr.y[i] < 2.9) { pr.y[i] = 2.9; pr.vy[i] = Math.abs(pr.vy[i]); }
        pr.a[i] = Math.min(1, pr.a[i] + dt * 2); free.push(i);
      } else if (st === 2) { pr.t[i] += dt / 0.8; if (pr.t[i] > 0) { pr.y[i] = -5 + 9 * pr.t[i]; } if (pr.t[i] >= 1) { pr.st[i] = 1; pr.vy[i] = 7; pr.vx[i] = (rnd() - 0.5) * 10; pr.vz[i] = (rnd() - 0.5) * 6; } }
      else if (st === 3 || st === 4) { // leaving: 3 through ATP synthase, 4 through a leak
        const tx = pr.hx[i], tz = pr.hz[i];
        if (pr.t[i] < 0) { const dx = tx - pr.x[i], dy = 3.4 - pr.y[i], dz = tz - pr.z[i], dd = Math.hypot(dx, dy, dz), sp2 = (st === 3 ? 24 : 15) * dt;
          if (dd <= sp2) { pr.x[i] = tx; pr.y[i] = 3.4; pr.z[i] = tz; pr.t[i] = 0; } else { pr.x[i] += dx / dd * sp2; pr.y[i] += dy / dd * sp2; pr.z[i] += dz / dd * sp2; } }
        else { pr.t[i] += dt; const u = pr.t[i];
          if (u < 0.4) pr.y[i] = 3.4 - (u / 0.4) * 7.2; else { pr.y[i] -= 3 * dt; pr.x[i] += pr.vx[i] * dt * 0.3; pr.a[i] = Math.max(0, 1 - (u - 0.4) / 0.8); if (pr.a[i] <= 0) pr.st[i] = 0; }
          if (st === 4 && u < 0.4 && rnd() < dt * 6) spark(pr.x[i], -2.6, pr.z[i], R(-1, 1), R(-3, -1), R(-1, 1), 0.9, 1.7, 0.35, 0.12, 0.7);
        }
      } else if (st === 6) { pr.a[i] -= dt * 1.6; if (pr.a[i] <= 0) pr.st[i] = 0; }
      if (pr.st[i]) { const a = pr.a[i], tw = 0.85 + 0.15 * Math.sin(t * 5 + pr.k[i] * 40), hot = st === 3 || st === 4 ? 1.5 : 1;
        glow.add(pr.x[i], pr.y[i], pr.z[i], 1.5 * a * tw * hot, 0.72 * a * tw * hot, 0.16 * a * tw, 0.5 + 0.2 * pr.k[i]); }
    }
    const take = () => { if (!free.length) return -1; const j = (rnd() * free.length) | 0, i = free[j]; free[j] = free[free.length - 1]; free.pop(); imsCount--; return i; };
    while (acc.exit >= 1) { acc.exit -= 1; let i = -1; for (let tries = 0; tries < 6 && free.length; tries++) { const j = free[(rnd() * free.length) | 0]; if (Math.abs(pr.x[j] - X.syn) < 16) { i = j; free.splice(free.indexOf(j), 1); imsCount--; break; } }
      if (i < 0) i = take(); if (i < 0) break;
      const j = free.length ? free[(rnd() * free.length) | 0] : -1; if (j >= 0) { pr.hx[j] = pr.hx[i]; pr.hy[j] = pr.hy[i]; pr.hz[j] = pr.hz[i]; }
      pr.st[i] = 3; pr.t[i] = -1; pr.hx[i] = X.syn + 2.5 + R(-0.2, 0.2); pr.hz[i] = 0.9 + R(-0.2, 0.2); }
    while (acc.leak >= 1) { acc.leak -= 1; const i = take(); if (i < 0) break; let best = 0, bd = 1e9; for (let s = 0; s < ND; s++) { const d = Math.hypot(pr.x[i] - dnpSites[s][0], pr.z[i] - dnpSites[s][1]); if (d < bd) { bd = d; best = s; } }
      pr.st[i] = 4; pr.t[i] = -1; pr.hx[i] = dnpSites[best][0]; pr.hz[i] = dnpSites[best][1]; }
    let fix = Math.ceil(90 * dt);
    while (imsCount < target - 20 && fix-- > 0) { const i = slot(); if (i < 0) break; pr.st[i] = 1; home(i); pr.x[i] = pr.hx[i]; pr.y[i] = pr.hy[i]; pr.z[i] = pr.hz[i]; pr.vx[i] = pr.vy[i] = pr.vz[i] = 0; pr.a[i] = 0; pr.k[i] = rnd(); imsCount++; }
    while (imsCount > target + 20 && fix-- > 0) { const i = take(); if (i < 0) break; pr.st[i] = 6; }

    // --- ATP synthase rotor and ATP release ---
    const S = proteins.syn; S.rotor.rotation.y -= m.synth * 9.5 * dt;
    acc.atp += m.synth * 10 * dt;
    while (acc.atp >= 1) { acc.atp -= 1; stats.atp++; const a = rnd() * 6.283; emit('atp');
      fx.push({ x: X.syn + Math.cos(a) * 3.2, y: -9.3 + wave(X.syn, 0, t), z: Math.sin(a) * 3.2, vx: Math.cos(a) * R(2, 5), vy: R(-4.5, -1.5), vz: Math.abs(Math.sin(a)) * R(2, 6), life: 3.4, max: 3.4, r: 2.3, g: 1.75, b: 0.35, s: 1.35 }); }
    const sy = base ? m.synth / base.synth : 0;
    S.headMat.emissiveIntensity = 0.06 + 0.22 * Math.min(1.2, sy); for (const rm of S.rotorMats) rm.emissiveIntensity = 0.08 + 0.16 * Math.min(1.2, sy);
    synLight.intensity = 70 * Math.min(1.3, sy);
    chainLight.intensity = 45 * Math.min(1.8, base ? m.J / base.J : 0);

    // --- oxygen ---
    const want = Math.round(clamp(c.o2, 0, 1) * NO);
    for (let i = 0; i < NO; i++) { const o = o2[i]; const should = i < want;
      if (o.inb >= 0) { o.inb += dt / 0.55; const u = Math.min(1, o.inb); o.x = lerp(o.x, X.c4, u * u); o.y = lerp(o.y, -4, u * u); o.z = lerp(o.z, 1, u * u); if (u >= 1) { o.inb = -1; o.s = 0; o2home(o); } }
      else { o.s = lerp(o.s, should ? 1 : 0, Math.min(1, dt * 2.5)); o.on = should && o.s > 0.6; }
      put(o2Mesh, i, o.x + Math.sin(t * 0.5 + o.ph) * 1.2, o.y + Math.cos(t * 0.6 + o.ph * 2) * 0.9, o.z + Math.sin(t * 0.4 + o.ph * 3), o.s, t * 0.8 + o.ph, o.ph + t * 0.5); }
    o2Mesh.instanceMatrix.needsUpdate = true;

    // --- DNP leak sites and cyanide marker ---
    dnpVis = lerp(dnpVis, c.dnp ? 1 : 0, Math.min(1, dt * 3)); cnVis = lerp(cnVis, c.cyanide ? 1 : 0, Math.min(1, dt * 4));
    for (let s = 0; s < ND; s++) { const [x, z] = dnpSites[s]; Q4.setFromEuler(E3.set(Math.PI / 2, 0, t * 0.6 + s)); M4.compose(P3.set(x, 2.25 + wave(x, z, t), z), Q4, S3.setScalar(dnpVis * (1 + 0.12 * Math.sin(t * 4 + s)))); dnpMesh.setMatrixAt(s, M4);
      if (dnpVis > 0.5) glow.add(x, 2.4 + wave(x, z, t), z, 1.6, 0.3, 1.1, 1.6); }
    dnpMesh.instanceMatrix.needsUpdate = true;
    const C4 = proteins.c4; C4.plug.scale.setScalar(Math.max(0.001, cnVis)); C4.ring.scale.setScalar(1 + 0.12 * Math.sin(t * 6)); C4.ring.rotation.z = t;
    const o2f = clamp(c.o2 * 3, 0, 1) * (1 - cnVis); C4.core.material.color.setRGB(0.12 + 1.6 * o2f, 0.1 + 1.0 * o2f, 0.1 + 0.5 * o2f);
    C4.mat.color.copy(C4.base).lerp(col.set(0x4a5560), cnVis * 0.75);

    // --- protein glow and bob ---
    for (const id in proteins) { const p = proteins[id]; p.pulse = Math.max(0, p.pulse - dt * 3.2); p.g.position.y = wave(p.x, 0, t);
      if (id !== 'syn') { p.mat.emissiveIntensity = (id === 'c4' ? 1 - cnVis : 1) * (0.1 + 0.55 * p.pulse); } }

    // --- transient sprites: ATP, water, heat embers ---
    const heatX = base ? clamp((m.heat / base.heat - 1.15) / 1.3, 0, 1) : 0;
    acc.ember += heatX * 150 * dt; while (acc.ember >= 1) { acc.ember -= 1; spark(R(-30, 14), R(-3, 3), R(-8, 4), R(-0.5, 0.5), R(1.5, 4), R(-0.5, 0.5), 2.2, 2.0, 0.45, 0.12, 0.9); }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i];
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.life -= dt; if (f.life <= 0) { fx[i] = fx[fx.length - 1]; fx.pop(); continue; }
      if (f.s === 0.55) { f.x = lerp(f.x, X.c4, dt * 6); f.y = lerp(f.y, -4, dt * 6); f.z = lerp(f.z, 1, dt * 6); } else { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; const d = Math.exp(-0.8 * dt); f.vx *= d; f.vy *= d; f.vz *= d; }
      const a = Math.min(1, f.life / f.max * 2.2) * Math.min(1, (f.max - f.life) * 8); glow.add(f.x, f.y, f.z, f.r * a, f.g * a, f.b * a, f.s); }
    glow.end(); glowX.end();
    skyM.material.uniforms.uMid.value.copy(skyCool).lerp(skyHot, heatX); out.heatX = heatX;

    scene.fog.color.copy(fogCool).lerp(fogHot, heatX * 0.85);
    hemi.color.setRGB(lerp(0.56, 1.0, heatX), lerp(0.9, 0.62, heatX), lerp(1.0, 0.5, heatX));
    if (!active && electrons.length === 0) acc.a = acc.b = 0;
  }

  return { scene, glow, glowX, out, labels, update, reset, stats, on: (f) => listeners.push(f), counts: () => ({ electrons: electrons.length, protons: imsCount, jam: stats.jam }) };
}
