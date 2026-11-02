// Universal procedural designer: turns ANY request into a structured build plan
// and a detailed 3D model by combining a category archetype (chosen by the
// neural network) with keyword-driven subsystems (motors, solar, lights, ...).
import { box, cyl, sphere, torus, comp, at, rbox, lathe, hull, wing, tri, gear, tube, capsule, ellipsoid } from '../../knowledge/shapes.js';

const has = (s, re) => re.test(s);

export class Builder {
  constructor() { this.parts = new Map(); this.stages = []; }
  part(id, name, spec, shape, extra = {}) { if (!this.parts.has(id)) this.parts.set(id, { id, name, spec, qty: 0, shape, ...extra }); return id; }
  stage(title, text, opts = {}) { const s = { title, text, add: [], ...opts }; this.stages.push(s); return s; }
  put(stage, id, p, r) { stage.add.push({ part: id, p, r }); this.parts.get(id).qty++; }
  item(id, name, spec, qty) { this.parts.set(id, { id, name, spec, qty, shape: null }); }
}

// ---------------------------------------------------------------- generators
const GEN = {};

GEN.furniture = (b, c) => {
  const { L, W, H, mat, len, p } = c;
  const M = mat.color, m = mat.m;
  if (has(p, /chair|stool|bench|seat|throne/)) {
    const seatH = Math.min(H * 0.5, 46), chair = has(p, /chair|throne/), leg = Math.max(3.5, L * 0.07);
    b.part('leg', 'Leg', `${mat.stock} leg blank, about ${len(leg)} square x ${len(seatH)} long`, rbox(leg, seatH, leg, M, m, 0.6));
    b.part('rail', 'Seat rail', `${mat.stock} rail, ${len(L - leg * 2)} long`, rbox(L - 2 * leg, 6, 2, M, m, 0.5));
    b.part('seat', 'Seat', `${mat.sheet}, ${len(L)} x ${len(W)}, edges rounded`, rbox(L, 3.5, W, M, m, 1.4));
    const s1 = b.stage('Cut the legs and rails', `Cut 4 legs to ${len(seatH)} and 4 rails to fit between them. Taper or round the leg bottoms slightly so they don't splinter. Keep all four legs exactly the same length.`);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => b.put(s1, 'leg', [x * (L / 2 - leg / 2), seatH / 2, z * (W / 2 - leg / 2)]));
    const s2 = b.stage('Join the base frame', `Join the rails between the legs ${len(seatH - 8)} up from the floor using ${mat.joinery}. Check every corner with a square before the glue sets.`);
    b.put(s2, 'rail', [0, seatH - 7, W / 2 - leg / 2]); b.put(s2, 'rail', [0, seatH - 7, -(W / 2 - leg / 2)]);
    const s3 = b.stage('Attach the seat', `Fasten the ${len(L)} x ${len(W)} seat from underneath so no fasteners show on top. Round over the front edge for comfort.`);
    b.put(s3, 'seat', [0, seatH + 1.75, 0]);
    if (chair) {
      b.part('back', 'Backrest', `${mat.sheet} panel, ${len(W)} wide x ${len(H - seatH)} tall, angled back ~8°`, rbox(3, H - seatH, W, M, m, 1.2));
      const s4 = b.stage('Fit the backrest', 'Fix the backrest to the rear legs at an 8-10° recline. Use two fasteners per side plus glue so it can resist leaning loads.');
      b.put(s4, 'back', [-L / 2 + 2, seatH + (H - seatH) / 2, 0], [0, 0, -8]);
    }
    return { box: { L, H, W }, covers: ['legs'] };
  }
  if (has(p, /bed|crib|futon/)) {
    const fh = 30;
    b.part('frame', 'Bed frame', `${mat.stock} side/end rails forming a ${len(L)} x ${len(W)} box`, rbox(L, fh, W, M, m, 2));
    b.part('slats', 'Slat deck', `Slats or a ${mat.sheet} deck supporting the mattress, max 7 cm gaps`, box(L - 6, 2, W - 6, M, m));
    b.part('mattress', 'Mattress', `Mattress sized ${len(L - 6)} x ${len(W - 6)} — measure inside the frame first`, rbox(L - 6, 22, W - 6, '#f7f3ee', 'fabric', 6));
    b.part('head', 'Headboard', `${mat.sheet} panel, ${len(W)} wide x ${len(H)} tall`, rbox(4, H, W + 4, M, m, 1.5));
    b.part('pillow', 'Pillow', 'Standard pillow', rbox(18, 10, W * 0.4, '#ffffff', 'fabric', 4.5));
    const s1 = b.stage('Build the rail frame', `Build a rectangular frame ${len(L)} x ${len(W)} x ${len(fh)} using ${mat.joinery}. Add a centre support rail and a leg under it to stop sagging.`);
    b.put(s1, 'frame', [0, fh / 2, 0]);
    const s2 = b.stage('Install the slat deck', 'Screw ledger strips inside the rails 2 cm below the top edge and lay the slats/deck on them. Gaps under 7 cm keep the mattress supported and ventilated.');
    b.put(s2, 'slats', [0, fh - 2, 0]);
    const s3 = b.stage('Attach the headboard', `Bolt the ${len(H)} headboard to the head end with carriage bolts so it can be removed for moving.`);
    b.put(s3, 'head', [-L / 2 - 2, H / 2, 0]);
    const s4 = b.stage('Mattress and finish', 'Sand all edges smooth, apply a low-odour water-based finish, let it cure 48 h, then add the mattress and pillows.');
    b.put(s4, 'mattress', [3, fh + 10, 0]); b.put(s4, 'pillow', [-L / 2 + 16, fh + 26, W * 0.22]); b.put(s4, 'pillow', [-L / 2 + 16, fh + 26, -W * 0.22]);
    return { box: { L, H, W } };
  }
  if (has(p, /sofa|couch|loveseat/)) {
    b.part('base', 'Base frame', `${mat.stock} frame, ${len(L)} x ${len(W)}`, rbox(L, 20, W, M, m, 2));
    b.part('cushion', 'Seat cushion', 'High-density foam cushion (≥ 1.8 lb/ft³ / 30 kg/m³) with removable cover', rbox(L / 3 - 2, 16, W - 22, c.accent, 'fabric', 5));
    b.part('backc', 'Back cushion', 'Medium-density foam or fibre-filled back cushion', rbox(16, 40, L / 3 - 2, c.accent, 'fabric', 6));
    b.part('arm', 'Armrest', 'Padded upholstered armrest box', rbox(L * 0.08, 55, W, '#d9d2ca', 'fabric', 4));
    const s1 = b.stage('Build the base frame', `Build a ${len(L)} x ${len(W)} box frame from ${mat.stock}, with cross-braces every 40 cm. Stretch webbing or fit a plywood deck across the top.`);
    b.put(s1, 'base', [0, 10, 0]);
    const s2 = b.stage('Add the arms', 'Build two arm boxes, pad them with foam and wrap in fabric, then bolt them to the base ends.');
    b.put(s2, 'arm', [L / 2 + L * 0.04, 27, 0]); b.put(s2, 'arm', [-L / 2 - L * 0.04, 27, 0]);
    const s3 = b.stage('Cushions', 'Cut foam to size with an electric carving knife, wrap in polyester batting and slip into covers.');
    for (const x of [-1, 0, 1]) { b.put(s3, 'cushion', [x * L / 3, 28, 8]); b.put(s3, 'backc', [x * L / 3, 52, -W / 2 + 10], [0, 90, -8]); }
    return { box: { L, H, W } };
  }
  if (has(p, /table|desk|counter|island|workstation/)) {
    const T = 3, leg = 6, desk = has(p, /desk|workstation/);
    b.part('top', 'Tabletop', `${mat.sheet} top, ${len(L)} x ${len(W)} x ${len(T)}`, rbox(L, T, W, M, m, 0.9));
    b.part('leg', 'Leg', `${mat.stock} leg, ${len(leg)} square x ${len(H - T)}`, rbox(leg, H - T, leg, mat.trim, m, 0.8));
    b.part('apron', 'Apron', `${mat.stock} apron rail`, rbox(L - 2 * leg - 10, 9, 2, M, m, 0.5));
    const s1 = b.stage('Prepare the legs and aprons', `Cut 4 legs to ${len(H - T)} so the finished height is ${len(H)} (standard ${desk ? 'desk' : 'table'} height is ~74-76 cm / 29-30").`);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => b.put(s1, 'leg', [x * (L / 2 - leg / 2 - 5), (H - T) / 2, z * (W / 2 - leg / 2 - 5)]));
    const s2 = b.stage('Join the apron frame', `Join apron rails between the legs with ${mat.joinery}, recessed 1 cm from the leg faces. The apron is what stops the table from racking.`);
    b.put(s2, 'apron', [0, H - T - 5, W / 2 - leg / 2 - 5]); b.put(s2, 'apron', [0, H - T - 5, -(W / 2 - leg / 2 - 5)]);
    const s3 = b.stage('Attach the top', 'Attach the top with figure-8 fasteners or slotted clips so solid wood can expand and contract seasonally. Overhang 5 cm on every side.');
    b.put(s3, 'top', [0, H - T / 2, 0]);
    if (desk) {
      b.part('drawer', 'Drawer', 'Drawer box with full-extension side-mount slides (rated ≥ 35 kg / 75 lb)', rbox(W * 0.7, 10, L * 0.35, mat.trim, m, 0.8));
      const s4 = b.stage('Add the drawer', 'Hang a shallow drawer under the top on full-extension slides, leaving knee clearance of at least 60 cm.');
      b.put(s4, 'drawer', [L * 0.25, H - T - 8, 0], [0, 90, 0]);
    }
    return { box: { L, H, W }, covers: ['legs'] };
  }
  // cabinets, shelves, dressers, wardrobes
  const T = 2, n = Math.max(2, Math.round(H / 35));
  b.part('side', 'Side panel', `${mat.sheet}, ${len(W)} deep x ${len(H)} tall`, rbox(T, H, W, M, m, 0.4));
  b.part('shelf', 'Shelf / top / bottom', `${mat.sheet}, ${len(L - 2 * T)} x ${len(W)}`, rbox(L - 2 * T, T, W, M, m, 0.4));
  b.part('back', 'Back panel', 'Thin plywood or hardboard back (≈ 6 mm / 1/4")', box(L, H, 0.6, mat.trim, m));
  const s1 = b.stage('Cut and mark the sides', `Cut two side panels to ${len(H)} x ${len(W)}. Clamp them together and mark ${n + 1} shelf positions so both sides match exactly.`);
  b.put(s1, 'side', [-L / 2 + T / 2, H / 2, 0]);
  const s2 = b.stage('Fix the shelves', `Cut ${n + 1} shelves to ${len(L - 2 * T)}. Join them to the sides with ${mat.joinery}.`);
  for (let i = 0; i <= n; i++) b.put(s2, 'shelf', [0, 5 + T / 2 + i * ((H - 5 - T) / n), 0]);
  const s3 = b.stage('Close the case', 'Attach the second side, then square the case by matching diagonals and fix the back panel — it locks the case square.');
  b.put(s3, 'side', [L / 2 - T / 2, H / 2, 0]); b.put(s3, 'back', [0, H / 2, -W / 2 - 0.3]);
  if (has(p, /dresser|drawer|chest of drawers/)) {
    b.part('drawerFront', 'Drawer', 'Drawer box on side-mount ball-bearing slides with a solid front', rbox(L - 2 * T - 1, (H - 5) / n - 2, 2, c.accent, 'paint', 0.6));
    const s4 = b.stage('Build and hang the drawers', 'Build drawer boxes 2.5 cm narrower than the opening (for slides), mount slides level, then fit fronts with a 3 mm gap all round.');
    for (let i = 0; i < n; i++) b.put(s4, 'drawerFront', [0, 5 + T + (i + 0.5) * ((H - 5 - T) / n), W / 2 + 1]);
  } else if (has(p, /cabinet|wardrobe|cupboard|closet/)) {
    b.part('door', 'Door', `${mat.sheet} door on concealed (European) hinges`, rbox((L - 1) / 2, H - 2, 2, c.accent, 'paint', 0.6));
    const s4 = b.stage('Hang the doors', 'Drill 35 mm hinge cups 22 mm from the door edge, mount two hinges per door (three if taller than 120 cm) and adjust the gaps to 2-3 mm.');
    b.put(s4, 'door', [-L / 4, H / 2, W / 2 + 1]); b.put(s4, 'door', [L / 4, H / 2, W / 2 + 1]);
  }
  return { box: { L, H, W } };
};

