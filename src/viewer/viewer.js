// Interactive 3D instruction viewer built on Three.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

function material(m, color) {
  const c = new THREE.Color(color);
  switch (m) {
    case 'wood': return new THREE.MeshStandardMaterial({ color: c, map: woodTexture(), roughness: 0.75, metalness: 0 });
    case 'metal': return new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0.85 });
    case 'pcb': return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1 });
    case 'rubber': return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
    case 'glass': return new THREE.MeshStandardMaterial({ color: c, roughness: 0.1, transparent: true, opacity: 0.28, metalness: 0.1, depthWrite: false });
    case 'emissive': return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4 });
    case 'solar': return new THREE.MeshStandardMaterial({ map: gridTexture('solar'), roughness: 0.25, metalness: 0.4 });
    case 'carbon': return new THREE.MeshStandardMaterial({ map: gridTexture('carbon'), roughness: 0.4, metalness: 0.3 });
    case 'soil': return new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
    default: return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.05 });
  }
}

const D2R = Math.PI / 180;
function axisRotate(obj, axis) { if (axis === 'x') obj.rotation.z = Math.PI / 2; else if (axis === 'z') obj.rotation.x = Math.PI / 2; }

export function buildShape(spec) {
  let obj;
  switch (spec.t) {
    case 'box': obj = new THREE.Mesh(new THREE.BoxGeometry(...spec.s), material(spec.m, spec.c)); break;
    case 'cyl': { obj = new THREE.Mesh(new THREE.CylinderGeometry(spec.r2, spec.r, spec.h, 28), material(spec.m, spec.c)); const g = new THREE.Group(); axisRotate(obj, spec.axis); g.add(obj); obj = g; break; }
    case 'sphere': obj = new THREE.Mesh(new THREE.SphereGeometry(spec.r, 24, 16), material(spec.m, spec.c)); break;
    case 'torus': { const m = new THREE.Mesh(new THREE.TorusGeometry(spec.R, spec.r, 14, 36), material(spec.m, spec.c)); if (spec.axis === 'x') m.rotation.y = Math.PI / 2; else if (spec.axis === 'y') m.rotation.x = Math.PI / 2; obj = new THREE.Group(); obj.add(m); break; }
    case 'comp': obj = new THREE.Group(); for (const ch of spec.children) { const o = buildShape(ch.shape); o.position.set(...ch.p); o.rotation.set(ch.r[0] * D2R, ch.r[1] * D2R, ch.r[2] * D2R); obj.add(o); } break;
    default: obj = new THREE.Group();
  }
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  return obj;
}

export class Viewer {
  constructor(container, { onPick } = {}) {
    this.container = container; this.onPick = onPick;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f1420');
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.scene.add(new THREE.HemisphereLight('#dfe9ff', '#30261c', 1.1));
    this.sun = new THREE.DirectionalLight('#ffffff', 2.2); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun, this.sun.target);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.instances = []; this.step = 0; this.explode = 0; this.ghost = false; this.anim = [];
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointerdown', (e) => { this._down = [e.clientX, e.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', (e) => { if (this._down && Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) < 5) this.pick(e); });
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.tick());
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
    this.grid = new THREE.GridHelper(R * 4, 40, '#3b4a66', '#222c3d'); this.grid.position.y = box.min.y - 0.001;
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 4, R * 4), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = box.min.y; this.floor.receiveShadow = true;
    this.scene.add(this.grid, this.floor);
    this.sun.position.set(this.center.x + R * 1.2, this.center.y + R * 2, this.center.z + R * 1.5); this.sun.target.position.copy(this.center);
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -R * 1.5; sc.right = sc.top = R * 1.5; sc.near = 0.1; sc.far = R * 6; sc.updateProjectionMatrix();
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
    for (const obj of this.instances) {
      const s = obj.userData.step;
      obj.visible = s <= i || this.ghost;
      const isNew = s === i, future = s > i;
      obj.traverse((o) => {
        if (!o.isMesh) return; const b = o.userData.base;
        o.material.transparent = future || b.transparent; o.material.opacity = future ? 0.12 : b.opacity; o.material.depthWrite = !future;
        if (o.material.emissive) { o.material.emissive.copy(isNew ? new THREE.Color('#2a6cff') : b.emissive); o.material.emissiveIntensity = isNew ? 0.35 : b.ei; }
      });
      if (isNew && animate) this.anim.push({ obj, t0: performance.now(), from: this.R * 0.35 });
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
    for (const obj of this.instances) obj.traverse((o) => { if (o.isMesh && o.material.emissive && obj.userData.step <= this.step) { const sel = obj.userData.partId === partId; if (sel) { o.material.emissive.set('#ffb020'); o.material.emissiveIntensity = 0.45; } else if (obj.userData.step !== this.step) { o.material.emissive.copy(o.userData.base.emissive); o.material.emissiveIntensity = o.userData.base.ei; } } });
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
      const k = Math.min(1, (now - a.t0) / 650), e = 1 - Math.pow(1 - k, 3);
      a.obj.position.copy(a.obj.userData.target).add(new THREE.Vector3(0, a.from * (1 - e), 0));
      a.obj.scale.setScalar(0.85 + 0.15 * e);
      return k < 1;
    });
    const pulse = 0.25 + 0.2 * Math.sin(now / 250);
    for (const obj of this.instances) if (obj.userData.step === this.step && obj.userData.partId !== this.selected) obj.traverse((o) => { if (o.isMesh && o.material.emissive && o.userData.base.ei < 1) o.material.emissiveIntensity = pulse; });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
