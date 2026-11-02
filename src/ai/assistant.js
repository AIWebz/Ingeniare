// Offline step assistant: answers questions about the current build using the
// generated plan (intent rules + keyword retrieval over every sentence in it).
import { tokenize, stem } from './features.js';

const sentences = (t) => String(t || '').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
export const tasksFor = (step) => sentences(step.text);

export function answer(q, state, stepIdx) {
  const { plan } = state; const step = plan.steps[stepIdx]; const ql = q.toLowerCase();
  const byId = Object.fromEntries(plan.parts.map((p) => [p.id, p]));
  const stepParts = [...new Set((step.add || []).map((a) => a.part))].map((id) => byId[id]).filter(Boolean);
  const printed = plan.parts.filter((p) => p.fab?.method === 'print');
  if (/\b(print|printer|filament|stl|slic|infill|layer|nozzle|pla|petg|asa|tpu)\b/.test(ql)) {
    if (!printed.length) return { text: 'No parts in this design need 3D printing — everything is cut, built or bought. You can still print small brackets or knobs if you prefer.' };
    return { text: `${printed.length} part${printed.length > 1 ? 's are' : ' is'} 3D printed. Download the STL files from the "What you need" tab (or the print step).`, list: printed.map((p) => `${p.name}: ${p.fab.settings.filament}, ${p.fab.settings.layer} layers, ${p.fab.settings.walls} walls, ${p.fab.settings.infill}, ${p.fab.settings.supports.toLowerCase()} (${p.fab.settings.temps}).`) };
  }
  if (/\b(how long|time|hours|minutes|days)\b/.test(ql)) return { text: `The whole build takes about ${plan.time}. This step is roughly ${Math.max(10, Math.round((step.text.length / 40) * 5))} minutes of work, plus any glue, paint or print time.` };
  if (/\b(cost|price|how much|expensive|cheap|budget)\b/.test(ql)) return { text: `Estimated total cost: ${plan.cost}. Save money by using offcuts, printing small parts yourself, and buying generic components that meet the same specification.` };
  if (/\b(safe|safety|danger|dangerous|careful|hurt|injur|protect)\b/.test(ql)) return { text: step.warn || 'Wear safety glasses, keep fingers clear of blades and moving parts, unplug tools before changing bits, and disconnect power before touching any wiring.' };
  if (/\b(size|dimension|how big|tall|wide|long|measure|length|width|height)\b/.test(ql) && stepParts.length) return { text: 'Sizes of the parts in this step:', list: stepParts.map((p) => `${p.name}: ${p.sizeMm ? p.sizeMm.join(' × ') + ' mm' : p.spec}`) };
  if (/\b(tool|tools|equipment|what do i need|need for this)\b/.test(ql)) return { text: 'For this project you need:', list: plan.tools.slice(0, 8) };
  if (/\b(instead|substitut|alternative|replace|swap|don'?t have)\b/.test(ql)) return { text: 'Substitutions that usually work: plywood ↔ solid wood (thicker), aluminium ↔ steel (lighter, weaker — use 1.5x the section), PETG ↔ ASA for printed parts, bolts ↔ rivets for sheet metal. Keep the same dimensions and load ratings and the design still works.' };
  if (/\b(why|reason|purpose|point)\b/.test(ql)) return { text: step.details?.[0] || `This step builds what later steps attach to. ${sentences(step.text).slice(-1)[0] || ''}` };
  if (/\b(next|after|then)\b/.test(ql)) { const nx = plan.steps[stepIdx + 1]; return { text: nx ? `Next: "${nx.title}" — ${sentences(nx.text)[0]}` : 'This is the last step — test it carefully and enjoy your build!' }; }
  // retrieval
  const qt = new Set(tokenize(q).map(stem));
  const docs = [];
  plan.steps.forEach((s, i) => [...sentences(s.text), ...(s.details || [])].forEach((t) => docs.push({ t, w: i === stepIdx ? 1.6 : 1, ref: `Step ${i + 1}` })));
  plan.parts.forEach((p) => { docs.push({ t: `${p.name}: ${p.spec}`, w: 1.2, ref: 'Parts' }); if (p.tip) docs.push({ t: p.tip, w: 1.1, ref: p.name }); });
  plan.tools.forEach((t) => docs.push({ t, w: 0.8, ref: 'Tools' }));
  const scored = docs.map((d) => ({ ...d, s: tokenize(d.t).map(stem).filter((w) => qt.has(w)).length * d.w })).filter((d) => d.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) return { text: `I couldn't find that in this plan. Try asking about time, cost, tools, sizes, safety, 3D printing, or what comes next. For this step: ${sentences(step.text)[0]}` };
  return { text: 'Here is what the plan says:', list: scored.slice(0, 3).map((d) => `${d.t} (${d.ref})`) };
}