GEN.structure = (b, c) => {
  const { L, W, H, mat, len, p } = c;
  const M = mat.color, m = mat.m;
  if (has(p, /bridge/)) {
    b.part('abut', 'Abutment', 'Concrete footing or pressure-treated timber cribbing at each bank', rbox(40, 40, W + 20, '#b9b4ad', 'concrete', 3));
    b.part('beam', 'Main beam / truss chord', `Two parallel ${mat.stock} beams spanning ${len(L)}`, rbox(L, 8, 6, M, m, 1));
    b.part('deck', 'Deck board', `Deck boards ${len(W)} long, 6 mm gaps`, rbox(10, 3, W, mat.trim, m, 0.6));
    b.part('post', 'Truss post / railing post', `${mat.stock} upright`, rbox(5, H, 5, M, m, 0.8));
    b.part('diag', 'Truss diagonal', `${mat.stock} diagonal brace at ~45°`, rbox(Math.hypot(L / 6, H), 4, 4, M, m, 0.6));
    const s1 = b.stage('Build the abutments', 'Set a level footing on firm soil at each end. Every bridge carries its load into the ground here — never span from soft soil.');
    b.put(s1, 'abut', [-L / 2, 20, 0]); b.put(s1, 'abut', [L / 2, 20, 0]);
    const s2 = b.stage('Lay the main beams', `Lay two beams across the span (${len(L)}) and anchor them to the abutments.`);
    b.put(s2, 'beam', [0, 44, W / 2 - 3]); b.put(s2, 'beam', [0, 44, -(W / 2 - 3)]);
    const s3 = b.stage('Fix the deck boards', 'Screw deck boards across the beams with a 6 mm drainage gap between boards.');
    for (let x = -L / 2 + 6; x < L / 2; x += 11) b.put(s3, 'deck', [x, 49.5, 0]);
    const s4 = b.stage('Raise the truss railings', 'Stand posts every L/6 on both sides and add diagonals so each panel forms triangles — triangles do not deform, which is what makes a truss strong.');
    for (let i = 0; i <= 6; i++) for (const z of [1, -1]) b.put(s4, 'post', [-L / 2 + i * L / 6, 51 + H / 2, z * (W / 2 - 3)]);
    for (let i = 0; i < 6; i++) for (const z of [1, -1]) b.put(s4, 'diag', [-L / 2 + (i + 0.5) * L / 6, 51 + H / 2, z * (W / 2 - 3)], [0, 0, (i < 3 ? 1 : -1) * Math.atan(H / (L / 6)) * 57.3]);
    return { box: { L, H: H + 51, W } };
  }
  if (has(p, /fence|gate|railing/)) {
    const n = Math.max(2, Math.round(L / 240));
    b.part('post', 'Post', '4x4-class (9 x 9 cm) rot-resistant post, set 1/3 of its length in the ground', rbox(9, H + 10, 9, M, m, 1));
    b.part('rail', 'Rail', `2x4-class rail, ${len(L / n)} long`, rbox(L / n, 9, 4, M, m, 0.8));
    b.part('picket', 'Picket', 'Picket board, rounded or pointed top', rbox(9, H - 10, 2, mat.trim, m, 0.6));
    const s1 = b.stage('Set the posts', `Set ${n + 1} posts every ${len(L / n)} in concrete. Stretch a string line between end posts so all posts line up.`);
    for (let i = 0; i <= n; i++) b.put(s1, 'post', [-L / 2 + i * L / n, (H + 10) / 2, 0]);
    const s2 = b.stage('Fix the rails', 'Fix a top and bottom rail between each pair of posts, checking level as you go.');
    for (let i = 0; i < n; i++) for (const y of [20, H - 20]) b.put(s2, 'rail', [-L / 2 + (i + 0.5) * L / n, y, 6]);
    const s3 = b.stage('Attach pickets', 'Attach pickets with a spacer block for even gaps (usually 5-8 cm), two fasteners per rail.');
    for (let x = -L / 2 + 8; x < L / 2 - 5; x += 15) b.put(s3, 'picket', [x, (H - 10) / 2 + 5, 9]);
    return { box: { L, H, W: 20 } };
  }
  const tree = has(p, /treehouse|tree house|stilt|lookout|tower/), glassy = has(p, /greenhouse|conservatory/), open = has(p, /gazebo|pergola|pavilion|carport/);
  const lift = tree ? Math.max(150, H * 0.8) : 0, wallH = tree ? H * 0.6 : H * 0.62, T = 4;
  b.part('found', tree ? 'Support post' : 'Foundation', tree ? '6x6-class (14 x 14 cm) post on concrete footings, braced diagonally' : `Level gravel pad with ${len(L)} x ${len(W)} timber skids or concrete slab`, tree ? rbox(14, lift, 14, M, m, 1.5) : rbox(L + 20, 10, W + 20, '#c7c2bb', 'concrete', 2));
  const s1 = b.stage(tree ? 'Set the support posts' : 'Prepare the foundation', tree ? `Dig 4 holes 60 cm deep, pour footings and set posts so the floor sits ${len(lift)} above ground. Add 45° knee braces on two sides.` : `Level a ${len(L + 20)} x ${len(W + 20)} area, lay 10 cm of compacted gravel and set the base level in both directions — every later step depends on this.`);
  if (tree) [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => b.put(s1, 'found', [x * (L / 2 - 7), lift / 2, z * (W / 2 - 7)])); else b.put(s1, 'found', [0, 5, 0]);
  const fy = tree ? lift : 10;
  b.part('floor', 'Floor platform', `Joists at 40 cm (16") centres with ${mat.sheet} decking, ${len(L)} x ${len(W)}`, rbox(L, 8, W, mat.trim, m, 1));
  const s2 = b.stage('Frame and deck the floor', `Build the floor frame ${len(L)} x ${len(W)}, check it is square (equal diagonals) and screw down the decking.`);
  b.put(s2, 'floor', [0, fy + 4, 0]);
  const top = fy + 8;
  if (open) {
    b.part('post', 'Corner post', '4x4 or 6x6-class post with metal post base', rbox(10, wallH, 10, M, m, 1.2));
    const s3 = b.stage('Raise the posts', 'Stand a post at each corner, plumb it on two faces with a level and brace temporarily.');
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => b.put(s3, 'post', [x * (L / 2 - 5), top + wallH / 2, z * (W / 2 - 5)]));
  } else {
    const wm = glassy ? { c: '#cfe8ff', m: 'glass' } : { c: M, m };
    b.part('wallL', 'Long wall', glassy ? 'Aluminium or timber frame glazed with twin-wall polycarbonate' : `Stud wall (studs at 40 cm centres) sheathed with ${mat.sheet}, ${len(L)} x ${len(wallH)}`, rbox(L, wallH, T, wm.c, wm.m, 0.8));
    b.part('wallS', 'End wall', glassy ? 'Glazed end wall' : `End wall ${len(W - 2 * T)} x ${len(wallH)}`, rbox(T, wallH, W - 2 * T, wm.c, wm.m, 0.8));
    b.part('door', 'Door', 'Exterior door slab with hinges, latch and weather seal', rbox(4, Math.min(wallH - 8, 200), Math.min(85, W * 0.4), c.accent, 'paint', 1));
    b.part('window', 'Window', 'Window unit (double-glazed or polycarbonate) with flashing', rbox(4, wallH * 0.3, Math.min(70, L * 0.25), '#bfe3ff', 'glass', 0.8));
    const s3 = b.stage('Frame and raise the walls', `Frame each wall flat on the floor, sheath it, then tilt it up. Walls are ${len(wallH)} tall; brace each wall plumb before raising the next.`);
    b.put(s3, 'wallL', [0, top + wallH / 2, W / 2 - T / 2]); b.put(s3, 'wallL', [0, top + wallH / 2, -W / 2 + T / 2]);
    b.put(s3, 'wallS', [L / 2 - T / 2, top + wallH / 2, 0]); b.put(s3, 'wallS', [-L / 2 + T / 2, top + wallH / 2, 0]);
    const s4 = b.stage('Fit the door and windows', 'Cut the rough openings (door opening = door + 5 cm wide, + 3 cm tall), install with shims, and flash the tops so water runs outside.');
    b.put(s4, 'door', [L / 2 + 0.5, top + Math.min(wallH - 8, 200) / 2, 0]);
    b.put(s4, 'window', [0, top + wallH * 0.6, W / 2 + 0.5], [0, 90, 0]); if (L > 150) b.put(s4, 'window', [0, top + wallH * 0.6, -W / 2 - 0.5], [0, 90, 0]);
  }
  const rise = W * 0.35, slope = Math.atan(rise / (W / 2)) * 57.3, rafter = Math.hypot(W / 2, rise) + 15;
  b.part('roof', 'Roof panel', glassy ? 'Clear polycarbonate roof sheet' : 'Rafters at 60 cm centres, roof sheathing and roofing (shingles or metal sheet)', rbox(L + 30, 3, rafter, glassy ? '#d8efff' : c.roof, glassy ? 'glass' : 'paint', 0.6));
  const s5 = b.stage('Frame and cover the roof', `Cut rafters at ${slope.toFixed(0)}° (a ${Math.round(rise / (W / 2) * 12)}:12 pitch), fix them to a ridge board, then sheath and cover with roofing, overlapping each course from the bottom up.`);
  b.put(s5, 'roof', [0, top + wallH + rise / 2, W / 4], [slope, 0, 0]); b.put(s5, 'roof', [0, top + wallH + rise / 2, -W / 4], [-slope, 0, 0]);
  if (tree) {
    b.part('ladder', 'Ladder', `Ladder with rungs every 30 cm, ${len(lift)} rise`, comp(at(rbox(4, lift + 40, 4, M, m, 0.6), [0, 0, 22]), at(rbox(4, lift + 40, 4, M, m, 0.6), [0, 0, -22]), ...Array.from({ length: Math.floor(lift / 30) }, (_, i) => at(cyl(1.6, 44, M, m, 'z'), [0, -lift / 2 + 15 + i * 30, 0]))));
    const s6 = b.stage('Add the ladder and railings', 'Fix the ladder at 75° to the platform edge. Any platform higher than 75 cm needs a guard rail at least 90 cm tall.');
    b.put(s6, 'ladder', [L / 2 + 30, (lift + 40) / 2 - 5, 0], [0, 0, 15]);
  }
  return { box: { L, H: top + wallH + rise, W }, roofY: top + wallH + rise };
};

const wheelShape = (r, w, c) => comp(at(torus(r - w * 0.35, w * 0.42, '#1d1d1f', 'rubber', 'x')), at(cyl(r * 0.62, w * 0.7, c, 'chrome', 'x')), ...[0, 72, 144, 216, 288].map((a) => at(box(w * 0.5, r * 0.55, r * 0.1, '#2b2b2b', 'metal'), [0, Math.cos(a / 57.3) * r * 0.3, Math.sin(a / 57.3) * r * 0.3], [a, 0, 0])));

