// Fabrication planner: decides HOW every part is made (3D print, cut, metalwork,
// sew or buy), gives machine-specific settings, and inserts fabrication steps.

const MM = { mm: 1, cm: 10, in: 25.4 };
const BUY = /\b(kit|actuator|motor|battery|batteries|board|sensor|camera|speaker|display|screen|led|light source|bulb|wire|fuse|switch|receiver|transmitter|remote control|pump|fan|heating|charge controller|inverter|solar panel|solar array|mattress|pillow|strings|marble|water|substrate|soil|seed|plant|hinge|caster|wheel|tyre|tire|bearing|axle|shaft|cpu|graphics|memory|ssd|power supply|motherboard|cooler|radiator|esc|capacitor|vtx|transmitter|propeller|prop\b|cell|bms|boost|jack|dimmer|gauge|indicator|connector|servo|controller|glass tank|drum head|tuning|sail|envelope|cushion|mattress|lock|strap|cable|tubing|hook|panel \(|operating system|filament|fasteners|glue|finish|nails|screws)\b/i;
const STRUCT = /\b(gear|bracket|mount|frame|arm|link|hub|chassis|leg|joint|base|axle|truss|spar|pinion|gripper|clip|hinge)\b/i;
const FLEX = /\b(tyre|tire|grip|bumper|gasket|seal|foot|feet|sole|strap)\b/i;
const OUTDOOR = /\b(outdoor|garden|boat|marine|solar|car|kart|rover|waterproof|weather|backyard|roof|bird|planter|kayak|canoe|drone|plane|rocket)\b/i;
const DECOR = /\b(toy|kids|decor|cosplay|costume|model|figure|display|helmet|mask|armor|armour|game|puzzle|chess|ornament)\b/i;

export const FILAMENTS = {
  PLA: { nozzle: '200-215 °C', bed: '55-60 °C', note: 'easiest to print; indoor use only (softens at ~55 °C)', density: 1.24 },
  PETG: { nozzle: '235-245 °C', bed: '75-85 °C', note: 'tough, slightly flexible, moisture & mild-heat resistant', density: 1.27 },
  ASA: { nozzle: '250-260 °C', bed: '95-105 °C', note: 'UV- and weather-proof for outdoor parts; print in an enclosure with ventilation', density: 1.07 },
  TPU: { nozzle: '220-230 °C', bed: '40-50 °C', note: 'flexible/rubbery (95A); print slowly (20-30 mm/s) with direct drive', density: 1.21 },
};

// approximate bounding box (in the plan's units) of a declarative shape
export function shapeSize(s) {
  if (!s) return [0, 0, 0];
  switch (s.t) {
    case 'box': case 'rbox': return [...s.s];
    case 'cyl': { const r = Math.max(s.r, s.r2 ?? s.r); return s.axis === 'x' ? [s.h, 2 * r, 2 * r] : s.axis === 'z' ? [2 * r, 2 * r, s.h] : [2 * r, s.h, 2 * r]; }
    case 'capsule': { const L = s.len + 2 * s.r; return s.axis === 'x' ? [L, 2 * s.r, 2 * s.r] : s.axis === 'z' ? [2 * s.r, 2 * s.r, L] : [2 * s.r, L, 2 * s.r]; }
    case 'sphere': return s.sc ? s.sc.map((v) => 2 * v * s.r) : [2 * s.r, 2 * s.r, 2 * s.r];
    case 'torus': { const d = 2 * (s.R + s.r), t = 2 * s.r; return s.axis === 'x' ? [t, d, d] : s.axis === 'y' ? [d, t, d] : [d, d, t]; }
    case 'lathe': { const r = Math.max(...s.pts.map((p) => p[0])), ys = s.pts.map((p) => p[1]); return [2 * r, Math.max(...ys) - Math.min(...ys), 2 * r]; }
    case 'hull': return [s.L, s.D * 1.3, s.B];
    case 'wing': return [s.chord, s.thick * 1.5, s.span];
    case 'tri': case 'profile': { const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), s.thick ?? s.width]; }
    case 'gear': return [2 * s.r, 2 * s.r, s.thick];
    case 'tube': { const a = [0, 1, 2].map((i) => s.pts.map((p) => p[i])); return a.map((v) => Math.max(...v) - Math.min(...v) + 2 * s.r); }
    case 'comp': {
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (const ch of s.children) {
        let sz = shapeSize(ch.shape);
        if (ch.r && ch.r.some((v) => v % 180)) { const d = Math.hypot(...sz); sz = [d, d, d].map((v, i) => Math.min(v, Math.max(...sz))); }
        for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], ch.p[i] - sz[i] / 2); mx[i] = Math.max(mx[i], ch.p[i] + sz[i] / 2); }
      }
      return mx.map((v, i) => v - mn[i]);
    }
    default: return [0, 0, 0];
  }
}
function rootMaterial(s) { if (!s) return null; if (s.t === 'comp') { const counts = {}; for (const ch of s.children) { const m = rootMaterial(ch.shape); if (m) counts[m] = (counts[m] || 0) + 1; } return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null; } return s.m; }
function curvy(s) { return s && (['lathe', 'sphere', 'capsule', 'torus', 'wing', 'hull', 'tube'].includes(s.t) || (s.t === 'comp' && s.children.some((c) => curvy(c.shape) || (c.r || []).some((v) => v % 90)))); }

