// Interactive 3D instruction viewer built on Three.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const texCache = new Map();
function woodTexture() {
  if (texCache.has('wood')) return texCache.get('wood');
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * 256, a = 0.04 + Math.random() * 0.12;
    g.strokeStyle = `rgba(90,55,20,${a})`; g.lineWidth = 0.5 + Math.random() * 2.2;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 40 + i) * 3);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  texCache.set('wood', t); return t;
}
function gridTexture(kind) {
  if (texCache.has(kind)) return texCache.get(kind);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'solar') {
    g.fillStyle = '#16264f'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#9fb3d9'; g.lineWidth = 1.5;
    for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  } else {
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { g.fillStyle = ((x + y) / 8) % 2 ? '#2b2b2b' : '#111'; g.fillRect(x, y, 8, 8); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(kind, t); return t;
}

const matCache = new Map();
function material(m, color) {
  const key = m + color;
  if (matCache.has(key)) return matCache.get(key);
  const c = new THREE.Color(color);
  let mat;
  switch (m) {
    case 'wood': mat = new THREE.MeshPhysicalMaterial({ color: c, map: woodTexture(), roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 }); break;
    case 'metal': mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.2 }); break;
    case 'chrome': mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.08, metalness: 1, envMapIntensity: 1.5 }); break;
    case 'paint': mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 }); break;
    case 'pcb': mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.45, clearcoat: 0.6 }); break;
    case 'rubber': mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 }); break;
    case 'plastic': mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, clearcoat: 0.3 }); break;
    case 'glass': mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, clearcoat: 1, envMapIntensity: 1.6 }); break;
    case 'water': mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false, clearcoat: 1 }); break;
    case 'emissive': mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6 }); break;
    case 'screen': mat = new THREE.MeshPhysicalMaterial({ color: '#0a1626', emissive: c, emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1 }); break;
    case 'solar': mat = new THREE.MeshPhysicalMaterial({ map: gridTexture('solar'), roughness: 0.2, metalness: 0.4, clearcoat: 1 }); break;
    case 'carbon': mat = new THREE.MeshPhysicalMaterial({ map: gridTexture('carbon'), roughness: 0.35, metalness: 0.3, clearcoat: 1 }); break;
    case 'fabric': mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.95, sheen: 1, sheenColor: c.clone().offsetHSL(0, 0, 0.2), sheenRoughness: 0.6 }); break;
    case 'leaf': mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }); break;
    case 'soil': mat = new THREE.MeshStandardMaterial({ color: c, roughness: 1 }); break;
    case 'concrete': mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }); break;
    default: mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.05 });
  }
  matCache.set(key, mat);
  return mat;
}

function hullGeometry(L, B, D) {
  const N = 28, M = 14, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = -L / 2 + t * L;
    const w = (t < 0.45 ? 0.82 + 0.18 * (t / 0.45) : Math.cos(((t - 0.45) / 0.55) * Math.PI / 2)) * B / 2;
    const d = D * (t < 0.75 ? 1 : 1 - ((t - 0.75) / 0.25) * 0.55);
    const sheer = Math.pow(t, 3) * D * 0.35;
    for (let j = 0; j <= M; j++) { const a = (j / M) * Math.PI; pos.push(x, -Math.sin(a) * d + sheer * (1 - Math.sin(a)), Math.cos(a) * Math.max(w, 0.001)); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function airfoil(chord, thick) {
  const sh = new THREE.Shape(); const n = 24;
  for (let i = 0; i <= n; i++) { const x = 1 - i / n; sh[i ? 'lineTo' : 'moveTo']((x - 0.5) * chord, 5 * thick * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4) / 0.12 * 0.12 * 1.0); }
  for (let i = 1; i <= n; i++) { const x = i / n; sh.lineTo((x - 0.5) * chord, -0.35 * 5 * thick * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4)); }
  return sh;
}
function gearShape(r, teeth) {
  const sh = new THREE.Shape(); const ro = r, ri = r * 0.86, n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = (i % 4 === 1 || i % 4 === 2) ? ro : ri; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.15, 0, Math.PI * 2, true); sh.holes.push(hole);
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5, h = new THREE.Path(); h.absarc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.16, 0, Math.PI * 2, true); sh.holes.push(h); }
  return sh;
}

const D2R = Math.PI / 180;
function axisRotate(obj, axis) { if (axis === 'x') obj.rotation.z = Math.PI / 2; else if (axis === 'z') obj.rotation.x = Math.PI / 2; }

