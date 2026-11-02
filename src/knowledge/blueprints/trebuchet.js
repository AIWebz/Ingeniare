import { box, cyl } from '../shapes.js';
import { fin, usd, r1 } from '../util.js';

export default {
  id: 'trebuchet', title: 'Counterweight Trebuchet', domain: 'Mechanical / Physics', unit: 'in', icon: '🏰',
  params: [
    { key: 'arm', label: 'Throwing-arm length', type: 'number', min: 18, max: 72, step: 2, default: 36, unit: 'in', from: (e) => e.length ?? (e.scale ? Math.round(36 * e.scale) : undefined) },
    { key: 'weight', label: 'Counterweight', type: 'number', min: 5, max: 100, step: 1, default: 15, unit: 'lb', from: (e) => e.weightLb },
    { key: 'projectile', label: 'Projectile', type: 'select', options: ['tennis ball (58 g)', 'water balloon (250 g)', 'golf ball (46 g)'], default: 'tennis ball (58 g)', from: (e) => e.projectile },
  ],
  generate(p) {
    const A = p.arm, short = A / 4.5, long = A - short;
    const Hp = Math.round(long * 0.72 * 4) / 4;
    const Lb = Math.max(24, Math.round(A * 1.25));
    const gap = 6, rz = gap / 2 + 0.75;
    const phi = Math.asin(Math.min(0.95, (Hp - 3.5 - 2) / long));
    const deg = phi * 180 / Math.PI;
    const pine = '#e2c38f', oak = '#c49a6c';
    const d = [-Math.cos(phi), -Math.sin(phi)];
    const armC = [d[0] * (A / 2 - short), Hp + d[1] * (A / 2 - short)];
    const cwP = [Math.cos(phi) * short, Hp + Math.sin(phi) * short - 4];
    const mProj = { 'tennis ball (58 g)': 0.058, 'water balloon (250 g)': 0.25, 'golf ball (46 g)': 0.046 }[p.projectile];
    const M = p.weight * 0.4536, g = 9.81;
    const drop = (short * (Math.sin(phi) + 1)) * 0.0254;
    const v = Math.sqrt((2 * 0.25 * M * g * drop) / mProj);
    const range = (v * v) / g;
    const brace = Math.hypot(Hp * 0.55, Hp * 0.55);
    return {
      summary: `A ${fin(A)} arm trebuchet (1:${r1(long / short)} arm ratio, pivot ${fin(Hp)} high) with a ${p.weight} lb hinged counterweight. Estimated range with a ${p.projectile}: ~${Math.round(range)} m (${Math.round(range * 3.28)} ft) assuming 25% efficiency.`,
      difficulty: 'Intermediate', time: '1 day', cost: usd(55 + p.weight * 0.6),
      tools: ['Miter saw or handsaw', 'Drill press or drill with 17/32" bit (for 1/2" axle)', 'Drill/driver', 'Bar clamps', 'Hacksaw (axle/pin)', 'Pliers', 'Safety glasses'],
      cutList: [`2x4 x 8 ft (x3): base rails 2 x ${fin(Lb)}, cross members 2 x ${fin(gap + 3)}, uprights 2 x ${fin(Hp + 2)}, braces 4 x ${fin(brace)} (45° both ends)`, `1x3 red oak x ${Math.ceil(A / 12)} ft: arm ${fin(A)}`],
      parts: [
        { id: 'rail', name: 'Base rail', spec: `2x4 x ${fin(Lb)}`, qty: 2, shape: box(Lb, 3.5, 1.5, pine) },
        { id: 'cross', name: 'Base cross member', spec: `2x4 x ${fin(gap + 3)}`, qty: 2, shape: box(3.5, 1.5, gap + 3, pine) },
        { id: 'upright', name: 'Upright', spec: `2x4 x ${fin(Hp + 2)}`, qty: 2, shape: box(3.5, Hp + 2, 1.5, pine) },
        { id: 'brace', name: 'Diagonal brace', spec: `2x4 x ${fin(brace)}, 45° miters`, qty: 4, shape: box(brace, 1.5, 1.5, pine) },
        { id: 'axle', name: 'Main axle', spec: `1/2" x ${fin(gap + 5)} zinc-plated steel rod + 2 x 1/2" washers + 2 x hitch pins`, qty: 1, shape: cyl(0.25, gap + 5, '#c0c4c8', 'metal', 'z') },
        { id: 'arm', name: 'Throwing arm', spec: `Red oak 1x3 (3/4" x 2-1/2") x ${fin(A)}, pivot hole ${fin(short)} from the weight end`, qty: 1, shape: box(A, 2.5, 0.75, oak) },
        { id: 'cw', name: 'Counterweight box', spec: `${p.weight} lb (steel shot / sand in a 5" x 5" x 5" plywood box), hung from a 3/8" eye bolt + 1/4" pin`, qty: 1, shape: box(5, 5, 5, '#6d6d6d', 'metal') },
        { id: 'chute', name: 'Sling trough', spec: `1/4" plywood, 4" x ${fin(Lb * 0.55)}`, qty: 1, shape: box(Lb * 0.55, 0.25, 4, '#dcc08a') },
        { id: 'pin', name: 'Release pin', spec: '16d common nail driven into the arm tip, head cut off, bent 15° forward', qty: 1, shape: cyl(0.08, 1.5, '#888', 'metal') },
        { id: 'sling', name: 'Sling', spec: `Two ${fin(long)} lengths of 550 paracord + 4" x 5" ripstop nylon pouch`, qty: 1, shape: null },
        { id: 'screws', name: 'Screws', spec: '#9 x 3" wood screws (frame) + #8 x 1-1/4" (trough)', qty: 30, shape: null },
      ],
      steps: [
        { title: 'Build the base', text: `Cut two 2x4 rails to ${fin(Lb)} and two cross members to ${fin(gap + 3)}. Screw the cross members across the ends of the rails (two 3" screws per joint) so the rails sit ${fin(gap)} apart inside — this is the slot the counterweight swings through.`, add: [{ part: 'rail', p: [0, 1.75, rz] }, { part: 'rail', p: [0, 1.75, -rz] }, { part: 'cross', p: [Lb / 2 - 1.75, 4.25, 0] }, { part: 'cross', p: [-(Lb / 2 - 1.75), 4.25, 0] }] },
        { title: 'Raise the uprights and drill the axle', text: `Clamp both ${fin(Hp + 2)} uprights together and drill a 17/32" hole ${fin(Hp - 3.5)} up from the bottom, square through both (drill press if you have one — misaligned holes bind the axle). Screw them to the inside of the rails at the centre.`, add: [{ part: 'upright', p: [0, 3.5 + (Hp + 2) / 2 - 0.0, rz], r: [0, 0, 0] }, { part: 'upright', p: [0, 3.5 + (Hp + 2) / 2, -rz] }] },
        { title: 'Brace the towers', text: `Cut four ${fin(brace)} braces with 45° miters on both ends. Screw one in front of and one behind each upright, from the rail to the upright. Wiggle-test: the towers must not flex at all.`, add: [1, -1].flatMap((s) => [1, -1].map((z) => ({ part: 'brace', p: [s * (Hp * 0.275 + 1.75), 3.5 + Hp * 0.275, z * rz], r: [0, 0, -s * 45] }))) },
        { title: 'Make the arm and mount it', text: `Cut the oak arm to ${fin(A)}. Drill the 17/32" pivot hole ${fin(short)} from one end (1:${r1(long / short)} ratio). Slide the 1/2" axle through upright, washer, arm, washer, upright and lock with hitch pins. The arm should swing freely with no side play over 1/16".`, add: [{ part: 'axle', p: [0, Hp, 0] }, { part: 'arm', p: [armC[0], armC[1], 0], r: [0, 0, deg] }] },
        { title: 'Hang the counterweight', text: `Fill the box with ${p.weight} lb of steel shot or sand and hang it from a 3/8" eye bolt through the short end of the arm, pinned with a 1/4" clevis pin. A hinged (free-swinging) weight throws ~20% farther than a fixed one.`, add: [{ part: 'cw', p: [cwP[0], cwP[1], 0] }] },
        { title: 'Trough, release pin and sling', text: `Screw the 1/4" plywood trough between the rails under the cocked arm. Drive a 16d nail into the arm tip, cut off the head and bend it 15° forward. Tie one paracord line permanently to the tip, the other with a loop that slips over the pin; both ${fin(long)} long, joined by the nylon pouch.`, add: [{ part: 'chute', p: [-Lb * 0.22, 3.6, 0] }, { part: 'pin', p: [armC[0] + d[0] * (A / 2), armC[1] + d[1] * (A / 2), 0] }] },
        { title: 'Tune and fire safely', text: `Load the ${p.projectile} into the pouch in the trough, pull the arm down and release with a pull cord. If it goes straight up/backwards, bend the pin more FORWARD (later release); if it slams into the ground, bend it BACK. Expect ~${Math.round(range)} m once tuned.`, warn: 'Keep everyone out of the arm swing arc and at least 3 m to the sides. Never stand in front of or behind the machine.', add: [] },
      ],
    };
  },
};
