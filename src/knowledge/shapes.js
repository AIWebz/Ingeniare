// Declarative 3D shape vocabulary. Blueprints describe every part with these
// specs; the viewer turns them into Three.js meshes. Rotations are in degrees.

export const box = (w, h, d, c = '#c8a165', m = 'wood') => ({ t: 'box', s: [w, h, d], c, m });
export const cyl = (r, h, c = '#999', m = 'metal', axis = 'y', r2) => ({ t: 'cyl', r, r2: r2 ?? r, h, c, m, axis });
export const sphere = (r, c = '#ccc', m = 'metal') => ({ t: 'sphere', r, c, m });
export const torus = (R, r, c = '#222', m = 'rubber', axis = 'x') => ({ t: 'torus', R, r, c, m, axis });
export const comp = (...children) => ({ t: 'comp', children });
export const at = (shape, p = [0, 0, 0], r = [0, 0, 0]) => ({ shape, p, r });

// ---------- electronics (millimetres) ----------
export function pcb(w, d, color = '#1d6b3a', chips = []) {
  return comp(at(box(w, 1.6, d, color, 'pcb')), ...chips.map(([cw, ch, cd, x, z, cc = '#111']) => at(box(cw, ch, cd, cc, 'plastic'), [x, 0.8 + ch / 2, z])));
}
export const arduinoUno = () => comp(
  at(pcb(68.6, 53.4, '#0b6aa2', [[10, 3, 35, 8, 0], [12, 11, 9, -28, 18, '#bbb'], [9, 11, 14, -29, -15, '#222'], [6, 8, 50, 30, 0, '#111']])),
);
export const l298n = () => comp(at(pcb(43, 43, '#b3261e', [[15, 25, 10, 0, -10, '#111'], [8, 10, 8, -15, 15, '#2a7de1'], [8, 10, 8, 15, 15, '#2a7de1']])));
export const hcsr04 = () => comp(at(box(45, 20, 1.6, '#0b4f8a', 'pcb')), at(cyl(8, 12, '#c0c0c0', 'metal', 'z'), [-13, 0, 7]), at(cyl(8, 12, '#c0c0c0', 'metal', 'z'), [13, 0, 7]));
export const ttMotor = () => comp(at(box(64, 22.5, 19, '#f2c230', 'plastic')), at(cyl(2.7, 37, '#fff', 'plastic', 'z'), [-12, 0, 0]));
export const wheel = (r = 32.5, w = 26) => comp(at(cyl(r - 6, w, '#f2c230', 'plastic', 'x')), at(torus(r - 4, 5, '#222', 'rubber', 'x')));
export const servoSG90 = () => comp(at(box(22.5, 22.7, 12, '#1f5fbf', 'plastic')), at(box(32, 2.5, 12, '#1f5fbf', 'plastic'), [0, 4, 0]), at(cyl(2.5, 4, '#fff', 'plastic'), [6, 13, 0]));
export const battery18650 = () => cyl(9, 65, '#2b7de9', 'plastic', 'x');
export const batteryHolder = (n = 2) => comp(at(box(77, 15, 21 * n, '#151515', 'plastic')), ...Array.from({ length: n }, (_, i) => at(battery18650(), [0, 6, (i - (n - 1) / 2) * 21])));
export const switchRocker = () => comp(at(box(21, 3, 15, '#111', 'plastic')), at(box(12, 6, 9, '#c1121f', 'plastic'), [0, 4, 0]));
export const casterBall = () => comp(at(cyl(10, 14, '#888', 'metal')), at(sphere(6, '#ddd', 'metal'), [0, -9, 0]));
export const ledStrip = (len) => {
  const n = Math.max(2, Math.round(len / 16));
  return comp(at(box(len, 2, 10, '#f5f5f5', 'plastic')), ...Array.from({ length: n }, (_, i) => at(box(3.5, 1, 2.8, '#fff7cf', 'emissive'), [(i - (n - 1) / 2) * (len / n), 1.4, 0])));
};
export const alChannel = (len) => comp(at(box(len, 12, 16, '#c9ccd1', 'metal')), at(box(len, 1, 14, '#f4f4f4', 'glass'), [0, -6.2, 0]));
export const fan = (size = 120) => comp(at(box(size, 25, size, '#1b1b1b', 'plastic')), at(cyl(size * 0.45, 26, '#333', 'plastic', 'y'), [0, 0, 0]), at(cyl(size * 0.14, 27, '#555', 'plastic', 'y')));
export const solarPanel = (w, d) => comp(at(box(w, 3, d, '#c0c0c0', 'metal')), at(box(w - 6, 3.4, d - 6, '#14254f', 'solar')));
export const motorBrushless = (dia, h) => comp(at(cyl(dia / 2, h, '#2c2c2c', 'metal')), at(cyl(dia / 2 - 1, h * 0.35, '#c62828', 'metal'), [0, h * 0.2, 0]), at(cyl(2.5, h * 0.6, '#ccc', 'metal'), [0, h * 0.75, 0]));
export const prop = (d, color = '#e53935') => comp(at(cyl(5, 6, color, 'plastic')), ...[0, 120, 240].map((a) => at(box(d / 2, 1.5, d * 0.09, color, 'plastic'), [Math.cos((a * Math.PI) / 180) * d / 4, 0, -Math.sin((a * Math.PI) / 180) * d / 4], [8, a, 0])));
export const lipo = (l, w, h, c = '#f57c00') => comp(at(box(l, h, w, c, 'plastic')), at(box(14, 6, 16, '#f1c40f', 'plastic'), [l / 2 + 25, 0, 0]));

// ---------- hardware (inches) ----------
export const screw = (len = 1.25) => comp(at(cyl(0.08, len, '#9aa0a6', 'metal')), at(cyl(0.17, 0.08, '#9aa0a6', 'metal'), [0, len / 2, 0]));

// ---------- advanced primitives (rendered with bevels, curves and PBR materials) ----------
export const rbox = (w, h, d, c = '#ff7a1a', m = 'paint', rad) => ({ t: 'rbox', s: [w, h, d], c, m, rad: rad ?? Math.min(w, h, d) * 0.18 });
export const lathe = (pts, c = '#ff7a1a', m = 'paint') => ({ t: 'lathe', pts, c, m });
export const hull = (L, B, D, c = '#ff7a1a', m = 'paint') => ({ t: 'hull', L, B, D, c, m });
export const wing = (span, chord, thick, c = '#f4f4f4', m = 'paint') => ({ t: 'wing', span, chord, thick, c, m });
export const tri = (pts, thick, c = '#ff7a1a', m = 'paint') => ({ t: 'tri', pts, thick, c, m });
export const gear = (r, teeth, thick, c = '#b8bec6', m = 'metal') => ({ t: 'gear', r, teeth, thick, c, m });
export const tube = (pts, r, c = '#b8bec6', m = 'metal') => ({ t: 'tube', pts, r, c, m });
export const capsule = (r, len, c = '#ff7a1a', m = 'paint', axis = 'y') => ({ t: 'capsule', r, len, c, m, axis });
export const ellipsoid = (rx, ry, rz, c = '#ff7a1a', m = 'paint') => ({ t: 'sphere', r: 1, sc: [rx, ry, rz], c, m });