GEN.land_vehicle = (b, c) => {
  const { L, W, H, mat, len, p, accent } = c;
  if (has(p, /bike|bicycle|motorcycle|scooter|ebike|e-bike|tricycle/) && !has(p, /tricycle/)) {
    const r = Math.min(35, L * 0.2), wb = L - 2 * r;
    b.part('wheel', 'Wheel', `Spoked or cast wheel, ${len(2 * r)} diameter, with tyre, tube and sealed-bearing hub`, wheelShape(r, 5, '#c9ced6'));
    b.part('frame', 'Frame', `${mat.name === 'wood' ? 'Laminated hardwood or bamboo' : 'Steel or aluminium tube'} frame, ${len(wb)} wheelbase`, comp(
      at(tube([[-wb / 2, r, 0], [0, r + 8, 0], [wb / 2 - 10, r + 30, 0]], 2.2, accent, 'paint')),
      at(tube([[-wb / 2, r, 0], [-wb * 0.1, r + 40, 0], [wb / 2 - 10, r + 40, 0]], 2.2, accent, 'paint')),
      at(tube([[wb / 2 - 10, r + 45, 0], [wb / 2, r, 0]], 2, '#d0d4da', 'chrome'))));
    b.part('seat', 'Seat', 'Padded saddle on an adjustable seat post', rbox(26, 6, 14, '#222', 'rubber', 2.5));
    b.part('bars', 'Handlebar', 'Handlebar with grips, brake levers and stem', comp(at(cyl(1.4, 60, '#d0d4da', 'chrome', 'z')), at(cyl(2, 12, '#222', 'rubber', 'z'), [0, 0, 26]), at(cyl(2, 12, '#222', 'rubber', 'z'), [0, 0, -26])));
    const s1 = b.stage('Build or prepare the frame', `Build a triangulated frame with a ${len(wb)} wheelbase. Triangles keep it stiff; check the head tube and rear dropouts line up perfectly with a straight edge.`);
    b.put(s1, 'frame', [0, 0, 0]);
    const s2 = b.stage('Fit the wheels', 'Install both wheels with axle nuts or quick-releases, centre them in the frame and spin each to check it runs true.');
    b.put(s2, 'wheel', [-wb / 2, r, 0], [0, 90, 0]); b.put(s2, 'wheel', [wb / 2, r, 0], [0, 90, 0]);
    const s3 = b.stage('Seat, bars and brakes', 'Fit the seat at hip height, the handlebar square to the front wheel and adjust brakes so the levers stop 2 cm before touching the grip.');
    b.put(s3, 'seat', [-wb * 0.1, r + 46, 0]); b.put(s3, 'bars', [wb / 2 - 10, r + 52, 0]);
    return { box: { L, H: r + 55, W: 60 }, covers: ['wheels'], mount: { x: -wb / 4, y: r + 20 } };
  }
  if (has(p, /skateboard|longboard|hoverboard/)) {
    b.part('deck', 'Deck', '7-ply maple or bamboo deck, concave, with grip tape', rbox(L, 1.4, Math.max(20, W * 0.3), accent, 'paint', 0.7));
    b.part('truck', 'Truck', 'Skateboard truck matched to deck width, with bushings', comp(at(box(6, 4, 18, '#b8bec6', 'metal')), at(cyl(0.6, 22, '#ddd', 'chrome', 'z'), [0, -2, 0])));
    b.part('wheel', 'Wheel', '54-70 mm urethane wheel with ABEC-rated bearings', cyl(3.2, 4, '#f5f5f5', 'plastic', 'z'));
    const s1 = b.stage('Shape the deck', `Cut the deck outline (${len(L)} long), round the edges and apply grip tape, trimming it flush with a utility knife.`);
    b.put(s1, 'deck', [0, 11, 0]);
    const s2 = b.stage('Mount trucks and wheels', 'Bolt the trucks 15 cm from each end, press bearings into the wheels and tighten axle nuts until the wheel just stops wobbling.');
    for (const x of [L / 2 - 15, -L / 2 + 15]) { b.put(s2, 'truck', [x, 7, 0]); b.put(s2, 'wheel', [x, 4, 10]); b.put(s2, 'wheel', [x, 4, -10]); }
    return { box: { L, H: 12, W: 30 }, covers: ['wheels'] };
  }
  const r = Math.max(8, Math.min(30, H * 0.22)), ride = has(p, /kart|car|buggy|go kart|tractor|truck|pedal|golf|rickshaw/) && L > 120;
  const cl = r * 0.9;
  b.part('chassis', 'Chassis', `${mat.name === 'wood' ? 'Plywood/hardwood' : 'Welded steel square tube (25-40 mm)'} ladder frame, ${len(L)} x ${len(W * 0.7)}`, rbox(L * 0.92, 6, W * 0.7, '#3a3f47', 'metal', 1.2));
  b.part('axle', 'Axle', `Steel axle, ${len(W)} long, with bearings / pillow blocks`, cyl(1.6, W, '#c9ced6', 'chrome', 'z'));
  b.part('wheel', 'Wheel', `${len(2 * r)} wheel with tyre and bearing hub`, wheelShape(r, r * 0.6, '#d7dbe0'));
  b.part('body', 'Body shell', `${mat.name === 'wood' ? 'Thin plywood' : 'Fibreglass, aluminium sheet or 3D-printed'} body panels, painted`, rbox(L * 0.85, H * 0.45, W * 0.86, accent, 'paint', Math.min(H * 0.18, 18)));
  const s1 = b.stage('Build the chassis', `Build a rectangular frame ${len(L * 0.92)} x ${len(W * 0.7)} with cross-members every 40 cm. Measure diagonals — equal within 3 mm means square.`);
  b.put(s1, 'chassis', [0, cl + 3, 0]);
  const s2 = b.stage('Mount axles and wheels', `Mount front and rear axles ${len(L * 0.7)} apart (the wheelbase). Use bearings at each wheel and lock-nuts or cotter pins on the axle ends.`);
  for (const x of [L * 0.35, -L * 0.35]) { b.put(s2, 'axle', [x, r, 0]); b.put(s2, 'wheel', [x, r, W / 2], [0, 90, 0]); b.put(s2, 'wheel', [x, r, -W / 2], [0, 90, 0]); }
  if (ride) {
    b.part('seat', 'Seat', 'Bucket seat bolted through the chassis with backing plates', comp(at(rbox(40, 8, 40, '#222', 'rubber', 3)), at(rbox(8, 45, 40, '#222', 'rubber', 3), [-18, 22, 0], [0, 0, 10])));
    b.part('steer', 'Steering', 'Steering wheel, column and tie-rods to the front spindles (Ackermann geometry)', comp(at(torus(16, 1.6, '#1d1d1f', 'rubber', 'x')), at(cyl(1.2, 50, '#c9ced6', 'chrome', 'x'), [20, -12, 0], [0, 0, 60])));
    const s3 = b.stage('Seat and steering', 'Mount the seat low and centred for stability. Link the steering column to both front spindles with tie-rods so the inside wheel turns more than the outside wheel (Ackermann).');
    b.put(s3, 'seat', [-L * 0.1, cl + 10, 0]); b.put(s3, 'steer', [L * 0.12, cl + 40, 0], [0, 0, 25]);
  } else {
    const s3 = b.stage('Fit the body shell', 'Shape the body panels, sand, prime and paint 2-3 thin coats, then fasten the shell to the chassis with rubber-isolated mounts.');
    b.put(s3, 'body', [0, cl + 6 + H * 0.225, 0]);
  }
  return { box: { L, H: cl + H * 0.5, W }, covers: ['wheels'], mount: { x: -L * 0.3, y: cl + 8 } };
};

GEN.watercraft = (b, c) => {
  const { L, W, H, len, p, accent, mat } = c;
  if (has(p, /submarine|underwater/)) {
    const R = W / 2;
    b.part('hull', 'Pressure hull', 'Sealed tube hull (PVC/acrylic for models, steel for real vessels) with O-ring end caps', capsule(R, L - 2 * R, '#f2c230', 'paint', 'x'));
    b.part('sail', 'Conning tower', 'Streamlined conning tower / sail', rbox(L * 0.18, R * 0.9, R * 0.5, '#e0aa1c', 'paint', 4));
    b.part('fin', 'Dive plane', 'Control fin / dive plane', tri([[0, 0], [R * 1.4, 0], [R * 0.3, R * 0.9]], 1.2, '#2b2f36', 'metal'));
    b.part('prop', 'Propeller', 'Three-blade propeller on a sealed shaft', comp(at(cyl(R * 0.2, 4, '#c9ced6', 'chrome', 'x')), ...[0, 120, 240].map((a) => at(box(1, R * 0.5, R * 0.2, '#c9a24a', 'metal'), [0, Math.cos(a / 57.3) * R * 0.3, Math.sin(a / 57.3) * R * 0.3], [a, 0, 20]))));
    const s1 = b.stage('Build and pressure-test the hull', 'Assemble the hull and end caps with greased O-rings. Pressure/vacuum-test it before installing any electronics — leaks are the #1 failure.');
    b.put(s1, 'hull', [0, R + 5, 0]);
    const s2 = b.stage('Tower and control fins', 'Fix the conning tower centred on top and fit the stern fins in a cross pattern for stable diving.');
    b.put(s2, 'sail', [L * 0.1, 2 * R + 5 + R * 0.4, 0]);
    for (const a of [0, 90, 180, 270]) b.put(s2, 'fin', [-L / 2 + R * 0.6, R + 5, 0], [a, 0, 0]);
    const s3 = b.stage('Propulsion', 'Install the propeller on a sealed shaft (or magnetic coupling) and balance the craft with ballast until it floats level, just barely positive.');
    b.put(s3, 'prop', [-L / 2 - 3, R + 5, 0]);
    return { box: { L, H: 2 * R + 10, W }, covers: ['propeller'], mount: { x: 0, y: R * 2 } };
  }
  const D = H * 0.6;
  b.part('hull', 'Hull', `${mat.name === 'wood' ? 'Stitch-and-glue plywood' : 'Fibreglass or roto-moulded plastic'} hull, ${len(L)} long x ${len(W)} beam`, hull(L, W, D, accent, 'paint'));
  b.part('deck', 'Deck', 'Marine plywood or composite deck, sealed and non-slip', rbox(L * 0.62, 1.2, W * 0.82, '#e9d6b5', 'wood', 0.5));
  const s1 = b.stage('Build the hull', `Cut the hull panels, stitch them together and glass the seams with epoxy and fibreglass tape. Beam ${len(W)}, depth ${len(D)}. Keep the hull symmetrical — check from the bow with a string line.`);
  b.put(s1, 'hull', [0, D, 0]);
  const s2 = b.stage('Deck and seal', 'Fit bulkheads for buoyancy chambers (fill with closed-cell foam), install the deck and seal everything with 3 coats of marine varnish or paint.');
  b.put(s2, 'deck', [-L * 0.05, D, 0]);
  if (has(p, /sail|catamaran|yacht|dinghy/)) {
    b.part('mast', 'Mast', `Aluminium or spruce mast, ${len(L * 1.1)} tall, with stays`, cyl(2, L * 1.1, '#d0d4da', 'chrome'));
    b.part('sail', 'Sail', 'Dacron sail cut to the rig, with battens and reef points', tri([[0, 0], [L * 0.45, 0], [0, L * 0.95]], 0.3, '#fbfbfb', 'fabric'));
    const s3 = b.stage('Step the mast and rig the sail', 'Step the mast 1/3 back from the bow, tension shrouds evenly, then hoist the sail and lead the sheet to a cleat within reach.');
    b.put(s3, 'mast', [L * 0.15, D + L * 0.55, 0]); b.put(s3, 'sail', [L * 0.15 - L * 0.45 - 2, D + 10, 0]);
  } else if (has(p, /kayak|canoe|paddle|row/)) {
    b.part('paddle', 'Paddle', 'Lightweight paddle (length ≈ your height + 50 cm for kayaks)', comp(at(cyl(1.5, 200, '#3a3f47', 'metal', 'x')), at(rbox(40, 1, 18, accent, 'paint', 0.4), [100, 0, 0]), at(rbox(40, 1, 18, accent, 'paint', 0.4), [-100, 0, 0])));
    b.part('seat', 'Seat', 'Padded seat with backrest', rbox(40, 6, 35, '#222', 'rubber', 2));
    const s3 = b.stage('Seat and paddle', 'Fit the seat slightly aft of centre so the bow rides up a little. Add grab handles at bow and stern.');
    b.put(s3, 'seat', [-L * 0.05, D + 3, 0]); b.put(s3, 'paddle', [0, D + 25, 0], [0, 90, 10]);
  } else {
    b.part('cabin', 'Cabin / console', 'Cabin or steering console with windscreen', rbox(L * 0.28, H * 0.55, W * 0.6, '#f7f7f7', 'paint', 4));
    const s3 = b.stage('Build the cabin', 'Build the cabin or console with a windscreen; keep its weight low and centred to preserve stability.');
    b.put(s3, 'cabin', [L * 0.05, D + H * 0.28, 0]);
  }
  return { box: { L, H: D + H * 0.5, W }, mount: { x: -L / 2, y: D } };
};