export function buildShape(spec) {
  let obj;
  const mesh = (g) => new THREE.Mesh(g, material(spec.m, spec.c));
  switch (spec.t) {
    case 'box': { const [w, h, d] = spec.s; const r = Math.min(w, h, d) * 0.08; obj = mesh(r > 0.05 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d)); break; }
    case 'rbox': { const [w, h, d] = spec.s; const r = Math.min(spec.rad, Math.min(w, h, d) / 2 - 1e-3); obj = mesh(r > 0.01 ? new RoundedBoxGeometry(w, h, d, 4, r) : new THREE.BoxGeometry(w, h, d)); break; }
    case 'cyl': { const m = mesh(new THREE.CylinderGeometry(spec.r2, spec.r, spec.h, 40)); axisRotate(m, spec.axis); obj = new THREE.Group(); obj.add(m); break; }
    case 'capsule': { const m = mesh(new THREE.CapsuleGeometry(spec.r, Math.max(0.001, spec.len), 10, 28)); axisRotate(m, spec.axis); obj = new THREE.Group(); obj.add(m); break; }
    case 'sphere': obj = mesh(new THREE.SphereGeometry(spec.r, 40, 28)); if (spec.sc) obj.scale.set(...spec.sc); break;
    case 'torus': { const m = mesh(new THREE.TorusGeometry(spec.R, spec.r, 18, 48)); if (spec.axis === 'x') m.rotation.y = Math.PI / 2; else if (spec.axis === 'y') m.rotation.x = Math.PI / 2; obj = new THREE.Group(); obj.add(m); break; }
    case 'lathe': { const g = new THREE.LatheGeometry(spec.pts.map(([r, y]) => new THREE.Vector2(r, y)), 48); const m = mesh(g); m.material = m.material.clone(); m.material.side = THREE.DoubleSide; obj = m; break; }
    case 'hull': { const m = mesh(hullGeometry(spec.L, spec.B, spec.D)); m.material = m.material.clone(); m.material.side = THREE.DoubleSide; obj = m; break; }
    case 'wing': { const g = new THREE.ExtrudeGeometry(airfoil(spec.chord, spec.thick), { depth: spec.span, bevelEnabled: false, steps: 1 }); g.translate(0, 0, -spec.span / 2); obj = mesh(g); break; }
    case 'tri': { const sh = new THREE.Shape(spec.pts.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ExtrudeGeometry(sh, { depth: spec.thick, bevelEnabled: true, bevelThickness: spec.thick * 0.3, bevelSize: spec.thick * 0.3, bevelSegments: 2 }); g.translate(0, 0, -spec.thick / 2); obj = mesh(g); break; }
    case 'gear': { const g = new THREE.ExtrudeGeometry(gearShape(spec.r, spec.teeth), { depth: spec.thick, bevelEnabled: true, bevelThickness: spec.thick * 0.15, bevelSize: spec.r * 0.015, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -spec.thick / 2); obj = mesh(g); break; }
    case 'profile': {
      const pts = spec.pts.map(([x, y]) => new THREE.Vector2(x, y)); pts.push(pts[0].clone());
      const curve = new THREE.SplineCurve(pts); const sh = new THREE.Shape(curve.getPoints(Math.max(48, pts.length * 10)));
      const bev = Math.min(spec.bevel ?? spec.width * 0.18, spec.width * 0.45);
      const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.01, spec.width - 2 * bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 8, curveSegments: 24 });
      g.translate(0, 0, -(spec.width - 2 * bev) / 2); g.computeVertexNormals(); obj = mesh(g); break;
    }
    case 'tube': { const curve = new THREE.CatmullRomCurve3(spec.pts.map((q) => new THREE.Vector3(...q))); obj = mesh(new THREE.TubeGeometry(curve, Math.max(16, spec.pts.length * 16), spec.r, 14, false)); break; }
    case 'comp': obj = new THREE.Group(); for (const ch of spec.children) { const o = buildShape(ch.shape); o.position.set(...ch.p); o.rotation.set(ch.r[0] * D2R, ch.r[1] * D2R, ch.r[2] * D2R); obj.add(o); } break;
    default: obj = new THREE.Group();
  }
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  return obj;
}

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const ease = (t) => 1 - Math.pow(1 - t, 3);

