// Parameter extraction: pulls dimensions, counts, materials, budgets and
// electrical specs out of free text and returns normalised values.

const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const UNIT_IN = { ft: 12, feet: 12, foot: 12, "'": 12, in: 1, inch: 1, inches: 1, '"': 1, cm: 1 / 2.54, mm: 1 / 25.4, m: 39.37, meter: 39.37, meters: 39.37, metre: 39.37, metres: 39.37 };

export function extractParams(raw) {
  const text = String(raw || '').toLowerCase().replace(/(\d)\s*(?:''|”|″)/g, '$1"').replace(/(\d)\s*(?:’|′)/g, "$1'");
  const t = text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (m) => String(WORDNUM[m]));
  const out = { found: [] };
  const note = (k, v, src) => { out[k] = v; out.found = out.found.filter((f) => f.key !== k); out.found.push({ key: k, value: v, source: src.trim() }); };

  // "4x8", "4 x 8 ft", "48 x 24 in"
  const rect = t.match(/(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(ft|feet|foot|'|in|inch|inches|"|cm|mm|m)?\b/);
  const LUMBER = /^(1x(2|3|4|6|8|10|12)|2x(2|3|4|6|8|10|12)|4x(4|6))$/;
  if (rect && !(!rect[3] && LUMBER.test(rect[1] + 'x' + rect[2]))) {
    let u = rect[3] ? UNIT_IN[rect[3]] : null;
    const a = +rect[1], b = +rect[2];
    if (!u) u = Math.max(a, b) <= 12 ? 12 : 1; // "4x8" garden bed implies feet
    note('length', Math.max(a, b) * u, rect[0]);
    note('width', Math.min(a, b) * u, rect[0]);
  }

  // single dimensions with an optional direction word
  const dimRe = /(\d+(?:\.\d+)?)\s*(ft|feet|foot|'|inches|inch|in|"|cm|mm|meters|meter|metres|metre|m)(?![a-z])\s*(?:\d+\s*(?:in|inch|inches|")\s*)?(tall|high|height|wide|width|long|length|deep|depth)?/g;
  let m; const loose = [];
  while ((m = dimRe.exec(t))) {
    if (rect && rect.index <= m.index && m.index < rect.index + rect[0].length) continue;
    const ctx = t.slice(Math.max(0, m.index - 12), m.index);
    if (/(drone|prop|propeller)\s*$/.test(ctx) || /^(\d+)\s*(inch|in|")\s*(drone|quad|fpv|prop|cinewhoop|long range|freestyle)/.test(t.slice(m.index))) { note('sizeIn', +m[1], m[0]); continue; }
    let v = +m[1] * UNIT_IN[m[2]];
    const ft = m[0].match(/(\d+)\s*(?:ft|feet|foot|')\s*(\d+)\s*(?:in|inch|inches|")/);
    if (ft) v = +ft[1] * 12 + +ft[2];
    const dir = m[3];
    if (dir && /tall|high|height/.test(dir)) note('height', v, m[0]);
    else if (dir && /wide|width/.test(dir)) note('width', v, m[0]);
    else if (dir && /long|length/.test(dir)) note('length', v, m[0]);
    else if (dir && /deep|depth/.test(dir)) note('depth', v, m[0]);
    else loose.push([v, m[0]]);
  }
  for (const [v, src] of loose) {
    if (out.height == null) note('height', v, src);
    else if (out.width == null) note('width', v, src);
    else if (out.depth == null) note('depth', v, src);
  }

  const size = t.match(/(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:inch|in|")\s*(?:fpv\s*)?(?:drone|quad|quadcopter|prop|cinewhoop|long range|freestyle)/);
  if (size) note('sizeIn', +size[1], size[0]);

  const count = t.match(/(\d+)\s*(shelves|shelf|tiers|tier|levels|boards high|board high|rows)/);
  if (count) note('count', +count[1], count[0]);
  const wd = t.match(/\b(2|4)\s*wd\b|\b(2|4)\s*wheel/);
  if (wd) note('wheels', +(wd[1] || wd[2]), wd[0]);

  const money = t.match(/(?:\$\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:dollars|usd|bucks))/);
  if (money) note('budget', +String(money[1] || money[2]).replace(/,/g, ''), money[0]);
  const mah = t.match(/(\d[\d,]*)\s*mah/);
  if (mah) note('mah', +mah[1].replace(/,/g, ''), mah[0]);
  const watts = t.match(/(\d+(?:\.\d+)?)\s*(?:w|watt|watts)\b/);
  if (watts) note('watts', +watts[1], watts[0]);
  const volts = t.match(/(\d+(?:\.\d+)?)\s*(?:v|volt|volts)\b/);
  if (volts) note('volts', +volts[1], volts[0]);
  const kelvin = t.match(/(\d{4})\s*k\b/);
  if (kelvin) note('kelvin', +kelvin[1], kelvin[0]);
  else if (/warm/.test(t)) note('kelvin', 2700, 'warm');
  else if (/daylight|cool white|cold/.test(t)) note('kelvin', 5000, 'daylight');
  const lbs = t.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)\b/);
  if (lbs) note('weightLb', +lbs[1], lbs[0]);

  const mat = t.match(/\b(oak|pine|cedar|maple|walnut|plywood|mdf|birch|poplar|redwood|cherry)\b/);
  if (mat) note('material', mat[1], mat[0]);
  const bird = t.match(/\b(bluebird|wren|chickadee|nuthatch|titmouse|swallow)s?\b/);
  if (bird) note('species', bird[1], bird[0]);
  if (/\b(small|mini|compact|tiny|little)\b/.test(t)) note('scale', 0.75, t.match(/\b(small|mini|compact|tiny|little)\b/)[0]);
  if (/\b(large|big|huge|giant|tall)\b/.test(t)) note('scale', 1.3, t.match(/\b(large|big|huge|giant|tall)\b/)[0]);
  if (/\b(cheap|budget|affordable|inexpensive)\b/.test(t)) note('tier', 'budget', t.match(/\b(cheap|budget|affordable|inexpensive)\b/)[0]);
  if (/\b(high end|high-end|best|ultimate|4k|enthusiast|premium)\b/.test(t)) note('tier', 'high', t.match(/\b(high end|high-end|best|ultimate|4k|enthusiast|premium)\b/)[0]);
  if (/\bshelf\b|\blower shelf\b/.test(t)) note('shelf', true, 'shelf');
  const proj = t.match(/water balloon|golf ball|tennis ball/);
  if (proj) note('projectile', { 'water balloon': 'water balloon (250 g)', 'golf ball': 'golf ball (46 g)', 'tennis ball': 'tennis ball (58 g)' }[proj[0]], proj[0]);
  if (/bluetooth|phone control|app control/.test(t)) note('mode', 'bluetooth', 'bluetooth');
  return out;
}