GEN.aircraft = (b, c) => {
  const { L, W, H, len, p, accent } = c;
  if (has(p, /drone|quad|multirotor|hexacopter|octocopter/)) {
    const R = L / 2, arms = has(p, /hex/) ? 6 : has(p, /octo/) ? 8 : 4;
    b.part('body', 'Central body', 'Carbon-fibre or 3D-printed central plate holding the flight controller', rbox(R * 0.6, R * 0.18, R * 0.6, '#222', 'carbon', R * 0.05));
    b.part('arm', 'Arm', `Carbon-fibre arm, ${len(R)} long`, rbox(R, R * 0.05, R * 0.1, '#222', 'carbon', R * 0.02));
    b.part('motor', 'Brushless motor', 'Outrunner brushless motor sized so total thrust ≥ 2x the all-up weight', comp(at(cyl(R * 0.09, R * 0.1, '#2b2b2b', 'metal')), at(cyl(R * 0.085, R * 0.04, accent, 'metal'), [0, R * 0.04, 0])));
    b.part('prop', 'Propeller', 'Matched CW/CCW propeller pair', comp(at(cyl(R * 0.36, 0.3, '#ffffff', 'glass')), at(box(R * 0.7, 0.6, R * 0.07, accent, 'paint'), [0, 0, 0], [0, 30, 0])));
    const s1 = b.stage('Assemble the frame', `Bolt ${arms} arms to the central plate with thread-locker. Arm tips are ${len(R)} from the centre.`);
    b.put(s1, 'body', [0, R * 0.12, 0]);
    for (let i = 0; i < arms; i++) { const a = (i + 0.5) * 360 / arms; b.put(s1, 'arm', [Math.cos(a / 57.3) * R / 2, R * 0.08, -Math.sin(a / 57.3) * R / 2], [0, a, 0]); }
    const s2 = b.stage('Motors and propellers', 'Mount a motor at each arm tip (screws must not touch the windings). Install propellers LAST, after all bench testing, alternating CW/CCW.');
    for (let i = 0; i < arms; i++) { const a = (i + 0.5) * 360 / arms; b.put(s2, 'motor', [Math.cos(a / 57.3) * R, R * 0.15, -Math.sin(a / 57.3) * R]); b.put(s2, 'prop', [Math.cos(a / 57.3) * R, R * 0.22, -Math.sin(a / 57.3) * R]); }
    return { box: { L, H: R * 0.3, W: L }, covers: ['propeller', 'motor'], mount: { x: 0, y: R * 0.25 } };
  }
  if (has(p, /rocket|missile|spaceship|spacecraft|lander/)) {
    const R = Math.max(2, W / 2);
    b.part('body', 'Body tube', `Cardboard/fibreglass body tube (models) or aluminium airframe, ${len(L * 0.75)} long`, cyl(R, L * 0.75, '#f5f5f5', 'paint'));
    b.part('nose', 'Nose cone', 'Ogive or conical nose cone', lathe([[0.01, 0], [R, 0], [R * 0.95, L * 0.06], [R * 0.7, L * 0.13], [0.01, L * 0.2]], accent, 'paint'));
    b.part('fin', 'Fin', 'Plywood/fibreglass fin, sanded to an airfoil, glued with fillets', tri([[0, 0], [L * 0.16, 0], [L * 0.04, R * 2.4]], Math.max(0.3, R * 0.08), accent, 'paint'));
    b.part('nozzle', 'Motor mount / nozzle', 'Motor tube with retainer (use only certified commercial motors)', cyl(R * 0.6, L * 0.05, '#3a3f47', 'metal', 'y', R * 0.4));
    const s1 = b.stage('Body tube and motor mount', 'Glue the motor mount and centring rings inside the base of the body tube, perfectly centred.');
    b.put(s1, 'body', [0, L * 0.05 + L * 0.375, 0]); b.put(s1, 'nozzle', [0, L * 0.025, 0]);
    const s2 = b.stage('Attach the fins', 'Mark fin lines with a guide, glue fins exactly 120° or 90° apart and add glue fillets. Misaligned fins make the rocket spiral.');
    for (const a of [0, 120, 240]) b.put(s2, 'fin', [Math.cos(a / 57.3) * R, L * 0.05, -Math.sin(a / 57.3) * R], [0, a, 0]);
    const s3 = b.stage('Nose cone and recovery', 'Attach a parachute or streamer to the nose cone with a shock cord. Check the centre of gravity is at least one body diameter ahead of the centre of pressure.', { warn: 'Follow your national rocketry safety code and launch only at approved sites.' });
    b.put(s3, 'nose', [0, L * 0.8, 0]);
    return { box: { L: W, H: L, W }, covers: ['propeller'] };
  }
  if (has(p, /satellite|space station|probe/)) {
    const s = Math.max(L, H);
    b.part('bus', 'Satellite bus', 'Structural bus housing power, computer and radio (CubeSat-style aluminium frame for small builds)', rbox(s * 0.3, s * 0.3, s * 0.3, '#d9a520', 'metal', s * 0.02));
    b.part('array', 'Solar array', 'Deployable solar array wing', comp(at(box(s * 0.7, 0.6, s * 0.28, '#16264f', 'solar')), at(box(s * 0.72, 0.4, s * 0.3, '#c9ced6', 'metal'), [0, -0.4, 0])));
    b.part('dish', 'Antenna dish', 'High-gain parabolic antenna', lathe([[0.01, 0], [s * 0.06, s * 0.01], [s * 0.14, s * 0.05]], '#f5f5f5', 'paint'));
    const s1 = b.stage('Build the bus', 'Assemble the bus frame and mount the flight computer, battery and radio inside, balanced around the centre.');
    b.put(s1, 'bus', [0, s * 0.4, 0]);
    const s2 = b.stage('Solar wings and antenna', 'Hinge a solar wing on each side with spring-loaded deploy hinges, and mount the antenna dish facing Earth (the +x face here).');
    b.put(s2, 'array', [0, s * 0.4, s * 0.52]); b.put(s2, 'array', [0, s * 0.4, -s * 0.52]); b.put(s2, 'dish', [s * 0.15, s * 0.4, 0], [0, 0, -90]);
    return { box: { L: s * 0.4, H: s * 0.6, W: s * 1.4 }, covers: ['solar', 'battery'] };
  }
  if (has(p, /balloon|blimp|airship|zeppelin/)) {
    b.part('envelope', 'Envelope', 'Gas envelope (ripstop nylon/mylar, heat-sealed seams)', ellipsoid(L / 2, H * 0.32, W / 2, accent, 'fabric'));
    b.part('gondola', 'Gondola', 'Lightweight gondola carrying controls and payload', rbox(L * 0.2, H * 0.12, W * 0.3, '#f7f7f7', 'paint', 3));
    const s1 = b.stage('Make the envelope', 'Cut gores from the pattern, seal the seams and leak-test with low pressure before filling.');
    b.put(s1, 'envelope', [0, H * 0.62, 0]);
    const s2 = b.stage('Hang the gondola', 'Hang the gondola from load patches with four lines so it stays level. Trim with ballast until neutrally buoyant.');
    b.put(s2, 'gondola', [0, H * 0.14, 0]);
    return { box: { L, H, W }, mount: { x: 0, y: H * 0.2 } };
  }
  if (has(p, /kite/)) {
    b.part('sail', 'Sail', 'Ripstop nylon sail with reinforced corners', tri([[-W / 2, 0], [0, L * 0.3], [W / 2, 0]], 0.2, accent, 'fabric'));
    b.part('sail2', 'Lower sail', 'Lower sail section', tri([[-W / 2, 0], [W / 2, 0], [0, -L * 0.7]], 0.2, '#ffffff', 'fabric'));
    b.part('spar', 'Spar', 'Carbon or wooden dowel spar', cyl(0.4, L, '#3a3f47', 'carbon'));
    const s1 = b.stage('Build the spars', 'Cross the spine and spreader spars at 1/3 from the top and lash them tightly.');
    b.put(s1, 'spar', [0, L * 0.5, 0]); b.put(s1, 'spar', [0, L * 0.7, 0], [0, 0, 90]);
    const s2 = b.stage('Attach the sail', 'Hem the sail around the spars and attach the bridle at 1/3 from the top; adjust it so the kite flies at ~45°.');
    b.put(s2, 'sail', [0, L * 0.7, 0.3]); b.put(s2, 'sail2', [0, L * 0.7, 0.3]);
    return { box: { L: W, H: L, W: 2 } };
  }
  const fl = L, fr = Math.max(3, W * 0.06), span = W;
  b.part('fuse', 'Fuselage', `${c.mat.name === 'wood' ? 'Balsa/plywood' : 'Foam-board or composite'} fuselage, ${len(fl)} long`, lathe([[0.01, 0], [fr * 0.6, fl * 0.04], [fr, fl * 0.15], [fr, fl * 0.55], [fr * 0.4, fl * 0.95], [0.01, fl]], '#f5f5f5', 'paint'));
  b.part('wing', 'Main wing', `Wing panel (${len(span)} span, ${len(span * 0.16)} chord) with a cambered airfoil and spar`, wing(span, span * 0.16, span * 0.02, '#f5f5f5', 'paint'));
  b.part('stab', 'Horizontal stabiliser', 'Tailplane, about 1/3 of the wing span', wing(span * 0.33, span * 0.1, span * 0.012, accent, 'paint'));
  b.part('fin', 'Vertical fin', 'Fin and rudder', tri([[0, 0], [span * 0.12, 0], [span * 0.02, span * 0.12]], 0.8, accent, 'paint'));
  const s1 = b.stage('Build the fuselage', `Build the fuselage (${len(fl)}), keeping it straight and light. Mark the wing position so the wing's leading edge sits ~25% back from the nose.`);
  b.put(s1, 'fuse', [fl / 2 - fl * 0.05, fr + 8, 0], [0, 0, -90]);
  const s2 = b.stage('Make and fit the wing', `Shape the wing with a curved (cambered) top surface and a spar along 25-30% of the chord. Give it 2-5° of dihedral for stability. Span ${len(span)}.`);
  b.put(s2, 'wing', [fl * 0.2, fr * 1.6 + 8, 0], [3, 0, 0]);
  const s3 = b.stage('Tail surfaces', 'Fix the tailplane level with the wing and the fin exactly vertical. Hinge the elevator and rudder with tape or pin hinges.');
  b.put(s3, 'stab', [-fl * 0.4, fr + 8, 0]); b.put(s3, 'fin', [-fl * 0.5, fr + 9, 0]);
  const s4 = b.stage('Balance the plane', 'Add weight in the nose until the plane balances at 25-33% of the wing chord from the leading edge. A tail-heavy plane is uncontrollable.');
  if (!has(p, /glider|paper|hang/)) {
    b.part('prop', 'Propeller', 'Propeller sized to the motor (check the motor maker\'s chart)', comp(at(sphere(fr * 0.5, '#d0d4da', 'chrome')), at(box(1, span * 0.18, 2, '#2b2b2b', 'plastic'))));
    b.put(s4, 'prop', [fl * 0.97, fr + 8, 0]);
  }
  return { box: { L: fl, H: fr * 2 + 10, W: span }, covers: ['wings', 'propeller'], mount: { x: fl * 0.3, y: fr + 8 } };
};