export function planFabrication(plan, { unit = 'cm', prompt = '', category = '', fmt } = {}) {
  const k = MM[unit] || 10;
  const mmFmt = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} m` : `${Math.round(v)} mm`);
  const show = fmt || mmFmt;
  const groups = { print: [], cut: [], metal: [], sew: [], buy: [] };
  for (const part of plan.parts) {
    const text = `${part.name} ${part.spec}`;
    const size = part.shape ? shapeSize(part.shape).map((v) => v * k) : null; // mm
    const max = size ? Math.max(...size) : 0;
    const m = rootMaterial(part.shape);
    let fab;
    const explicitPrint = /3d.?print|printed|petg|pla\b/i.test(part.spec);
    if (!part.shape || ((BUY.test(part.name) || /\b(module|off-the-shelf|kit)\b/i.test(part.spec)) && !explicitPrint) || ['pcb', 'glass', 'water', 'soil', 'leaf', 'screen', 'emissive', 'solar', 'rubber'].includes(m)) fab = { method: 'buy', label: 'Buy' };
    else if (m === 'wood') fab = { method: 'cut', label: 'Cut (woodworking)' };
    else if (m === 'metal' || m === 'chrome') fab = { method: 'metal', label: max < 150 && /gear|bracket|plate/i.test(text) ? 'Laser/water-jet cut or machine' : 'Metalwork' };
    else if (m === 'fabric') fab = { method: 'sew', label: 'Sew / upholster' };
    else if (m === 'concrete') fab = { method: 'cut', label: 'Cast / build on site' };
    else if (m === 'carbon' || ['pc', 'drone'].includes(category)) fab = { method: 'buy', label: 'Buy' };
    else if (max <= 600 || explicitPrint) {
      const sections = Math.max(1, Math.ceil(max / 250));
      const fil = FLEX.test(text) ? 'TPU' : DECOR.test(prompt) || category === 'toy' ? 'PLA' : OUTDOOR.test(prompt) ? 'ASA' : 'PETG';
      const structural = STRUCT.test(text);
      const minDim = Math.min(...size);
      fab = {
        method: 'print', label: sections > 1 ? `3D print in ${sections} sections` : '3D print', sections, sizeMm: size.map((v) => Math.round(v)),
        settings: {
          filament: fil, nozzle: max > 160 ? '0.6 mm (faster) or 0.4 mm' : '0.4 mm', layer: minDim < 25 ? '0.12 mm' : max > 160 ? '0.28 mm' : '0.20 mm',
          walls: structural ? 4 : 3, infill: structural ? (/gear|pinion/i.test(text) ? '60% gyroid' : '40% gyroid') : '15% gyroid',
          supports: curvy(part.shape) ? 'Tree supports, touching build plate only' : 'None — print with the largest flat face on the bed',
          temps: `${FILAMENTS[fil].nozzle} nozzle / ${FILAMENTS[fil].bed} bed`, note: FILAMENTS[fil].note,
        },
      };
    } else fab = { method: 'cut', label: 'Fabricate (too large to 3D print)', note: 'Build from sheet material or fibreglass over a foam plug.' };
    part.fab = fab;
    if (size) part.sizeMm = size.map((v) => Math.round(v));
    groups[fab.method === 'print' ? 'print' : fab.method].push(part);
  }

  const steps = [];
  if (groups.buy.length) steps.push({ title: 'Order the components', kind: 'buy', text: `Order the ${groups.buy.length} purchased items first so they arrive while you fabricate. Check each against the "What you need" list — the type and specification matter more than the brand.`, details: groups.buy.slice(0, 12).map((p) => `${p.qty} × ${p.name} — ${p.spec}`), add: [] });
  if (groups.print.length) {
    steps.push({
      title: `3D print ${groups.print.length} custom part${groups.print.length > 1 ? 's' : ''}`, kind: 'print', printParts: groups.print.map((p) => p.id),
      text: `You need an FDM 3D printer with at least a 220 x 220 x 250 mm build volume (or use an online printing service). Download each STL below, slice it with these settings and print. Dry the filament first (PETG/ASA/TPU: 4-6 h at 50-65 °C) for strong, stringing-free parts.`,
      details: groups.print.map((p) => { const s = p.fab.settings; return `${p.name} ×${p.qty} (${p.sizeMm.map((v) => v + '').join(' × ')} mm${p.fab.sections > 1 ? `, split into ${p.fab.sections} sections with 5 mm alignment pins` : ''}): ${s.filament}, ${s.layer} layers, ${s.walls} walls, ${s.infill} infill, ${s.supports.toLowerCase()}, ${s.temps}.`; }).concat(['After printing: remove supports, sand mating faces flat, ream holes to size with a drill bit, and press in M3 heat-set inserts at 220 °C wherever screws go into plastic.']),
      add: [],
    });
  }
  if (groups.cut.length) steps.push({ title: 'Cut and prepare the parts', kind: 'cut', text: 'Mark every piece from the cut list with a square and pencil, cut slightly proud, then trim to the line. Label each part with masking tape as you go and sand edges before assembly.', details: groups.cut.map((p) => `${p.name} ×${p.qty}: ${p.sizeMm ? p.sizeMm.map((v) => show(v)).join(' × ') : p.spec}${p.fab.note ? ' — ' + p.fab.note : ''}`), add: [] });
  if (groups.metal.length) steps.push({ title: 'Cut and drill the metal parts', kind: 'metal', text: 'Measure and scribe each part, cut with a cut-off wheel or metal-cutting saw, deburr every edge, centre-punch then drill holes (pilot first, cutting fluid on steel). Weld or bolt sub-assemblies on a flat surface.', details: groups.metal.map((p) => `${p.name} ×${p.qty}: ${p.sizeMm ? p.sizeMm.map((v) => show(v)).join(' × ') : ''} — ${p.fab.label}`), warn: 'Wear eye, ear and hand protection; sparks travel far — clear flammables.', add: [] });
  if (groups.sew.length) steps.push({ title: 'Cut and sew the fabric parts', kind: 'sew', text: 'Trace the patterns onto the fabric with 1 cm seam allowance, cut with sharp shears or a rotary cutter, and sew with a heavy-duty needle and bonded nylon thread; bar-tack every stress point.', details: groups.sew.map((p) => `${p.name} ×${p.qty}`), add: [] });
  return { steps, groups: Object.fromEntries(Object.entries(groups).map(([k2, v]) => [k2, v.map((p) => p.id)])) };
}
