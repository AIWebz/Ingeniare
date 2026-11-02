export const WOOD_COLORS = { pine: '#e3c08d', oak: '#c49a6c', poplar: '#d9cf9c', walnut: '#6b4a2f', maple: '#e8d1a7', plywood: '#e6cfa0', birch: '#e6cfa0', cedar: '#b8693f', mdf: '#b89b72', cherry: '#a0522d', redwood: '#a4442a' };

// Format inches to the nearest 1/16" as a tape-measure reading, e.g. 34-1/4"
export function fin(x) {
  const neg = x < 0; x = Math.abs(x);
  let whole = Math.floor(x), frac = Math.round((x - whole) * 16);
  if (frac === 16) { whole++; frac = 0; }
  let n = frac, d = 16;
  while (n && n % 2 === 0) { n /= 2; d /= 2; }
  const s = frac ? (whole ? `${whole}-${n}/${d}"` : `${n}/${d}"`) : `${whole}"`;
  return (neg ? '-' : '') + s;
}
export const ftin = (x) => (x >= 12 ? `${Math.floor(x / 12)}' ${fin(x % 12)}` : fin(x));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const r1 = (x) => Math.round(x * 10) / 10;
export const r2 = (x) => Math.round(x * 100) / 100;
export const usd = (x) => '$' + Math.round(x).toLocaleString('en-US');

// First-fit-decreasing bin packing of cut lengths into stock boards (with saw kerf).
export function packBoards(lengths, stock = 96, kerf = 0.125) {
  const bins = [];
  for (const L of [...lengths].sort((a, b) => b - a)) {
    if (L > stock) { bins.push({ used: L, cuts: [L], over: true }); continue; }
    const bin = bins.find((b) => !b.over && b.used + kerf + L <= stock);
    if (bin) { bin.used += kerf + L; bin.cuts.push(L); } else bins.push({ used: L, cuts: [L] });
  }
  return bins;
}
export function cutPlan(bins, stockName) {
  return bins.map((b, i) => `${stockName} #${i + 1}: ${b.cuts.map(fin).join(' + ')} (offcut ${fin(Math.max(0, 96 - b.used))})`);
}
