// Shared helpers: additive glow particles, seeded random, sky dome, fresnel shell.
import * as THREE from 'three';

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One draw call for every glowing particle in a scene. Systems rewrite the
// buffers each frame between begin() and end().
export class GlowPoints {
  constructor(max) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    const mk = (arr, n) => { const a = new THREE.BufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    g.setAttribute('position', mk(this.pos, 3));
    g.setAttribute('aColor', mk(this.col, 3));
    g.setAttribute('aSize', mk(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uFog: { value: 0.012 } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; varying vec3 vC; uniform float uScale; uniform float uFog;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float d = -mv.z;
          vC = aColor * exp(-uFog*uFog*d*d); gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(0.1, d); }`,
      fragmentShader: `varying vec3 vC; void main(){ float r = length(gl_PointCoord-0.5)*2.0;
          float a = pow(max(0.0, 1.0-r), 2.2); gl_FragColor = vec4(vC*a, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }
  begin() { this.n = 0; }
  add(x, y, z, r, g, b, s) {
    const i = this.n; if (i >= this.max) return;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.size[i] = s; this.n = i + 1;
  }
  end() {
    const g = this.points.geometry; g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true; g.attributes.aColor.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
  }
}

export function skyDome(top, mid, bottom) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uBot: { value: new THREE.Color(bottom) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.9, h)) : mix(uMid, uBot, smoothstep(0.0, -0.9, h));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// Glassy rim-lit shell with an optional world-space cut plane.
export function fresnelMaterial(color, plane, opacity = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uPlane: { value: plane || new THREE.Vector4(0, 1, 0, 1e9) }, uOpacity: { value: opacity } },
    vertexShader: `varying vec3 vN; varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform vec4 uPlane; uniform float uOpacity; varying vec3 vN; varying vec3 vW;
      void main(){ if (dot(vW, uPlane.xyz) > uPlane.w) discard;
        vec3 v = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.4);
        gl_FragColor = vec4(uColor*(0.22 + 1.7*f), (0.10 + 0.85*f)*uOpacity); }`,
  });
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
