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
    case 'tube': { const curve = new THREE.CatmullRomCurve3(spec.pts.map((q) => new THREE.Vector3(...q))); obj = mesh(new THREE.TubeGeometry(curve, Math.max(16, spec.pts.length * 16), spec.r, 14, false)); break; }
    case 'comp': obj = new THREE.Group(); for (const ch of spec.children) { const o = buildShape(ch.shape); o.position.set(...ch.p); o.rotation.set(ch.r[0] * D2R, ch.r[1] * D2R, ch.r[2] * D2R); obj.add(o); } break;
    default: obj = new THREE.Group();
  }
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  return obj;
}

export class Viewer {
  constructor(container, { onPick, settings = {} } = {}) {
    this.container = container; this.onPick = onPick; this.opts = { theme: 'light', quality: 'high', grid: true, animSpeed: 1, ...settings };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.hemi = new THREE.HemisphereLight('#ffffff', '#f3e3d3', 0.6); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff6ec', 2.4); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004; this.sun.shadow.radius = 4;
    this.rim = new THREE.DirectionalLight('#ffb36b', 0.8);
    this.scene.add(this.sun, this.sun.target, this.rim);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.instances = []; this.step = 0; this.explode = 0; this.ghost = false; this.anim = [];
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointerdown', (e) => { this._down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', (e) => { if (this._down && Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) < 5) this.pick(e); });
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.clock = new THREE.Clock();
    this.applySettings(this.opts);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  applySettings(o) {
    Object.assign(this.opts, o);
    const dark = this.opts.theme === 'dark';
    this.bg = dark ? new THREE.Color('#17120f') : new THREE.Color('#f7f2ed');
    this.scene.background = this.bg;
    this.scene.fog = new THREE.Fog(this.bg, (this.R || 100) * 4, (this.R || 100) * 9);
    const q = this.opts.quality;
    this.scene.environment = q === 'performance' ? null : this.envTex;
    this.renderer.shadowMap.enabled = q !== 'performance';
    this.sun.shadow.mapSize.set(q === 'high' ? 4096 : 1024, q === 'high' ? 4096 : 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
    this.renderer.setPixelRatio(Math.min(q === 'high' ? 2 : 1, window.devicePixelRatio));
    this.hemi.intensity = q === 'performance' ? 1.4 : 0.6;
    if (this.grid) this.grid.visible = !!this.opts.grid;
    if (this.floor) this.floor.material.opacity = dark ? 0.45 : 0.22;
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  load(plan) {
    this.root.clear(); this.instances = []; this.selected = null;
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
    if (this.grid) this.scene.remove(this.grid), this.scene.remove(this.floor);
    const dark = this.opts.theme === 'dark';
    this.grid = new THREE.GridHelper(R * 6, 48, dark ? '#5a3a22' : '#f0b98a', dark ? '#2a211b' : '#eadfd4'); this.grid.position.y = box.min.y - 0.001; this.grid.visible = !!this.opts.grid;
    this.grid.material.transparent = true; this.grid.material.opacity = 0.7;
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 12, R * 12), new THREE.ShadowMaterial({ opacity: dark ? 0.45 : 0.22 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = box.min.y; this.floor.receiveShadow = true;
    this.scene.add(this.grid, this.floor);
    this.sun.position.set(this.center.x + R * 1.2, this.center.y + R * 2, this.center.z + R * 1.5); this.sun.target.position.copy(this.center);
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -R * 1.5; sc.right = sc.top = R * 1.5; sc.near = 0.1; sc.far = R * 6; sc.updateProjectionMatrix();
    this.rim.position.set(this.center.x - R * 1.5, this.center.y + R, this.center.z - R * 1.5);
    this.scene.fog = new THREE.Fog(this.bg, R * 4, R * 9);
    this.camera.near = R / 200; this.camera.far = R * 50; this.camera.updateProjectionMatrix();
    this.resetView();
  }

  resetView() {
    if (!this.center) return;
    const R = this.R;
    this.camera.position.set(this.center.x + R * 1.25, this.center.y + R * 0.9, this.center.z + R * 1.55);
    this.controls.target.copy(this.center); this.controls.update();
  }

  setStep(i, animate = true) {
    this.step = i;
    const preview = !this.instances.some((o) => o.userData.step <= i);
    for (const obj of this.instances) {
      const s = obj.userData.step;
      obj.visible = s <= i || this.ghost || preview;
      const isNew = s === i, future = s > i;
      obj.traverse((o) => {
        if (!o.isMesh) return; const b = o.userData.base;
        o.material.transparent = future || b.transparent; o.material.opacity = future ? (preview ? 0.3 : 0.12) : b.opacity; o.material.depthWrite = !future && !b.transparent;
        if (o.material.emissive) { o.material.emissive.copy(isNew ? new THREE.Color('#ff7a1a') : b.emissive); o.material.emissiveIntensity = isNew ? 0.35 : b.ei; }
      });
      if (isNew && animate && this.opts.animSpeed > 0) this.anim.push({ obj, t0: performance.now(), from: this.R * 0.35 });
    }
    this.applyExplode();
  }

  setExplode(f) { this.explode = f; this.applyExplode(); }
  setGhost(g) { this.ghost = g; this.setStep(this.step, false); }
  setAutoRotate(on) { this.controls.autoRotate = on; this.controls.autoRotateSpeed = 1.2; }
  setWireframe(on) { this.root.traverse((o) => { if (o.isMesh) o.material.wireframe = on; }); }

  applyExplode() {
    for (const obj of this.instances) {
      const h = obj.userData.home;
      const dir = h.clone().sub(this.center);
      obj.userData.target = h.clone().add(dir.multiplyScalar(this.explode * 1.2));
      if (!this.anim.find((a) => a.obj === obj)) obj.position.copy(obj.userData.target);
    }
  }

  highlightPart(partId) {
    this.selected = partId;
    for (const obj of this.instances) obj.traverse((o) => { if (o.isMesh && o.material.emissive && obj.userData.step <= this.step) { const sel = obj.userData.partId === partId; if (sel) { o.material.emissive.set('#ff5a00'); o.material.emissiveIntensity = 0.5; } else if (obj.userData.step !== this.step) { o.material.emissive.copy(o.userData.base.emissive); o.material.emissiveIntensity = o.userData.base.ei; } } });
  }

  pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.instances.filter((o) => o.visible && o.userData.step <= this.step), true);
    const inst = hits[0]?.object.userData.inst;
    if (inst) { this.highlightPart(inst.userData.partId); this.onPick?.(inst.userData.partId); }
  }

  screenshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

  tick() {
    const now = performance.now();
    this.anim = this.anim.filter((a) => {
      const k = Math.min(1, (now - a.t0) / (650 / (this.opts.animSpeed || 1))), e = 1 - Math.pow(1 - k, 3);
      a.obj.position.copy(a.obj.userData.target).add(new THREE.Vector3(0, a.from * (1 - e), 0));
      a.obj.scale.setScalar(0.85 + 0.15 * e);
      return k < 1;
    });
    const pulse = 0.12 + 0.12 * Math.sin(now / 250);
    for (const obj of this.instances) if (obj.userData.step === this.step && obj.userData.partId !== this.selected) obj.traverse((o) => { if (o.isMesh && o.material.emissive && o.userData.base.ei < 1) o.material.emissiveIntensity = pulse; });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