export class Viewer {
  constructor(container, { onPick, onHover, settings = {} } = {}) {
    this.container = container; this.onPick = onPick; this.onHover = onHover;
    this.opts = { theme: 'light', quality: 'high', grid: true, animSpeed: 1, autoFocus: true, fmt: (v) => v.toFixed(1), ...settings };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer(); this.labels.domElement.className = 'labels3d'; container.appendChild(this.labels.domElement);
    this.scene = new THREE.Scene();
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.hemi = new THREE.HemisphereLight('#ffffff', '#f3e3d3', 0.6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff6ec', 2.4); this.sun.castShadow = true; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.rim = new THREE.DirectionalLight('#ffb36b', 0.9);
    this.scene.add(this.sun, this.sun.target, this.rim);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.dimGroup = new THREE.Group(); this.scene.add(this.dimGroup);
    this.instances = []; this.step = 0; this.explode = 0; this.ghost = false; this.anim = []; this.camTween = null;
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => { this._down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => { if (this._down && Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) < 5) this.pick(e); });
    el.addEventListener('pointermove', (e) => { this._move = e; });
    el.addEventListener('pointerleave', () => { this._move = null; this.setHover(null); });
    this.controls.addEventListener('start', () => { this.camTween = null; });
    this.buildComposer();
    new ResizeObserver(() => this.resize()).observe(container);
    this.applySettings(this.opts);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  buildComposer() {
    const c = new EffectComposer(this.renderer);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = new GTAOPass(this.scene, this.camera, 1, 1); this.gtao.output = GTAOPass.OUTPUT.Default; c.addPass(this.gtao);
    this.outline = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera);
    Object.assign(this.outline, { edgeStrength: 5, edgeGlow: 0.4, edgeThickness: 1.6, pulsePeriod: 2.2 });
    this.outline.visibleEdgeColor.set('#ff6a00'); this.outline.hiddenEdgeColor.set('#ffb27a'); c.addPass(this.outline);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.4, 0.96); c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.smaa = new SMAAPass(1, 1); c.addPass(this.smaa);
    this.composer = c;
  }

  applySettings(o) {
    Object.assign(this.opts, o);
    const dark = this.opts.theme === 'dark';
    this.bg = new THREE.Color(dark ? '#17120f' : '#f7f2ed');
    this.scene.background = this.bg;
    this.scene.fog = new THREE.Fog(this.bg, (this.R || 100) * 4, (this.R || 100) * 10);
    const q = this.opts.quality;
    this.scene.environment = q === 'performance' ? null : this.envTex;
    this.renderer.shadowMap.enabled = q !== 'performance';
    const sm = q === 'high' ? 4096 : 1536; this.sun.shadow.mapSize.set(sm, sm); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
    this.renderer.setPixelRatio(Math.min(q === 'high' ? 2 : 1.25, window.devicePixelRatio || 1));
    this.hemi.intensity = q === 'performance' ? 1.4 : 0.6;
    this.gtao.enabled = q === 'high'; this.bloom.enabled = q !== 'performance'; this.smaa.enabled = q !== 'performance';
    if (this.grid) this.grid.visible = !!this.opts.grid;
    if (this.floor) this.floor.material.opacity = dark ? 0.45 : 0.22;
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h); this.composer.setSize(w, h); this.labels.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  clear() { this.root.clear(); this.dimGroup.clear(); this.instances = []; this.center = null; this.outline.selectedObjects = []; }

  load(plan) {
    this.clear(); this.selected = null; this.plan = plan;
    const parts = Object.fromEntries(plan.parts.map((p) => [p.id, p]));
    plan.steps.forEach((s, si) => (s.add || []).forEach((a) => {
      const part = parts[a.part]; if (!part?.shape) return;
      const obj = buildShape(part.shape);
      obj.position.set(...a.p);
      const r = a.r || [0, 0, 0]; obj.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);
      obj.userData = { partId: a.part, step: si, home: new THREE.Vector3(...a.p) };
      obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.userData.base = { opacity: o.material.opacity, transparent: o.material.transparent, emissive: o.material.emissive?.clone(), ei: o.material.emissiveIntensity }; o.userData.inst = obj; } });
      this.root.add(obj); this.instances.push(obj);
    }));
    const box = new THREE.Box3().setFromObject(this.root);
    this.center = box.getCenter(new THREE.Vector3()); this.size = box.getSize(new THREE.Vector3());
    const R = Math.max(this.size.x, this.size.y, this.size.z) || 1; this.R = R;
    if (this.grid) { this.scene.remove(this.grid); this.scene.remove(this.floor); }
    const dark = this.opts.theme === 'dark';
    this.grid = new THREE.GridHelper(R * 6, 48, dark ? '#5a3a22' : '#f0b98a', dark ? '#2a211b' : '#eadfd4'); this.grid.position.y = box.min.y - 0.001; this.grid.visible = !!this.opts.grid;
    this.grid.material.transparent = true; this.grid.material.opacity = 0.7;
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 12, R * 12), new THREE.ShadowMaterial({ opacity: dark ? 0.45 : 0.22 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = box.min.y; this.floor.receiveShadow = true;
    this.scene.add(this.grid, this.floor);
    this.sun.position.set(this.center.x + R * 1.2, this.center.y + R * 2, this.center.z + R * 1.5); this.sun.target.position.copy(this.center);
    this.rim.position.set(this.center.x - R * 1.5, this.center.y + R, this.center.z - R * 1.5);
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -R * 1.5; sc.right = sc.top = R * 1.5; sc.near = 0.1; sc.far = R * 6; sc.updateProjectionMatrix();
    this.scene.fog = new THREE.Fog(this.bg, R * 4, R * 10);
    this.camera.near = R / 300; this.camera.far = R * 60; this.camera.updateProjectionMatrix();
    this.gtao.updateGtaoMaterial({ radius: R * 0.06, distanceExponent: 1, thickness: R * 0.03, scale: 1 });
    this.resetView(false);
  }

  viewFor(center, radius) {
    const dir = new THREE.Vector3(1.25, 0.9, 1.55).normalize();
    const dist = radius / Math.sin((this.camera.fov * D2R) / 2) * 0.85;
    return { pos: center.clone().add(dir.multiplyScalar(dist)), target: center.clone() };
  }
  tweenTo(pos, target, ms = 700) { this.camTween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, start: performance.now(), ms }; }
  resetView(animate = true) {
    if (!this.center) return;
    const v = this.viewFor(this.center, this.R * 0.95);
    if (animate) this.tweenTo(v.pos, v.target); else { this.camera.position.copy(v.pos); this.controls.target.copy(v.target); this.controls.update(); }
  }
  focusStep(i) {
    const objs = this.instances.filter((o) => o.userData.step === i);
    if (!objs.length) return this.resetView();
    const b = new THREE.Box3(); objs.forEach((o) => b.expandByObject(o));
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(b.getSize(new THREE.Vector3()).length() * 0.7, this.R * 0.7);
    const center = c.lerp(this.center, 0.35);
    const v = this.viewFor(center, Math.min(r, this.R * 0.95));
    this.tweenTo(v.pos, v.target);
  }

  setStep(i, animate = true) {
    this.step = i;
    const preview = !this.instances.some((o) => o.userData.step <= i);
    const fresh = [];
    for (const obj of this.instances) {
      const s = obj.userData.step, isNew = s === i, future = s > i;
      obj.visible = s <= i || this.ghost || preview;
      if (isNew) fresh.push(obj);
      obj.traverse((o) => {
        if (!o.isMesh) return; const b = o.userData.base;
        o.material.transparent = future || b.transparent; o.material.opacity = future ? (preview ? 0.3 : 0.12) : b.opacity; o.material.depthWrite = !future && !b.transparent;
        if (o.material.emissive) { o.material.emissive.copy(b.emissive); o.material.emissiveIntensity = b.ei; }
      });
      if (isNew && animate && this.opts.animSpeed > 0) this.anim.push({ obj, t0: performance.now() + fresh.length * 60 / this.opts.animSpeed, from: this.R * 0.3 });
    }
    this.outline.selectedObjects = fresh;
    this.applyExplode();
    if (animate && this.opts.autoFocus) this.focusStep(i);
    this.showDims(null);
  }

  setExplode(f) { this.explode = f; this.applyExplode(); }
  setGhost(g) { this.ghost = g; this.setStep(this.step, false); }
  setAutoRotate(on) { this.controls.autoRotate = on; this.controls.autoRotateSpeed = 1.2; }
  setWireframe(on) { this.root.traverse((o) => { if (o.isMesh) o.material.wireframe = on; }); }
  applyExplode() {
    if (!this.center) return;
    for (const obj of this.instances) {
      const h = obj.userData.home;
      obj.userData.target = h.clone().add(h.clone().sub(this.center).multiplyScalar(this.explode * 1.2));
      if (!this.anim.find((a) => a.obj === obj)) obj.position.copy(obj.userData.target);
    }
  }

  highlightPart(partId) {
    this.selected = partId;
    const objs = this.instances.filter((o) => o.userData.partId === partId && o.visible);
    this.outline.selectedObjects = objs.length ? objs : this.instances.filter((o) => o.userData.step === this.step);
    this.outline.visibleEdgeColor.set(objs.length ? '#ff3d00' : '#ff6a00');
    this.showDims(objs[0] || null);
  }

  showDims(obj) {
    this.dimGroup.clear();
    this.labels.domElement.querySelectorAll('.dim').forEach((d) => d.remove());
    if (!obj) return;
    const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3());
    const helper = new THREE.Box3Helper(b, new THREE.Color('#ff6a00')); helper.material.depthTest = false; helper.material.transparent = true; helper.material.opacity = 0.9; this.dimGroup.add(helper);
    const mk = (text, pos) => { const d = document.createElement('div'); d.className = 'dim'; d.textContent = text; const o = new CSS2DObject(d); o.position.copy(pos); this.dimGroup.add(o); };
    mk(this.opts.fmt(s.x), new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, b.max.z));
    mk(this.opts.fmt(s.y), new THREE.Vector3(b.max.x, (b.min.y + b.max.y) / 2, b.max.z));
    mk(this.opts.fmt(s.z), new THREE.Vector3(b.max.x, b.min.y, (b.min.z + b.max.z) / 2));
  }

  hit(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.instances.filter((o) => o.visible && o.userData.step <= this.step), true);
    return hits[0]?.object.userData.inst || null;
  }
  pick(e) { const inst = this.hit(e); if (inst) { this.highlightPart(inst.userData.partId); this.onPick?.(inst.userData.partId); } }
  setHover(inst, e) {
    const id = inst?.userData.partId || null;
    if (id !== this._hoverId) { this._hoverId = id; this.renderer.domElement.style.cursor = id ? 'pointer' : ''; }
    this.onHover?.(id, e);
  }

  // ---------- exports ----------
  partGroup(partId, scaleToMm) {
    const part = this.plan.parts.find((p) => p.id === partId);
    const g = new THREE.Group(); const o = buildShape(part.shape); g.add(o); g.scale.setScalar(scaleToMm); g.updateMatrixWorld(true);
    return g;
  }
  partStats(partId, scaleToMm) {
    const g = this.partGroup(partId, scaleToMm); let vol = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    g.traverse((m) => {
      if (!m.isMesh) return;
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i += 3) { a.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(pos, i + 1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(pos, i + 2).applyMatrix4(m.matrixWorld); vol += a.dot(b.clone().cross(c)) / 6; }
    });
    const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
    return { volumeCm3: Math.abs(vol) / 1000, size: [size.x, size.y, size.z] };
  }
  exportSTL(partId, scaleToMm) {
    const g = this.partGroup(partId, scaleToMm);
    const b = new THREE.Box3().setFromObject(g); g.position.y -= b.min.y; g.updateMatrixWorld(true);
    return new Blob([new STLExporter().parse(g, { binary: true })], { type: 'model/stl' });
  }
  exportGLB() {
    return new Promise((res, rej) => new GLTFExporter().parse(this.root, (buf) => res(new Blob([buf], { type: 'model/gltf-binary' })), rej, { binary: true, onlyVisible: false }));
  }

  screenshot() { this.render(); return this.renderer.domElement.toDataURL('image/png'); }
  render() { if (this.opts.quality === 'performance') this.renderer.render(this.scene, this.camera); else this.composer.render(); this.labels.render(this.scene, this.camera); }

  tick() {
    const now = performance.now();
    this.anim = this.anim.filter((a) => {
      const k = Math.max(0, Math.min(1, (now - a.t0) / (650 / (this.opts.animSpeed || 1)))), e = ease(k);
      a.obj.position.copy(a.obj.userData.target).add(new THREE.Vector3(0, a.from * (1 - e), 0));
      a.obj.scale.setScalar(0.8 + 0.2 * e);
      return k < 1;
    });
    if (this.camTween) {
      const t = Math.min(1, (now - this.camTween.start) / this.camTween.ms), e = ease(t);
      this.camera.position.lerpVectors(this.camTween.p0, this.camTween.p1, e); this.controls.target.lerpVectors(this.camTween.t0, this.camTween.t1, e);
      if (t >= 1) this.camTween = null;
    }
    if (this._move && this.instances.length && (!this._lastHover || now - this._lastHover > 60)) { this._lastHover = now; this.setHover(this.hit(this._move), this._move); }
    this.controls.update();
    this.render();
  }
}