GEN.robot = (b, c) => {
  const { L, W, H, len, p, accent } = c;
  const eye = comp(at(sphere(1, '#111', 'plastic')), at(sphere(0.55, '#4fd1ff', 'emissive'), [0, 0, 0.6]));
  if (has(p, /arm|gripper|hand|manipulator/)) {
    const s = H;
    b.part('base', 'Base & turntable', 'Heavy base with a slewing bearing and a high-torque servo or stepper', comp(at(cyl(s * 0.18, s * 0.06, '#2b2f36', 'metal')), at(cyl(s * 0.13, s * 0.05, accent, 'paint'), [0, s * 0.05, 0])));
    b.part('link1', 'Lower arm link', `Aluminium or 3D-printed link, ${len(s * 0.4)} long`, rbox(s * 0.07, s * 0.4, s * 0.07, accent, 'paint', s * 0.02));
    b.part('link2', 'Upper arm link', `Link ${len(s * 0.32)} long`, rbox(s * 0.06, s * 0.32, s * 0.06, '#f5f5f5', 'paint', s * 0.02));
    b.part('joint', 'Joint actuator', 'Servo or geared stepper sized for the torque at full reach (torque = load x arm length)', capsule(s * 0.045, s * 0.06, '#2b2f36', 'metal', 'z'));
    b.part('grip', 'Gripper', 'Two-finger parallel gripper driven by a micro servo', comp(at(rbox(s * 0.08, s * 0.03, s * 0.06, '#2b2f36', 'metal', 0.5)), at(rbox(s * 0.015, s * 0.08, s * 0.02, '#c9ced6', 'metal', 0.3), [s * 0.025, -s * 0.05, 0]), at(rbox(s * 0.015, s * 0.08, s * 0.02, '#c9ced6', 'metal', 0.3), [-s * 0.025, -s * 0.05, 0])));
    const s1 = b.stage('Build the base and turntable', 'Bolt the turntable bearing and base actuator to a heavy base. The base must outweigh the arm at full stretch or it will tip.');
    b.put(s1, 'base', [0, s * 0.03, 0]);
    const s2 = b.stage('Shoulder and lower arm', 'Mount the shoulder actuator on the turntable and attach the lower link. Use the strongest actuator here — it carries the most torque.');
    b.put(s2, 'joint', [0, s * 0.12, 0]); b.put(s2, 'link1', [s * 0.1, s * 0.3, 0], [0, 0, -30]);
    const s3 = b.stage('Elbow and upper arm', 'Fit the elbow actuator and the upper link. Route cables through the joints with service loops so they do not snag.');
    b.put(s3, 'joint', [s * 0.2, s * 0.47, 0]); b.put(s3, 'link2', [s * 0.33, s * 0.5, 0], [0, 0, -100]);
    const s4 = b.stage('Wrist and gripper', 'Attach the gripper to the wrist and calibrate each joint\'s zero position in software before moving anything at full speed.');
    b.put(s4, 'grip', [s * 0.48, s * 0.45, 0], [0, 0, 90]);
    return { box: { L: s * 0.6, H: s * 0.6, W: s * 0.36 }, covers: ['controller', 'arm'] };
  }
  if (has(p, /humanoid|android|mech|biped|companion|animatronic|exoskeleton/)) {
    b.part('torso', 'Torso', 'Torso shell housing battery and controller', rbox(H * 0.18, H * 0.3, H * 0.26, '#f5f5f5', 'paint', H * 0.04));
    b.part('head', 'Head', 'Head shell with camera/sensor eyes', comp(at(rbox(H * 0.14, H * 0.12, H * 0.15, '#f5f5f5', 'paint', H * 0.04)), at(rbox(H * 0.02, H * 0.05, H * 0.11, '#111', 'glass', H * 0.01), [H * 0.07, 0, 0]), at(eye, [H * 0.075, 0, H * 0.03], [0, 90, 0]), at(eye, [H * 0.075, 0, -H * 0.03], [0, 90, 0])));
    b.part('limb', 'Limb segment', 'Limb segment with servo joint (metal-gear servos recommended)', capsule(H * 0.035, H * 0.16, accent, 'paint'));
    b.part('foot', 'Foot', 'Wide foot plate for balance', rbox(H * 0.12, H * 0.025, H * 0.07, '#2b2f36', 'metal', 1));
    const s1 = b.stage('Legs and feet', 'Assemble each leg (hip, knee and ankle joints). Wide feet and a low centre of mass make balancing far easier.');
    for (const z of [1, -1]) { b.put(s1, 'foot', [H * 0.02, H * 0.012, z * H * 0.07]); b.put(s1, 'limb', [0, H * 0.14, z * H * 0.07]); b.put(s1, 'limb', [0, H * 0.36, z * H * 0.07]); }
    const s2 = b.stage('Torso', 'Mount the torso on the hips; put the battery as low in the torso as possible.');
    b.put(s2, 'torso', [0, H * 0.62, 0]);
    const s3 = b.stage('Arms and head', 'Fit shoulder and elbow joints on each side, then the head on a pan/tilt neck. Keep the arms light — every gram up high makes balance harder.');
    for (const z of [1, -1]) { b.put(s3, 'limb', [0, H * 0.64, z * H * 0.17]); b.put(s3, 'limb', [H * 0.04, H * 0.45, z * H * 0.17], [0, 0, 20]); }
    b.put(s3, 'head', [0, H * 0.86, 0]);
    return { box: { L: H * 0.25, H, W: H * 0.4 }, covers: ['controller'], mount: { x: -H * 0.1, y: H * 0.62 } };
  }
  if (has(p, /dog|quadruped|spider|hexapod|insect/)) {
    const legs = has(p, /spider|hexapod|insect/) ? 6 : 4;
    b.part('body', 'Body', 'Body shell holding battery, controller and servo driver', rbox(L, H * 0.25, W * 0.6, accent, 'paint', H * 0.08));
    b.part('leg', 'Leg', 'Two- or three-servo leg (hip + knee), metal-gear servos', comp(at(capsule(H * 0.05, H * 0.25, '#f5f5f5', 'paint'), [0, H * 0.12, 0], [0, 0, 25]), at(capsule(H * 0.04, H * 0.3, '#2b2f36', 'metal'), [H * 0.08, -H * 0.12, 0], [0, 0, -15])));
    b.part('head', 'Sensor head', 'Head with distance sensor / camera', comp(at(rbox(H * 0.25, H * 0.2, W * 0.4, '#f5f5f5', 'paint', H * 0.05)), at(eye, [H * 0.13, 0, W * 0.08], [0, 90, 0]), at(eye, [H * 0.13, 0, -W * 0.08], [0, 90, 0])));
    const s1 = b.stage('Body chassis', 'Build the body and mount the battery at the centre so weight is shared equally by all legs.');
    b.put(s1, 'body', [0, H * 0.7, 0]);
    const s2 = b.stage(`Attach ${legs} legs`, 'Centre every servo (90°) before attaching horns, so all legs start from the same pose.');
    for (let i = 0; i < legs / 2; i++) for (const z of [1, -1]) b.put(s2, 'leg', [-L / 2 + (i + 0.5) * L / (legs / 2), H * 0.45, z * W * 0.35], [z > 0 ? 0 : 180, 0, 0]);
    const s3 = b.stage('Head and gait tuning', 'Fit the head, then program a gait: tripod gait for 6 legs, trot/creep gait for 4 legs. Start slow.');
    b.put(s3, 'head', [L / 2 + H * 0.1, H * 0.82, 0]);
    return { box: { L, H, W }, covers: ['controller', 'sensor'] };
  }
  // rover / wheeled robot
  const r = H * 0.22;
  b.part('chassis', 'Chassis', 'Aluminium or 3D-printed chassis plate with mounting grid', rbox(L, H * 0.18, W * 0.7, '#2b2f36', 'metal', H * 0.04));
  b.part('wheel', 'Drive wheel', `${len(2 * r)} rubber wheel on a geared DC motor`, wheelShape(r, r * 0.7, accent));
  b.part('shell', 'Body shell', 'Protective top shell', rbox(L * 0.8, H * 0.28, W * 0.6, '#f5f5f5', 'paint', H * 0.08));
  b.part('mast', 'Sensor mast', 'Mast with camera/distance sensor head', comp(at(cyl(H * 0.03, H * 0.35, '#2b2f36', 'metal')), at(rbox(H * 0.14, H * 0.12, H * 0.22, accent, 'paint', H * 0.03), [0, H * 0.22, 0]), at(eye, [H * 0.08, H * 0.22, H * 0.05], [0, 90, 0]), at(eye, [H * 0.08, H * 0.22, -H * 0.05], [0, 90, 0])));
  const s1 = b.stage('Chassis and drive', 'Mount the geared motors under the chassis with wheels on each side. Six wheels with a rocker-bogie suspension handle rough ground; four is fine indoors.');
  b.put(s1, 'chassis', [0, r + H * 0.05, 0]);
  for (const x of [-L * 0.35, 0, L * 0.35]) for (const z of [1, -1]) b.put(s1, 'wheel', [x, r, z * W * 0.45], [0, 90, 0]);
  const s2 = b.stage('Body and sensor mast', 'Fit the shell and the sensor mast at the front so the camera/sensor sees over the bumper.');
  b.put(s2, 'shell', [0, r + H * 0.3, 0]); b.put(s2, 'mast', [L * 0.3, r + H * 0.6, 0]);
  return { box: { L, H: r + H * 0.8, W }, covers: ['wheels', 'motor', 'sensor', 'camera'], mount: { x: -L * 0.2, y: r + H * 0.45 } };
};

GEN.electronics = (b, c) => {
  const { L, W, H, len, p, accent } = c;
  const clock = has(p, /clock|watch/);
  b.part('case', 'Enclosure', `Enclosure ${len(L)} x ${len(H)} x ${len(W)} — 3D-printed, wood or ABS project box with ventilation`, rbox(L, H, W, has(p, /retro|wood|radio|jukebox/) ? '#9a6a3f' : accent, has(p, /retro|wood|radio|jukebox/) ? 'wood' : 'paint', Math.min(L, H, W) * 0.15));
  b.part('pcb', 'Circuit board', 'Main circuit: a microcontroller development board (or custom PCB) with the needed modules', comp(at(box(L * 0.6, 0.3, W * 0.6, '#1d6b3a', 'pcb')), at(box(L * 0.12, 0.6, W * 0.12, '#111', 'plastic'), [0, 0.4, 0]), at(box(L * 0.06, 1.2, W * 0.05, '#c9ced6', 'metal'), [L * 0.2, 0.7, W * 0.15])));
  const s1 = b.stage('Design the circuit', 'Draw a block diagram (power → controller → inputs/outputs), then breadboard it and test every function before soldering anything permanent.');
  b.put(s1, 'pcb', [0, H * 0.3, 0]);
  const s2 = b.stage('Make the enclosure', `Make the ${len(L)} x ${len(H)} x ${len(W)} enclosure. Cut openings for controls, ports and ventilation before assembly.`);
  b.put(s2, 'case', [0, H / 2, 0]);
  const s3 = b.stage('Front panel controls', 'Mount the display, knobs and buttons on the front panel and wire them to the board with labelled connectors.');
  if (clock) {
    b.part('face', 'Clock face', 'Printed or engraved dial with hour markers', comp(at(cyl(Math.min(L, H) * 0.42, 0.6, '#ffffff', 'paint', 'z')), at(box(0.8, Math.min(L, H) * 0.3, 0.4, '#1f1a17', 'metal'), [0, Math.min(L, H) * 0.12, 0.6]), at(box(0.6, Math.min(L, H) * 0.2, 0.4, accent, 'metal'), [Math.min(L, H) * 0.08, 0, 0.8], [0, 0, -60])));
    b.put(s3, 'face', [0, H / 2, W / 2 + 0.4]);
  } else {
    b.part('screen', 'Display', 'Display module (OLED/LCD/e-ink) sized to the panel', rbox(L * 0.45, H * 0.4, 0.6, '#0e2a47', 'screen', 0.3));
    b.part('knob', 'Knob / button', 'Rotary encoder or tactile button with cap', cyl(Math.min(L, H) * 0.06, 2, '#2b2b2b', 'metal', 'z'));
    b.put(s3, 'screen', [-L * 0.18, H * 0.55, W / 2 + 0.3]);
    for (let i = 0; i < 3; i++) b.put(s3, 'knob', [L * 0.22 + (i - 1) * L * 0.1, H * 0.35, W / 2 + 1]);
  }
  return { box: { L, H, W }, covers: ['controller', 'screen'], mount: { x: 0, y: H * 0.25 }, inside: true };
};

GEN.lighting = (b, c) => {
  const { L, W, H, len, p, accent, mat } = c;
  if (has(p, /sign|neon|light box|marquee/)) {
    b.part('panel', 'Backing panel', 'Acrylic or plywood backing panel', rbox(L, H, 2, '#1f1a17', 'paint', 1));
    b.part('tube', 'Light tube', 'LED neon-flex strip (12 V) bent into letters/shapes', tube([[-L * 0.4, -H * 0.2, 0], [-L * 0.25, H * 0.25, 0], [-L * 0.05, -H * 0.2, 0], [L * 0.15, H * 0.25, 0], [L * 0.38, -H * 0.15, 0]], Math.max(0.6, H * 0.03), accent, 'emissive'));
    const s1 = b.stage('Cut the backing panel', `Cut the ${len(L)} x ${len(H)} panel and transfer your design onto it at full size.`);
    b.put(s1, 'panel', [0, H / 2, 0]);
    const s2 = b.stage('Bend and fix the light tube', 'Bend the LED neon-flex along the design, fixing it with clear clips every 5 cm. Drill holes at each end to pass the wires behind.');
    b.put(s2, 'tube', [0, H / 2, 1.6]);
    return { box: { L, H, W: 6 }, covers: ['lights'] };
  }
  const baseR = Math.max(L, W) * 0.3;
  b.part('base', 'Base', `Weighted ${mat.name} base (heavy enough to stop tipping)`, lathe([[0.01, 0], [baseR, 0], [baseR, H * 0.03], [baseR * 0.6, H * 0.06], [0.01, H * 0.06]], mat.color, mat.m));
  b.part('stem', 'Stem', 'Metal tube stem (wire runs inside)', cyl(Math.max(0.8, H * 0.012), H * 0.7, '#c9ced6', 'chrome'));
  b.part('shade', 'Shade', 'Shade — metal, fabric or 3D-printed; leave ventilation at the top', lathe([[Math.max(L, W) * 0.45, 0], [Math.max(L, W) * 0.2, H * 0.22], [Math.max(L, W) * 0.08, H * 0.24]], accent, 'paint'));
  b.part('bulb', 'Light source', 'Warm-white LED bulb or LED module (≤ 10 W keeps it cool)', sphere(Math.max(L, W) * 0.09, '#fff4d6', 'emissive'));
  const s1 = b.stage('Make the base', 'Make the weighted base and drill a centre hole for the stem plus a side channel for the cord.');
  b.put(s1, 'base', [0, 0, 0]);
  const s2 = b.stage('Fit the stem and wiring', 'Thread the cord through the stem, fit an inline switch and a strain-relief knot or grommet where the cord enters.', { warn: 'For mains-voltage lamps use a certified lamp-holder kit and an earth connection on metal parts, or stay low-voltage (12 V LED) to be safe.' });
  b.put(s2, 'stem', [0, H * 0.06 + H * 0.35, 0]);
  const s3 = b.stage('Shade and light source', 'Fit the lamp holder and LED, then mount the shade so the light source is hidden from normal eye level.');
  b.put(s3, 'bulb', [0, H * 0.74, 0]); b.put(s3, 'shade', [0, H * 0.7, 0]);
  return { box: { L, H, W }, covers: ['lights'] };
};

