// Title and descent scene: a cutaway mitochondrion adrift inside a cell.
import * as THREE from 'three';
import { GlowPoints, mulberry, skyDome, fresnelMaterial } from './fx.js';

export function createMacro(lite) {
  const rnd = mulberry(7);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020d12, 0.011);
  scene.add(skyDome(0x06303a, 0x031820, 0x010609));
  scene.add(new THREE.HemisphereLight(0x8fe9ff, 0x061022, 0.6));
  const key = new THREE.DirectionalLight(0xcff6ff, 0.9); key.position.set(8, 14, 12); scene.add(key);

  // World-space cut that always faces the viewer.
  const n0 = new THREE.Vector3(0.12, 0.5, 0.86).normalize();
  const CUT = 0.7;
  const clip = new THREE.Plane(n0.clone().negate(), CUT);
  const cut4 = new THREE.Vector4(n0.x, n0.y, n0.z, CUT);

  const mito = new THREE.Group();
  mito.rotation.set(0, -0.32, 0.14);
  scene.add(mito);

  const outerGeo = new THREE.CapsuleGeometry(4.0, 9, 20, 56); outerGeo.rotateZ(Math.PI / 2);
  const outer = new THREE.Mesh(outerGeo, fresnelMaterial(0x4fe3ff, cut4, 1));
  outer.renderOrder = 5; mito.add(outer);

  const innerGeo = new THREE.CapsuleGeometry(3.45, 9, 20, 56); innerGeo.rotateZ(Math.PI / 2);
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x1b7f92, emissive: 0x08404c, emissiveIntensity: 0.35, roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: [clip] });
  mito.add(new THREE.Mesh(innerGeo, innerMat));

  const cristaMat = new THREE.MeshStandardMaterial({ color: 0x35c9b8, emissive: 0x0f6f78, emissiveIntensity: 0.45, roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: [clip] });
  const flecks = [];
  for (let i = -4; i <= 4; i++) {
    const x = i * 1.22, r = 3.4, rr = r * 0.74, oy = (i % 2 ? 1 : -1) * r * 0.22;
    const g = new THREE.CylinderGeometry(rr, rr, 0.3, 48); g.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(g, cristaMat); m.position.set(x, oy, 0); mito.add(m);
    for (let k = 0; k < (lite ? 30 : 55); k++) {
      const a = rnd() * Math.PI * 2, q = Math.sqrt(rnd()) * rr * 0.95;
      flecks.push(new THREE.Vector3(x + (rnd() < 0.5 ? -0.2 : 0.2), oy + Math.cos(a) * q, Math.sin(a) * q), rnd() * 6.28);
    }
  }
  const glowIn = new THREE.PointLight(0x7dffe6, 9, 22, 2); mito.add(glowIn);

  // Far field: other mitochondria and a nucleus, so this reads as the inside of a cell.
  const far = new THREE.Group(); scene.add(far);
  const farGeo = new THREE.CapsuleGeometry(1, 2.6, 8, 20);
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(farGeo, fresnelMaterial(i % 3 ? 0x39c8e6 : 0x58f0c8, null, 0.8));
    const a = rnd() * Math.PI * 2, d = 26 + rnd() * 70;
    m.position.set(Math.cos(a) * d, (rnd() - 0.5) * 50, -12 - Math.abs(Math.sin(a)) * d);
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); const s = 1.2 + rnd() * 2.2; m.scale.setScalar(s);
    m.userData.spin = (rnd() - 0.5) * 0.08; far.add(m);
  }
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(52, 48, 32), fresnelMaterial(0x6a7cff, null, 0.7));
  nucleus.position.set(-78, 26, -170); scene.add(nucleus);

  const glow = new GlowPoints(4000); scene.add(glow.points);
  const dustN = lite ? 800 : 1500;
  const dust = new Float32Array(dustN * 5);
  for (let i = 0; i < dustN; i++) { dust[i * 5] = (rnd() - 0.5) * 130; dust[i * 5 + 1] = (rnd() - 0.5) * 80; dust[i * 5 + 2] = (rnd() - 0.5) * 130 - 10; dust[i * 5 + 3] = rnd() * 6.28; dust[i * 5 + 4] = rnd(); }
  const motesN = lite ? 120 : 220; const motes = [];
  for (let i = 0; i < motesN; i++) motes.push((rnd() - 0.5) * 11, (rnd() - 0.5) * 5, (rnd() - 0.5) * 5, rnd() * 6.28);

  const labels = [
    { text: 'Outer membrane', p: new THREE.Vector3(-5.6, 3.3, 0.5) },
    { text: 'Intermembrane space', p: new THREE.Vector3(6.6, -2.2, 1.6) },
    { text: 'Inner membrane', p: new THREE.Vector3(-6.1, -2.4, 1.2) },
    { text: 'Cristae (folds of the inner membrane)', p: new THREE.Vector3(1.2, 2.2, 1.6) },
    { text: 'Matrix', p: new THREE.Vector3(-1.85, -1.3, 1.9) },
  ];
  const v = new THREE.Vector3();
  function labelWorld(i, out) { return out.copy(labels[i].p).applyMatrix4(mito.matrixWorld); }

  function update(dt, t, still) {
    if (!still) { mito.rotation.x = Math.sin(t * 0.17) * 0.07; mito.position.y = Math.sin(t * 0.23) * 0.25; }
    mito.updateMatrixWorld();
    for (const m of far.children) m.rotation.x += m.userData.spin * dt;
    glowIn.intensity = 8 + 3 * Math.sin(t * 1.3);
    glow.begin();
    for (let i = 0; i < dustN; i++) {
      const ph = dust[i * 5 + 3], k = dust[i * 5 + 4];
      const x = dust[i * 5] + Math.sin(t * 0.11 + ph) * 2.5, y = dust[i * 5 + 1] + Math.cos(t * 0.09 + ph * 1.7) * 2.0, z = dust[i * 5 + 2] + Math.sin(t * 0.07 + ph * 0.6) * 2.5;
      const b = 0.25 + 0.2 * Math.sin(t * 0.8 + ph * 3);
      if (k < 0.08) glow.add(x, y, z, 1.6 * b, 0.9 * b, 0.25 * b, 0.9);
      else glow.add(x, y, z, 0.15 * b, 0.8 * b, 1.0 * b, 0.35 + k * 0.5);
    }
    for (let i = 0; i < flecks.length; i += 2) {
      v.copy(flecks[i]).applyMatrix4(mito.matrixWorld);
      if (v.dot(n0) > CUT - 0.05) continue;
      const b = 0.5 + 0.5 * Math.sin(t * 2.2 + flecks[i + 1]);
      glow.add(v.x, v.y, v.z, 1.9 * b, 1.35 * b, 0.35 * b, 0.22);
    }
    for (let i = 0; i < motes.length; i += 4) {
      const ph = motes[i + 3];
      v.set(motes[i] + Math.sin(t * 0.3 + ph) * 0.3, motes[i + 1] + Math.cos(t * 0.25 + ph) * 0.3, motes[i + 2]).applyMatrix4(mito.matrixWorld);
      if (v.dot(n0) > CUT) continue;
      glow.add(v.x, v.y, v.z, 0.2, 1.0, 0.9, 0.16);
    }
    glow.end();
  }
  return { scene, glow, labels, labelWorld, update, mito };
}