GEN.machine = (b, c) => {
  const { L, W, H, len, p, accent, mat } = c;
  if (has(p, /wind ?turbine|windmill|turbine/)) {
    b.part('tower', 'Tower', `Guyed steel pole or lattice tower, ${len(H)} tall`, cyl(H * 0.02, H, '#e9e9e9', 'paint', 'y', H * 0.012));
    b.part('nacelle', 'Nacelle', 'Weather-proof housing for the generator and bearings', capsule(H * 0.04, H * 0.08, '#f5f5f5', 'paint', 'x'));
    b.part('blade', 'Blade', 'Aerodynamic blade (carved wood, PVC-pipe or fibreglass), twisted along its length', wing(H * 0.32, H * 0.05, H * 0.008, '#ffffff', 'paint'));
    b.part('hub', 'Hub', 'Hub plate bolting the blades to the generator shaft', comp(at(cyl(H * 0.03, H * 0.03, accent, 'paint', 'x')), at(lathe([[H * 0.03, 0], [0.01, H * 0.04]], accent, 'paint'), [H * 0.015, 0, 0], [0, 0, -90])));
    const s1 = b.stage('Raise the tower', 'Set the tower on a concrete footing and guy it in 3-4 directions. The rotor should be at least 9 m above anything within 150 m for clean wind (scale down for models).');
    b.put(s1, 'tower', [0, H / 2, 0]);
    const s2 = b.stage('Mount the generator', 'Fit the generator (a permanent-magnet alternator) in the nacelle on a yaw bearing, with a tail vane so it faces the wind.');
    b.put(s2, 'nacelle', [0, H, 0]);
    const s3 = b.stage('Fit the rotor', 'Bolt three blades to the hub exactly 120° apart and balance the rotor before installing.', { warn: 'Never work on the turbine while it can spin — furl or brake it first.' });
    b.put(s3, 'hub', [H * 0.08, H, 0]);
    for (const a of [90, 210, 330]) b.put(s3, 'blade', [H * 0.1, H + Math.sin(a / 57.3) * H * 0.17, Math.cos(a / 57.3) * H * 0.17], [-a, 0, 75]);
    return { box: { L: H * 0.2, H: H * 1.2, W: H * 0.7 }, covers: ['generator'] };
  }
  if (has(p, /3d printer|cnc|laser|plotter|router|mill/)) {
    b.part('rail', 'Frame extrusion', 'Aluminium T-slot extrusion (20x20 or 20x40)', rbox(L, 2, 2, '#c9ced6', 'metal', 0.3));
    b.part('post', 'Upright extrusion', 'Aluminium T-slot upright', rbox(2, H, 2, '#c9ced6', 'metal', 0.3));
    b.part('bed', 'Bed / work area', 'Flat bed (heated glass for printers, MDF spoilboard for CNC)', rbox(L * 0.7, 1, W * 0.7, '#2b2f36', 'metal', 0.3));
    b.part('gantry', 'Gantry', 'Gantry beam on linear rails, driven by belts or lead screws with stepper motors', rbox(2.5, 3, W, accent, 'paint', 0.6));
    b.part('head', 'Tool head', 'Tool head (hot-end / spindle / laser module) on a carriage', rbox(5, 7, 5, '#2b2f36', 'metal', 1));
    const s1 = b.stage('Build a square frame', 'Assemble the extrusion frame with corner brackets. Check every corner with a machinist square — accuracy of the machine starts here.');
    for (const y of [1, H]) for (const z of [1, -1]) b.put(s1, 'rail', [0, y, z * W / 2]);
    for (const x of [1, -1]) for (const z of [1, -1]) b.put(s1, 'post', [x * L / 2, H / 2, z * W / 2]);
    const s2 = b.stage('Bed and motion system', 'Install linear rails, the bed and the gantry. Tension belts until they twang like a low guitar string; lubricate rails.');
    b.put(s2, 'bed', [0, H * 0.3, 0]); b.put(s2, 'gantry', [0, H * 0.7, 0]); b.put(s2, 'head', [0, H * 0.62, 0]);
    return { box: { L, H, W }, covers: ['motor', 'controller'] };
  }
  if (has(p, /water ?wheel/)) {
    const R = H * 0.42;
    b.part('wheel', 'Wheel', 'Wheel rim with paddles/buckets', comp(at(torus(R, R * 0.04, mat.color, mat.m, 'z'), [0, 0, W * 0.2]), at(torus(R, R * 0.04, mat.color, mat.m, 'z'), [0, 0, -W * 0.2]), ...Array.from({ length: 12 }, (_, i) => at(rbox(R * 0.25, 1.5, W * 0.45, mat.color, mat.m, 0.4), [Math.cos(i * 30 / 57.3) * R, Math.sin(i * 30 / 57.3) * R, 0], [0, 0, i * 30]))));
    b.part('axle', 'Axle', 'Steel axle on two pillow-block bearings', cyl(R * 0.05, W, '#c9ced6', 'chrome', 'z'));
    b.part('frame', 'Support frame', 'Timber or steel A-frame supports', rbox(6, R * 1.25, 6, '#5c4632', 'wood', 1));
    const s1 = b.stage('Support frame', 'Build two A-frames to hold the axle just above the water so the paddles dip about 1/3 of their height.');
    for (const z of [1, -1]) b.put(s1, 'frame', [0, R * 0.62, z * W * 0.5]);
    const s2 = b.stage('Wheel and axle', 'Assemble the wheel, mount it on the axle and check it spins freely and balanced before connecting a load.');
    b.put(s2, 'axle', [0, R * 1.2, 0]); b.put(s2, 'wheel', [0, R * 1.2, 0]);
    return { box: { L: R * 2, H: R * 2.3, W }, covers: ['generator'] };
  }
  if (has(p, /crane|excavator|forklift|elevator|lift/)) {
    b.part('base', 'Base', 'Heavy base / counterweighted platform', rbox(L * 0.4, H * 0.08, W, '#2b2f36', 'metal', 2));
    b.part('mast', 'Mast', 'Lattice or box-section mast', rbox(H * 0.06, H * 0.9, H * 0.06, accent, 'paint', 1));
    b.part('jib', 'Jib', 'Jib / boom with trolley rail', rbox(L, H * 0.05, H * 0.05, accent, 'paint', 1));
    b.part('cw', 'Counterweight', 'Counterweight balancing the jib', rbox(L * 0.12, H * 0.1, H * 0.1, '#7a7f87', 'concrete', 1));
    b.part('hook', 'Hook & cable', 'Steel cable, winch drum and safety hook', comp(at(cyl(0.3, H * 0.4, '#3a3f47', 'metal')), at(torus(H * 0.02, H * 0.006, '#c9ced6', 'chrome', 'z'), [0, -H * 0.21, 0])));
    const s1 = b.stage('Base and mast', 'Fix the mast to a base that is heavy and wide enough to resist tipping at maximum load and reach.');
    b.put(s1, 'base', [0, H * 0.04, 0]); b.put(s1, 'mast', [0, H * 0.53, 0]);
    const s2 = b.stage('Jib, counterweight and hoist', 'Mount the jib and counterweight so the empty crane balances slightly toward the counterweight. Fit the winch and hook.', { warn: 'Never lift more than the rated load at the given reach.' });
    b.put(s2, 'jib', [L * 0.3, H * 0.98, 0]); b.put(s2, 'cw', [-L * 0.15, H * 0.92, 0]); b.put(s2, 'hook', [L * 0.6, H * 0.76, 0]);
    return { box: { L: L * 1.2, H, W }, covers: ['motor'] };
  }
  // generic geared mechanism (engines, gearboxes, clocks, pumps, generators, presses...)
  const g = Math.min(L, H) * 0.22;
  b.part('plate', 'Base plate', `${mat.sheet} base plate, ${len(L)} x ${len(W)}`, rbox(L, 3, W, mat.color, mat.m, 0.8));
  b.part('frame', 'Side frame', 'Clear acrylic or aluminium side plate with precisely located bearing holes', rbox(L * 0.9, H * 0.75, 1.5, '#cfe8ff', 'glass', 0.5));
  b.part('gearL', 'Large gear', `Spur gear, ${len(g * 2)} diameter (laser-cut, 3D-printed or machined)`, gear(g, 28, 2, accent, 'paint'));
  b.part('gearS', 'Pinion gear', `Pinion gear, ${len(g)} diameter — ratio 2:1 with the large gear`, gear(g / 2, 14, 2, '#c9ced6', 'metal'));
  b.part('shaft', 'Shaft', 'Steel shaft running in ball bearings', cyl(g * 0.06, W * 0.9, '#d0d4da', 'chrome', 'z'));
  b.part('housing', 'Drive unit', 'Power source: motor, engine or hand crank as required', capsule(g * 0.4, g * 0.6, '#2b2f36', 'metal', 'z'));
  const s1 = b.stage('Base and frames', 'Mount two parallel bearing plates on the base. Drill bearing holes in both plates together so the shafts run perfectly parallel.');
  b.put(s1, 'plate', [0, 1.5, 0]); b.put(s1, 'frame', [0, H * 0.4, W * 0.3]); b.put(s1, 'frame', [0, H * 0.4, -W * 0.3]);
  const s2 = b.stage('Shafts and gears', `Fit the shafts so the gears mesh at a centre distance of ${len(g * 1.5)}. Gears should turn smoothly with a hair of backlash — too tight binds, too loose clatters.`);
  b.put(s2, 'shaft', [-g * 0.5, H * 0.45, 0]); b.put(s2, 'shaft', [g, H * 0.45, 0]);
  b.put(s2, 'gearL', [-g * 0.5, H * 0.45, 0]); b.put(s2, 'gearS', [g, H * 0.45, 0], [0, 0, 6]);
  const s3 = b.stage('Drive unit', 'Couple the drive (motor or crank) to the pinion shaft with a flexible coupling, add a guard over the gears and lubricate.', { warn: 'Always guard moving gears and belts — they can catch fingers, hair and clothing.' });
  b.put(s3, 'housing', [g, H * 0.45, W * 0.55]);
  return { box: { L, H, W }, covers: ['motor'] };
};

GEN.container = (b, c) => {
  const { L, W, H, len, p, accent, mat } = c;
  if (has(p, /aquarium|terrarium|vivarium|tank/)) {
    b.part('glass', 'Glass tank', `Glass panes ${has(p, /aquarium/) ? '(thickness ≥ 6 mm for this size)' : ''} bonded with aquarium-safe silicone`, rbox(L, H, W, '#cfeaff', 'glass', 0.4));
    b.part('water', has(p, /terrarium|vivarium/) ? 'Substrate' : 'Water', has(p, /terrarium|vivarium/) ? 'Drainage layer, mesh and soil substrate' : 'Dechlorinated water', box(L - 1, has(p, /terrarium|vivarium/) ? H * 0.25 : H * 0.85, W - 1, has(p, /terrarium|vivarium/) ? '#5b4130' : '#4aa8ff', has(p, /terrarium|vivarium/) ? 'soil' : 'water'));
    b.part('stand', 'Stand', `Level stand rated for the full weight (${Math.round(L * W * H / 1000)} kg of water)`, rbox(L + 4, 60, W + 4, mat.color, mat.m, 1));
    b.part('plant', 'Plant / decor', 'Live plants, rock and driftwood', ellipsoid(L * 0.06, H * 0.2, L * 0.06, '#3a9d4b', 'leaf'));
    const s1 = b.stage('Build a level stand', 'Build the stand from strong lumber and check level in both directions — water magnifies any tilt and uneven stress cracks glass.');
    b.put(s1, 'stand', [0, 30, 0]);
    const s2 = b.stage('Bond the tank', 'Clean all glass edges with alcohol, run silicone beads, assemble on a flat surface and tape in place. Cure 48 h, then leak-test outdoors for 24 h.');
    b.put(s2, 'glass', [0, 60 + H / 2, 0]);
    const s3 = b.stage('Fill and plant', 'Add substrate, hardscape and plants, then fill slowly over a plate to avoid disturbing the substrate.');
    b.put(s3, 'water', [0, 60 + (has(p, /terrarium|vivarium/) ? H * 0.125 : H * 0.43), 0]);
    for (const x of [-L * 0.3, 0, L * 0.25]) b.put(s3, 'plant', [x, 60 + H * 0.35, -W * 0.15]);
    return { box: { L, H: H + 60, W } };
  }
  const T = Math.max(1, Math.min(L, W) * 0.05);
  b.part('wall', 'Side wall', `${mat.sheet}, ${len(H)} tall`, rbox(L, H, T, mat.color, mat.m, 0.3));
  b.part('end', 'End wall', `${mat.sheet} end panel, ${len(W - 2 * T)} x ${len(H)}`, rbox(T, H, W - 2 * T, mat.color, mat.m, 0.3));
  b.part('bottom', 'Bottom', `${mat.sheet} bottom, ${len(L)} x ${len(W)}`, rbox(L, T, W, mat.color, mat.m, 0.3));
  const s1 = b.stage('Cut the panels', `Cut two sides (${len(L)} x ${len(H)}), two ends (${len(W - 2 * T)} x ${len(H)}) and a bottom (${len(L)} x ${len(W)}).`);
  b.put(s1, 'bottom', [0, T / 2, 0]);
  const s2 = b.stage('Assemble the box', `Glue and fasten the walls around the bottom with ${mat.joinery}. Clamp and check diagonals for square.`);
  b.put(s2, 'wall', [0, H / 2, W / 2 - T / 2]); b.put(s2, 'wall', [0, H / 2, -W / 2 + T / 2]); b.put(s2, 'end', [L / 2 - T / 2, H / 2, 0]); b.put(s2, 'end', [-L / 2 + T / 2, H / 2, 0]);
  if (has(p, /planter|compost|garden|bird feeder|beehive/)) {
    b.part('soil', has(p, /bird feeder/) ? 'Seed' : 'Contents', has(p, /bird feeder/) ? 'Bird seed mix' : 'Potting mix / compost', box(L - 2 * T, H * 0.8, W - 2 * T, has(p, /bird feeder/) ? '#d9b26f' : '#4a3222', 'soil'));
    const s3 = b.stage('Drainage and fill', 'Drill 10 mm drainage holes in the bottom, line the walls with landscape fabric, and fill.');
    b.put(s3, 'soil', [0, H * 0.42, 0]);
  } else {
    const chest = has(p, /chest|treasure/);
    b.part('lid', 'Lid', chest ? 'Curved lid from narrow staves' : `${mat.sheet} lid with hinges and stay`, chest ? cyl(W / 2, L, mat.color, mat.m, 'x') : rbox(L + 1, T, W + 1, accent, 'paint', 0.4));
    b.part('handle', 'Handle', 'Sturdy carrying handle (rated for the loaded weight)', comp(at(torus(Math.min(L, W) * 0.08, 0.6, '#2b2f36', 'metal', 'x'))));
    const s3 = b.stage('Lid, hinges and handles', 'Fit the lid on two hinges with a lid stay so it can\'t slam, then mount the handles on the ends through-bolted with washers.');
    b.put(s3, 'lid', chest ? [0, H, 0] : [0, H + T / 2, 0]);
    b.put(s3, 'handle', [L / 2 + 0.5, H * 0.7, 0], [0, 90, 0]); b.put(s3, 'handle', [-L / 2 - 0.5, H * 0.7, 0], [0, 90, 0]);
  }
  return { box: { L, H, W }, roofY: H };
};

GEN.appliance = (b, c) => {
  const { L, W, H, len, p, accent } = c;
  if (has(p, /\bfan\b|purifier|air conditioner/)) {
    const R = Math.min(L, H) * 0.35;
    b.part('base', 'Base', 'Weighted base with controls', rbox(R * 1.2, H * 0.06, R * 0.9, '#f5f5f5', 'paint', 2));
    b.part('stem', 'Stand', 'Stand tube', cyl(R * 0.05, H * 0.45, '#c9ced6', 'chrome'));
    b.part('guard', 'Guard', 'Wire/printed safety guard (finger-safe gaps < 8 mm)', comp(at(torus(R, R * 0.02, '#c9ced6', 'chrome', 'z')), ...[0, 30, 60, 90, 120, 150].map((a) => at(box(R * 2, 0.3, 0.3, '#c9ced6', 'chrome'), [0, 0, 0], [0, 0, a]))));
    b.part('blades', 'Fan blades', 'Balanced fan impeller on a brushless DC motor', comp(at(cyl(R * 0.18, R * 0.15, accent, 'paint', 'z')), ...[0, 72, 144, 216, 288].map((a) => at(rbox(R * 0.7, R * 0.3, 0.6, accent, 'paint', 0.3), [Math.cos(a / 57.3) * R * 0.45, Math.sin(a / 57.3) * R * 0.45, 0], [20, 0, a]))));
    const s1 = b.stage('Base and stand', 'Build a heavy base (it must not tip with the head tilted) and fit the stand tube.');
    b.put(s1, 'base', [0, H * 0.03, 0]); b.put(s1, 'stem', [0, H * 0.28, 0]);
    const s2 = b.stage('Motor, blades and guard', 'Mount the motor, press on the blades and balance them with small weights until there\'s no vibration. Close the guard.');
    b.put(s2, 'blades', [0, H * 0.55 + R, 0]); b.put(s2, 'guard', [0, H * 0.55 + R, R * 0.12]); b.put(s2, 'guard', [0, H * 0.55 + R, -R * 0.12]);
    return { box: { L, H: H * 0.55 + 2 * R, W }, covers: ['fan', 'motor'] };
  }
  const hot = has(p, /oven|smoker|grill|forge|kiln|stove|fire|pizza|heater|sauna/);
  b.part('body', 'Body', hot ? 'Steel shell lined with refractory insulation (ceramic fibre / firebrick)' : 'Insulated cabinet body', rbox(L, H * 0.7, W, hot ? '#2b2f36' : '#f5f5f5', hot ? 'metal' : 'paint', Math.min(L, W) * 0.06));
  b.part('door', 'Door', hot ? 'Insulated door with a high-temperature gasket and window' : 'Door with gasket and latch', comp(at(rbox(1.5, H * 0.5, W * 0.8, hot ? '#3a3f47' : accent, hot ? 'metal' : 'paint', 0.8)), at(rbox(0.6, H * 0.22, W * 0.45, hot ? '#ff8a3d' : '#cfeaff', hot ? 'emissive' : 'glass', 0.3), [0.8, 0, 0])));
  b.part('leg', 'Leg', 'Steel leg / stand', rbox(3, H * 0.3, 3, '#3a3f47', 'metal', 0.4));
  b.part('knob', 'Control', hot ? 'Temperature gauge / gas valve or thermostat controller' : 'Controller and thermostat', cyl(Math.min(L, W) * 0.05, 2, '#c9ced6', 'chrome', 'x'));
  const s1 = b.stage('Stand and legs', 'Build a stable stand. Hot appliances need clearance from anything flammable (typically ≥ 1 m).');
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => b.put(s1, 'leg', [x * (L / 2 - 3), H * 0.15, z * (W / 2 - 3)]));
  const s2 = b.stage('Build the insulated body', `Build the ${len(L)} x ${len(H * 0.7)} x ${len(W)} body. ${hot ? 'Line it with refractory insulation; never use galvanised steel inside — zinc fumes are toxic when heated.' : 'Line it with rigid foam insulation and seal all joints.'}`);
  b.put(s2, 'body', [0, H * 0.3 + H * 0.35, 0]);
  const s3 = b.stage('Door and controls', 'Hang the door on heavy hinges with a gasket, then fit the temperature controls and test at low settings first.', hot ? { warn: 'Test hot appliances outdoors, keep a fire extinguisher nearby, and use a CO alarm near any combustion appliance.' } : {});
  b.put(s3, 'door', [L / 2 + 0.8, H * 0.65, 0]); b.put(s3, 'knob', [L / 2 + 1, H * 0.92, W * 0.3]);
  if (hot && has(p, /smoker|forge|stove|pizza|kiln|fire/)) {
    b.part('chimney', 'Chimney', 'Flue pipe with rain cap and damper', cyl(Math.min(L, W) * 0.08, H * 0.4, '#3a3f47', 'metal'));
    b.put(s3, 'chimney', [-L * 0.3, H + H * 0.2, 0]);
  }
  return { box: { L, H: H * 1.05, W }, covers: ['heater'] };
};

GEN.energy = (b, c) => {
  const { L, W, H, len, accent } = c;
  const n = Math.max(1, Math.round(L / 100));
  b.part('rack', 'Mounting rack', 'Aluminium or galvanised-steel tilted mount, angled ≈ your latitude', rbox(L, 4, 4, '#c9ced6', 'metal', 0.5));
  b.part('panel', 'Solar panel', 'Monocrystalline solar panel; choose total watts = daily Wh need ÷ peak sun hours ÷ 0.7', comp(at(rbox(95, 3, W * 0.9, '#c9ced6', 'metal', 0.5)), at(box(91, 3.4, W * 0.86, '#16264f', 'solar'))));
  b.part('battery', 'Battery bank', 'LiFePO4 battery with built-in BMS (safer & longer-lived than lead-acid)', rbox(L * 0.25, H * 0.3, W * 0.25, '#2b2f36', 'metal', 2));
  b.part('controller', 'Charge controller & inverter', 'MPPT charge controller + pure-sine inverter sized for your peak load, with fuses/breakers', rbox(L * 0.2, H * 0.2, 6, accent, 'paint', 1.5));
  const s1 = b.stage('Size the system', 'List every device with its watts x hours/day to get daily Wh. Battery Wh ≈ 1.5x daily use; panel W ≈ daily Wh ÷ sun hours ÷ 0.7.');
  const s2 = b.stage('Mount the panels', `Build the rack and mount ${n} panel${n > 1 ? 's' : ''} facing the equator (south in the northern hemisphere), tilted near your latitude, with no shade between 9 am and 3 pm.`);
  for (const z of [1, -1]) b.put(s2, 'rack', [0, H * 0.5, z * W * 0.4]);
  for (let i = 0; i < n; i++) b.put(s2, 'panel', [-L / 2 + (i + 0.5) * L / n, H * 0.55, 0], [-30, 0, 0]);
  const s3 = b.stage('Battery, controller and wiring', 'Wire panels → fuse → charge controller → battery → fuse → inverter, using wire sized for the current (check a voltage-drop chart).', { warn: 'Batteries can deliver enormous current — fuse every positive lead close to the battery and never short terminals.' });
  b.put(s3, 'battery', [L * 0.3, H * 0.15, -W * 0.9]); b.put(s3, 'controller', [-L * 0.1, H * 0.2, -W * 0.9]);
  return { box: { L, H, W: W * 2 }, covers: ['solar', 'battery'] };
};

GEN.instrument = (b, c) => {
  const { L, W, H, len, p, accent, mat } = c;
  if (has(p, /drum|cajon|bongo|conga/)) {
    const R = W / 2;
    if (has(p, /cajon/)) {
      b.part('box', 'Cajon body', 'Birch plywood box (12 mm) with a thin 3 mm tapa front and snare wires inside', rbox(W, H, W, mat.color, mat.m, 1));
      const s1 = b.stage('Build the box', 'Glue the sides, top and bottom; screw the thin front (tapa) on with the top corners left slightly loose for the slap sound.');
      b.put(s1, 'box', [0, H / 2, 0]);
      return { box: { L: W, H, W } };
    }
    b.part('shell', 'Drum shell', 'Plywood or stave drum shell, edges bevelled at 45°', cyl(R, H * 0.6, accent, 'paint'));
    b.part('head', 'Drum head', 'Mylar or rawhide drum head with tension hoop', comp(at(cyl(R + 0.5, 0.6, '#f7f3ea', 'fabric')), at(torus(R + 0.5, 0.6, '#c9ced6', 'chrome', 'y'))));
    b.part('lug', 'Tension lug', 'Tension rod and lug', cyl(0.5, H * 0.6, '#c9ced6', 'chrome'));
    const s1 = b.stage('Make the shell', 'Build the shell, bevel the bearing edges perfectly flat (rotate on sandpaper on glass) and finish it.');
    b.put(s1, 'shell', [0, H * 0.3, 0]);
    const s2 = b.stage('Heads and tuning', 'Fit the heads and tension rods; tighten in a star pattern, a quarter-turn at a time, until even.');
    b.put(s2, 'head', [0, H * 0.6, 0]); b.put(s2, 'head', [0, 0, 0]);
    for (let i = 0; i < 8; i++) b.put(s2, 'lug', [Math.cos(i * 45 / 57.3) * (R + 1), H * 0.3, Math.sin(i * 45 / 57.3) * (R + 1)]);
    return { box: { L: W, H: H * 0.6, W } };
  }
  if (has(p, /xylophone|marimba|glockenspiel|kalimba|piano|keyboard/)) {
    const n = 12;
    b.part('frame', 'Frame', 'Hardwood frame with felt or cord supports', rbox(L, 4, W, '#5c4632', 'wood', 1));
    for (let i = 0; i < n; i++) b.part('bar' + i, `Tone bar ${i + 1}`, `Hardwood or aluminium bar, ~${len(W * (0.95 - i * 0.04))} long, tuned by thinning its centre`, rbox(L / n * 0.8, 2, W * (0.95 - i * 0.04), i % 2 ? accent : '#d8a26b', i % 2 ? 'paint' : 'wood', 0.5));
    const s1 = b.stage('Build the frame', 'Build a trapezoid frame matching the bar lengths, with felt supports at the nodes (22.4% from each bar end).');
    b.put(s1, 'frame', [0, 2, 0]);
    const s2 = b.stage('Cut and tune the bars', 'Cut bars progressively shorter. Tune each with a tuner app: remove wood from the middle underside to lower pitch, from the ends to raise it.');
    for (let i = 0; i < n; i++) b.put(s2, 'bar' + i, [-L / 2 + (i + 0.5) * L / n, 5, 0]);
    return { box: { L, H: 8, W } };
  }
  // string instruments
  const bl = L * 0.45;
  b.part('body', 'Body', 'Tonewood body — spruce top with a braced soundboard, and a sound hole', comp(at(ellipsoid(bl * 0.3, W * 0.08, W * 0.36, mat.color, mat.m), [bl * 0.22, 0, 0]), at(ellipsoid(bl * 0.25, W * 0.08, W * 0.3, mat.color, mat.m), [-bl * 0.2, 0, 0]), at(cyl(W * 0.1, 0.3, '#2b1b10', 'plastic'), [-bl * 0.05, W * 0.08, 0])));
  b.part('neck', 'Neck & fretboard', 'Hardwood neck with a truss rod and fretboard; fret positions from a fret calculator', comp(at(rbox(L * 0.45, 2.4, 5, '#7a4f2c', 'wood', 0.6)), ...Array.from({ length: 12 }, (_, i) => at(box(0.2, 0.3, 5, '#d8d8d8', 'chrome'), [-L * 0.2 + i * L * 0.035, 1.3, 0]))));
  b.part('head', 'Headstock & tuners', 'Headstock with geared tuning machines', comp(at(rbox(L * 0.1, 1.8, 7, '#7a4f2c', 'wood', 0.6)), ...[-2, -1, 1, 2].map((z) => at(cyl(0.6, 2.5, '#c9ced6', 'chrome', 'y'), [0, 1.5, z * 1.6]))));
  b.part('strings', 'Strings', 'Set of strings for the instrument and scale length', comp(...[-1.5, -0.5, 0.5, 1.5].map((z) => at(cyl(0.06, L * 0.75, '#e8e8e8', 'chrome', 'x'), [0, 0, z]))));
  const s1 = b.stage('Build the body', 'Build the body sides, brace the soundboard (X-bracing for steel strings, fan bracing for nylon) and glue the top and back on.');
  b.put(s1, 'body', [-L * 0.25, 6, 0]);
  const s2 = b.stage('Neck, frets and headstock', 'Shape the neck, install the truss rod, slot frets at the calculated positions and glue the neck at a slight back-angle.');
  b.put(s2, 'neck', [L * 0.2, 7, 0]); b.put(s2, 'head', [L * 0.47, 7, 0]);
  const s3 = b.stage('String up and set up', 'Fit the bridge so its saddle sits at exactly the scale length from the nut, string up and adjust action and intonation.');
  b.put(s3, 'strings', [0.05 * L, 8.8, 0]);
  return { box: { L, H: 14, W } };
};

GEN.toy = (b, c) => {
  const { L, W, H, len, p, accent, mat } = c;
  const palette = [accent, '#ffd166', '#06d6a0', '#118ab2', '#ef476f'];
  if (has(p, /marble run|rube goldberg/)) {
    b.part('board', 'Backboard', 'Plywood backboard on a stable base', rbox(L, H, 2, mat.color, mat.m, 0.6));
    b.part('ramp', 'Ramp', 'Ramp channel (wood strips, pipe halves or 3D-printed track) at 5-10° slope', rbox(L * 0.6, 1.5, 5, accent, 'paint', 0.5));
    b.part('marble', 'Marble', 'Glass marbles', sphere(0.9, '#56ccf2', 'glass'));
    const s1 = b.stage('Backboard', 'Make the backboard and fix it to a wide base so it can\'t topple.');
    b.put(s1, 'board', [0, H / 2, 0]);
    const s2 = b.stage('Zig-zag ramps', 'Fix ramps in a zig-zag, each sloping 5-10° and overlapping the next so marbles drop cleanly.');
    for (let i = 0; i < 5; i++) b.put(s2, 'ramp', [(i % 2 ? 1 : -1) * L * 0.15, H * (0.85 - i * 0.17), 3.5], [0, 0, (i % 2 ? 1 : -1) * 6]);
    for (let i = 0; i < 3; i++) b.put(s2, 'marble', [-L * 0.2 + i * 3, H * 0.88, 3.5]);
    return { box: { L, H, W: 10 } };
  }
  if (has(p, /arcade|pinball|claw/)) {
    b.part('cab', 'Cabinet', 'MDF cabinet with T-molding edges', rbox(L, H, W, accent, 'paint', 2));
    b.part('screen', 'Screen', 'Monitor / playfield', rbox(L * 0.8, H * 0.3, 1, '#0e2a47', 'screen', 0.5));
    b.part('stick', 'Joystick & buttons', 'Arcade joystick and 30 mm buttons wired to a USB encoder', comp(at(cyl(0.6, 5, '#111', 'metal'), [0, 2.5, 0]), at(sphere(1.6, '#e63946', 'paint'), [0, 5.5, 0]), ...[3, 6, 9].map((x) => at(cyl(1.4, 1, palette[x / 3], 'paint'), [x, 0.5, 0]))));
    const s1 = b.stage('Cabinet', 'Cut the side profiles from MDF, join them with panels and fit T-molding on the edges.');
    b.put(s1, 'cab', [0, H / 2, 0]);
    const s2 = b.stage('Screen and controls', 'Mount the screen behind a bezel and the control panel at elbow height (~100 cm).');
    b.put(s2, 'screen', [0, H * 0.72, W / 2 + 0.5]); b.put(s2, 'stick', [-L * 0.2, H * 0.5, W / 2 + 5]);
    return { box: { L, H, W }, covers: ['screen', 'controller'] };
  }
  const n = 4;
  b.part('base', 'Base', `${mat.sheet} base / play board`, rbox(L, 2, W, mat.color, mat.m, 0.6));
  for (let i = 0; i < n; i++) b.part('block' + i, `Component ${i + 1}`, 'Shaped toy component — sand all edges round and use non-toxic, child-safe paint', rbox(L * 0.2, H * (0.3 + i * 0.15), W * 0.25, palette[i], 'paint', Math.min(L, W) * 0.03));
  const s1 = b.stage('Base', 'Cut and sand the base. For children\'s toys, round every edge and check no part is small enough to swallow.');
  b.put(s1, 'base', [0, 1, 0]);
  const s2 = b.stage('Make and fit the components', 'Shape each component, paint with non-toxic finish, and join them with glue and dowels.');
  for (let i = 0; i < n; i++) b.put(s2, 'block' + i, [-L * 0.35 + i * L * 0.23, 2 + H * (0.3 + i * 0.15) / 2, (i % 2 ? 1 : -1) * W * 0.15]);
  return { box: { L, H, W } };
};

GEN.wearable = (b, c) => {
  const { L, W, H, len, p, accent } = c;
  if (has(p, /helmet|mask/)) {
    const R = W / 2;
    b.part('shell', 'Shell', 'Helmet shell (EVA foam, fibreglass or 3D-printed) with foam padding', comp(at(sphere(R, accent, 'paint'), [0, 0, 0])));
    b.part('visor', 'Visor', 'Tinted PETG / polycarbonate visor', comp(at(rbox(R * 0.9, R * 0.5, R * 1.3, '#1d2b3a', 'glass', R * 0.2))));
    const s1 = b.stage('Shell', 'Pattern the shell from your head measurement + 2 cm, build it up and line it with 1 cm foam padding.');
    b.put(s1, 'shell', [0, R, 0]);
    const s2 = b.stage('Visor and straps', 'Heat-form the visor, mount it on pivots and add an adjustable chin strap.');
    b.put(s2, 'visor', [R * 0.6, R * 0.9, 0]);
    return { box: { L: W, H: W, W } };
  }
  b.part('body', 'Main body', `${has(p, /armor|armour|exoskeleton|suit/) ? 'EVA foam or thermoplastic plates' : 'Heavy-duty nylon/canvas panels'} sewn or bonded together`, rbox(L, H, W, accent, has(p, /armor|armour|exoskeleton|suit/) ? 'paint' : 'fabric', Math.min(L, W) * 0.25));
  b.part('pocket', 'Pocket / plate', 'Front pocket or detail plate with zip / fasteners', rbox(L * 0.8, H * 0.35, W * 0.3, '#2b2f36', 'fabric', 2));
  b.part('strap', 'Strap', 'Padded adjustable strap with buckle', tube([[0, H * 0.45, 0], [-W * 0.3, H * 0.2, 0], [-W * 0.3, -H * 0.3, 0], [0, -H * 0.45, 0]], 1.2, '#2b2f36', 'fabric'));
  const s1 = b.stage('Pattern and cut', 'Make a paper pattern from your body measurements, test-fit it, then cut the main material with 1 cm seam allowance.');
  b.put(s1, 'body', [0, H / 2, 0]);
  const s2 = b.stage('Details and closures', 'Sew/bond pockets or plates and fit zips or buckles. Reinforce stress points with bar-tacks or rivets.');
  b.put(s2, 'pocket', [0, H * 0.35, W / 2 + W * 0.1]);
  const s3 = b.stage('Straps and fitting', 'Attach adjustable straps and test-wear with a full load; adjust so weight sits on the hips, not the shoulders.');
  b.put(s3, 'strap', [0, H / 2, -W / 2 - 1]); b.put(s3, 'strap', [0, H / 2, -W / 2 - 1], [0, 180, 0]);
  return { box: { L, H, W } };
};

GEN.custom = (b, c) => {
  const { L, W, H, len, accent, mat } = c;
  b.part('frame', 'Base frame', `${mat.stock} base frame, ${len(L)} x ${len(W)}`, rbox(L, H * 0.1, W, '#3a3f47', 'metal', 1));
  b.part('body', 'Main housing', `Main housing (${mat.name}), ${len(L * 0.85)} x ${len(H * 0.6)} x ${len(W * 0.85)}`, rbox(L * 0.85, H * 0.6, W * 0.85, accent, 'paint', Math.min(L, H, W) * 0.12));
  b.part('panel', 'Access panel', 'Removable access panel with captive screws', rbox(L * 0.5, H * 0.35, 0.8, '#f5f5f5', 'paint', 0.6));
  const s1 = b.stage('Define the requirements', 'Write down what it must do, its maximum size, weight, power source and budget. Sketch three concepts and choose the simplest that meets every requirement.');
  const s2 = b.stage('Build the base frame', `Build a rigid base frame ${len(L)} x ${len(W)} that every other subsystem bolts to.`);
  b.put(s2, 'frame', [0, H * 0.05, 0]);
  const s3 = b.stage('Main housing', 'Build the main housing around the frame, leaving an access panel for maintenance.');
  b.put(s3, 'body', [0, H * 0.1 + H * 0.3, 0]); b.put(s3, 'panel', [0, H * 0.4, W * 0.43]);
  return { box: { L, H: H * 0.7, W }, mount: { x: 0, y: H * 0.4 } };
};

export { GEN };
