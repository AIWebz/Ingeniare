import MODEL from './ai/model.js';
import { IngeniareAI } from './ai/engine.js';
import { CATEGORIES } from './ai/universal/categories.js';
import { FILAMENTS } from './ai/fabrication.js';
import { answer, tasksFor } from './ai/assistant.js';
import { Viewer } from './viewer/viewer.js';
import { icon } from './icons.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------- settings ----------------
const DEFAULTS = { theme: 'light', accent: '#ff7a1a', units: 'imperial', skill: 'intermediate', experts: true, quality: 'high', animSpeed: 1, grid: true, autoRotate: false, autoFocus: true, autoAdvance: true };
const ACCENTS = ['#ff7a1a', '#ff4d4d', '#2f80ed', '#10b981', '#8b5cf6', '#f5f5f5', '#2b2f36'];
let settings = { ...DEFAULTS, ...store.get('ingeniare.settings', {}) };
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const theme = () => (settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : settings.theme);
document.documentElement.dataset.theme = theme();

const MM = { mm: 1, cm: 10, in: 25.4 };
const fmtMm = (mm) => settings.units === 'metric' ? (mm >= 1000 ? `${(mm / 1000).toFixed(2)} m` : mm >= 100 ? `${(mm / 10).toFixed(1)} cm` : `${Math.round(mm)} mm`) : (() => { const i = mm / 25.4; return i >= 36 ? `${Math.floor(i / 12)}' ${Math.round(i % 12)}"` : `${Math.round(i * 8) / 8}"`; })();
const fmtCm = (cm) => fmtMm(cm * 10);

const ai = new IngeniareAI(MODEL);
const viewer = new Viewer($('#viewport'), { onPick: (id) => showPart(id), onHover, settings: { theme: theme(), quality: settings.quality, grid: settings.grid, animSpeed: settings.animSpeed, autoFocus: settings.autoFocus } });
let state = null, step = 0, lastPrompt = '', lastOpts = {}, projectId = null, progress = {};

// ---------------- toasts ----------------
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 2600); }

// ---------------- home ----------------
const IDEAS = ['A solar-powered boat with lights', 'A robot arm that sorts candy', 'A treehouse for my kids', 'An electric go kart', 'A smart automatic cat feeder', 'A bluetooth speaker', 'A backyard pizza oven', 'A rover with a camera'];
const CAT_EX = { furniture: 'A walnut standing desk', structure: 'A backyard shed', land_vehicle: 'An electric go kart', watercraft: 'A solar-powered boat with lights', aircraft: 'A foam RC airplane', robot: 'A robot dog with sensors', electronics: 'A retro bluetooth speaker', lighting: 'A neon sign for my room', machine: 'A small wind turbine', container: 'A planted aquarium', appliance: 'A backyard pizza oven', energy: 'An off-grid solar power system', instrument: 'An acoustic guitar', toy: 'A marble run for kids', wearable: 'Cosplay armor helmet' };
$$('[data-ic]').forEach((el) => { el.innerHTML = icon(el.dataset.ic); });
$('#heroIdeas').innerHTML = IDEAS.map((i) => `<button>${esc(i)}</button>`).join('');
$('#cats').innerHTML = Object.entries(CATEGORIES).map(([k, c]) => `<button class="cat" data-q="${esc(CAT_EX[k])}"><span class="ci">${icon(k)}</span><b>${esc(c.title)}</b><small>${esc(CAT_EX[k])}</small></button>`).join('');
function renderRecent() {
  const list = store.get('ingeniare.recent', []);
  $('#recent').innerHTML = list.length ? list.slice(0, 6).map((r, i) => `<button class="rp" data-i="${i}"><span class="ri">${icon(r.label || 'spark')}</span><span><b>${esc(r.title)}</b><small>${esc(r.prompt)} · ${r.done}/${r.total} tasks</small><span class="rbar"><i style="width:${r.total ? (r.done / r.total) * 100 : 0}%"></i></span></span></button>`).join('') : '<div class="empty">Your projects will appear here, with your build progress saved.</div>';
}
renderRecent();
function goHome() { document.body.classList.add('is-home'); state = null; viewer.clear(); renderRecent(); setTimeout(() => $('#heroPrompt').focus(), 50); }
$('#goHome').addEventListener('click', goHome);
$('#heroForm').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#heroPrompt').value.trim(); if (q) start(q); else $('#heroPrompt').focus(); });
$('#heroIdeas').addEventListener('click', (e) => { if (e.target.matches('button')) start(e.target.textContent); });
$('#cats').addEventListener('click', (e) => { const c = e.target.closest('.cat'); if (c) { $('#heroPrompt').value = c.dataset.q; $('#heroPrompt').focus(); } });
$('#recent').addEventListener('click', (e) => { const r = e.target.closest('.rp'); if (!r) return; const p = store.get('ingeniare.recent', [])[+r.dataset.i]; start(p.prompt, p.opts || {}); });

// ---------------- generate ----------------
const STAGES = ['Understanding your request', 'Choosing an engineering archetype', 'Sizing & selecting materials', 'Adding subsystems', 'Planning fabrication & 3D prints', 'Generating the 3D model'];
async function start(prompt, opts = {}) {
  lastPrompt = prompt; lastOpts = opts; $('#prompt').value = prompt;
  const L = $('#loader'); L.classList.remove('hidden');
  $('#loadSteps').innerHTML = STAGES.map((s) => `<li>${s}</li>`).join('');
  const lis = $$('#loadSteps li');
  let result;
  for (let i = 0; i < lis.length; i++) {
    lis[i].className = 'active';
    if (i === 1) result = ai.generate(prompt, { ...opts, settings });
    if (i === 1 && result) lis[i].textContent = `Archetype: ${result.domain}`;
    await sleep(150 + Math.random() * 90);
    lis[i].className = 'done';
  }
  state = result; projectId = `${prompt.toLowerCase()}|${state.label}`;
  progress = store.get('ingeniare.progress', {})[projectId] || {};
  document.body.classList.remove('is-home');
  render(); goStep(firstOpenStep());
  L.classList.add('hidden');
  saveRecent();
}
function regen(extra = {}) {
  const keep = step;
  lastOpts = { ...lastOpts, forceLabel: state.label, overrides: { ...(lastOpts.overrides || {}), ...(extra.overrides || {}) } };
  state = ai.generate(lastPrompt, { ...lastOpts, settings });
  render(); goStep(Math.min(keep, state.plan.steps.length - 1), false);
  saveRecent();
}
function firstOpenStep() { const s = state.plan.steps.findIndex((st, i) => !stepComplete(i)); return s < 0 ? 0 : s; }
const taskList = (i) => tasksFor(state.plan.steps[i]);
const stepDone = (i) => progress[i] || [];
const stepComplete = (i) => { const t = taskList(i); return t.length > 0 && t.every((_, k) => stepDone(i)[k]); };
function counts() { let done = 0, total = 0; state.plan.steps.forEach((_, i) => { const t = taskList(i); total += t.length; done += t.filter((_, k) => stepDone(i)[k]).length; }); return { done, total }; }
function saveProgress() { const all = store.get('ingeniare.progress', {}); all[projectId] = progress; store.set('ingeniare.progress', all); saveRecent(); }
function saveRecent() {
  if (!state) return;
  const { done, total } = counts();
  const list = store.get('ingeniare.recent', []).filter((r) => r.id !== projectId);
  list.unshift({ id: projectId, prompt: lastPrompt, opts: lastOpts, title: state.title, label: state.label, done, total, t: Date.now() });
  store.set('ingeniare.recent', list.slice(0, 12));
}

const setRangeFill = (el) => { const p = ((el.value - el.min) / (el.max - el.min || 1)) * 100; el.style.setProperty('--p', p + '%'); };
const scaleMm = () => MM[state.plan.geomUnit] || 10;

function render() {
  const { intent, plan, extracted, mode, label } = state;
  viewer.applySettings({ fmt: (v) => fmtMm(v * scaleMm()) });
  $('#modeBadge').textContent = mode === 'expert' ? 'Expert template' : label === 'custom' ? 'Custom invention' : 'Universal designer';
  $('#intent').innerHTML = intent.ranked.slice(0, 4).map((r, i) => `<div class="bar ${r.label === label || (mode === 'expert' && i === 0) ? 'top' : ''}" data-label="${r.label}" title="Re-design as ${esc(r.title)}"><span class="ico">${icon(r.label)}</span><span class="name">${esc(r.title)}</span><span class="pct">${(r.p * 100).toFixed(1)}%</span><div class="track"><div class="fill" style="width:${(r.p * 100).toFixed(1)}%"></div></div></div>`).join('')
    + (label === 'custom' ? '<div class="tag" style="margin-top:8px">No close archetype — inventing a <b>custom modular design</b>. Tap a category to steer it.</div>' : '');
  $('#extracted').innerHTML = extracted.found.length ? extracted.found.map((f) => `<span class="tag">${esc(f.key)}: <b>${esc(typeof f.value === 'number' ? +f.value.toFixed(2) : f.value)}</b></span>`).join('') : '<span class="tag">Engineered default proportions</span>';
  $('#featCard').classList.toggle('hidden', mode !== 'universal');
  if (mode === 'universal') $('#features').innerHTML = state.allFeatures.map((f) => `<button class="chip ${state.features.includes(f.key) ? 'on' : ''}" data-f="${f.key}">${esc(f.label)}</button>`).join('');
  $('#params').innerHTML = state.paramSpecs.map((p) => {
    const v = state.params[p.key];
    if (p.type === 'select') return `<div class="param"><label>${esc(p.label)}</label><select data-k="${p.key}">${p.options.map((o) => `<option value="${esc(o)}" ${String(v) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    const shown = p.type === 'length' ? fmtCm(v) : `${v} ${p.unit || ''}`;
    return `<div class="param"><label>${esc(p.label)} <b data-out="${p.key}">${esc(shown)}</b></label><input type="range" data-k="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}"></div>`;
  }).join('');
  $$('#params input[type=range]').forEach(setRangeFill);
  const g = plan.fabGroups || {};
  const FAB = [['print', 'printer', '3D printed'], ['cut', 'saw', 'Cut / built'], ['metal', 'gear', 'Metalwork'], ['sew', 'needle', 'Sewn'], ['buy', 'cart', 'Bought']];
  $('#fabSummary').innerHTML = FAB.filter(([k]) => g[k]?.length).map(([k, ic, l]) => `<div data-g="${k}"><span>${icon(ic)}${l}</span><b>${g[k].length}</b></div>`).join('');
  $('#planHead').innerHTML = `<h2><span class="ico">${icon(state.label)}</span><span>${esc(state.title)}<span class="dom">${esc(state.domain)}</span></span></h2>
    <div class="stats"><div class="stat"><small>Time</small><b>${esc(plan.time)}</b></div><div class="stat"><small>Cost</small><b>${esc(plan.cost)}</b></div><div class="stat"><small>Level</small><b>${esc(plan.difficulty)}</b></div></div><p>${esc(plan.summary)}</p>`;
  renderBom();
  $('#tools').innerHTML = plan.tools.map((t) => `<li>${esc(t)}</li>`).join('');
  $('#cutCard').classList.toggle('hidden', !plan.cutList);
  $('#cuts').innerHTML = (plan.cutList || []).map((t) => `<li>${esc(t)}</li>`).join('');
  viewer.load(plan);
  viewer.setAutoRotate(settings.autoRotate); $('#rotate').classList.toggle('on', settings.autoRotate);
  $('#qaOut').innerHTML = '';
  $('#qaSuggest').innerHTML = ['How long will this take?', g.print?.length ? 'What filament should I use?' : 'What tools do I need?', 'What sizes are these parts?', 'Is this step safe?', 'What comes next?'].map((q) => `<button class="chip">${q}</button>`).join('');
}

function printCard(p) {
  const s = p.fab.settings;
  let stats = '';
  try {
    const st = viewer.partStats(p.id, scaleMm());
    const infill = parseInt(s.infill) / 100, frac = Math.min(1, 0.3 + infill * 0.7);
    const grams = st.volumeCm3 * FILAMENTS[s.filament].density * frac;
    const hours = grams / (s.nozzle.startsWith('0.6') ? 20 : 11);
    stats = `<div class="meta"><span><small>Size</small>${st.size.map((v) => Math.round(v)).join('×')} mm</span><span><small>Filament</small>≈ ${Math.max(1, Math.round(grams))} g ${s.filament}</span><span><small>Print time</small>≈ ${hours >= 1 ? Math.floor(hours) + ' h ' : ''}${Math.round((hours % 1) * 60)} min</span></div>`;
  } catch {}
  return `<div class="pcard" data-id="${p.id}"><div class="ph"><span>${esc(p.name)} <span class="muted">×${p.qty}</span></span><button class="btn-primary sm" data-stl="${p.id}">${icon('download')}STL</button></div>${stats}
    <div class="set">${s.layer} layers · ${s.walls} walls · ${s.infill} · ${esc(s.supports)} · ${esc(s.temps)}${p.fab.sections > 1 ? ` · split into ${p.fab.sections} sections` : ''}</div></div>`;
}
function renderBom() {
  const { plan } = state; const g = plan.fabGroups || {};
  const byId = Object.fromEntries(plan.parts.map((p) => [p.id, p]));
  const NAMES = { print: '3D print these', cut: 'Cut / build', metal: 'Metalwork', sew: 'Sew', buy: 'Buy these' };
  $('#bom').innerHTML = ['print', 'cut', 'metal', 'sew', 'buy'].filter((k) => g[k]?.length).map((k) => `<div class="group-h" id="grp-${k}"><span>${NAMES[k]}</span><span>${g[k].length}</span></div>` + g[k].map((id) => {
    const p = byId[id];
    if (k === 'print') return printCard(p);
    return `<div class="card part" data-id="${p.id}"><div class="ph"><span>${esc(p.name)}</span><span class="qty">×${p.qty}</span></div><div class="spec">${esc(p.spec)}</div>${p.tip ? `<div class="tip">${esc(p.tip)}</div>` : ''}</div>`;
  }).join('')).join('');
}

function goStep(i, animate = true) {
  const steps = state.plan.steps;
  step = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[step];
  const byId = Object.fromEntries(state.plan.parts.map((p) => [p.id, p]));
  const added = [...new Set((s.add || []).map((a) => a.part))];
  const tasks = taskList(step), done = stepDone(step);
  $('#stepCard').innerHTML = `<h3><span class="num">${step + 1}</span>${esc(s.title)}</h3>
    <div class="lead2">Tick each task as you complete it.</div>
    <ul class="tasks">${tasks.map((t, k) => `<li class="${done[k] ? 'ok' : ''}" data-k="${k}"><i class="cb"></i><span>${esc(t)}</span></li>`).join('')}</ul>`
    + (s.kind === 'print' ? `<div class="print-list">${(s.printParts || []).map((id) => printCard(byId[id])).join('')}</div>` : '')
    + (s.details?.length ? `<div class="tips"><b>${s.kind ? 'Details' : 'Pro tips'}</b><ul>${s.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>` : '')
    + (s.warn ? `<div class="warn">${icon('alert')}<span>${esc(s.warn)}</span></div>` : '')
    + (s.code ? `<pre><code>${esc(s.code)}</code></pre><button class="btn-ghost sm" id="copyCode">Copy code</button>` : '')
    + (added.length ? `<div class="adds">${added.map((id) => `<button class="chip" data-id="${id}">${esc(byId[id].name)} ×${s.add.filter((a) => a.part === id).length}</button>`).join('')}</div>` : '')
    + (stepComplete(step) ? `<div class="step-done">${icon('check')}Step complete</div>` : '');
  $('#stepList').innerHTML = steps.map((st, k) => `<li data-i="${k}" data-n="${k + 1}" class="${k === step ? 'cur' : stepComplete(k) ? 'done' : ''}">${esc(st.title)}</li>`).join('');
  const { done: d, total } = counts();
  $('#progBar').style.width = `${total ? (d / total) * 100 : 0}%`; $('#progTxt').textContent = `${Math.round(total ? (d / total) * 100 : 0)}%`;
  $('#next').textContent = step === steps.length - 1 ? 'Finish' : 'Next step →';
  $('#copyCode')?.addEventListener('click', () => { navigator.clipboard?.writeText(s.code); toast('Code copied'); });
  $('#partTip').classList.add('hidden'); $('#qaOut').innerHTML = '';
  const chip = $('#stepChip'); chip.classList.remove('hidden'); chip.innerHTML = `<span>Step ${step + 1}/${steps.length}</span>${esc(s.title)}`;
  viewer.setStep(step, animate);
}

function toggleTask(k) {
  const arr = [...stepDone(step)]; arr[k] = !arr[k]; progress[step] = arr; saveProgress();
  const was = step; goStep(step, false);
  if (stepComplete(was) && arr[k] && settings.autoAdvance) { toast(`Step ${was + 1} complete`); if (was < state.plan.steps.length - 1) setTimeout(() => goStep(was + 1), 450); else toast('Build complete — nice work!'); }
}

function showPart(id) {
  const p = state.plan.parts.find((x) => x.id === id); if (!p) return;
  const tip = $('#partTip');
  tip.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(p.name)} × ${p.qty}</b><span class="method ${p.fab?.method === 'print' ? 'print' : ''}">${esc(p.fab?.label || '')}</span></div><div class="small" style="margin-top:4px">${esc(p.spec)}</div>${p.tip ? `<div class="small muted" style="margin-top:6px">${esc(p.tip)}</div>` : ''}${p.fab?.method === 'print' ? `<button class="btn-primary sm" style="margin-top:8px" data-stl="${p.id}">${icon('download')}Download STL</button>` : ''}`;
  tip.classList.remove('hidden');
  $$('#bom [data-id]').forEach((el) => el.classList.toggle('sel', el.dataset.id === id));
  viewer.highlightPart(id);
}
function onHover(id, e) {
  const tip = $('#hoverTip');
  if (!id || !state) return tip.classList.add('hidden');
  const p = state.plan.parts.find((x) => x.id === id); const r = $('#viewport').getBoundingClientRect();
  tip.innerHTML = `${esc(p.name)}<small>${esc(p.fab?.label || '')} · click for details</small>`;
  tip.style.left = `${e.clientX - r.left}px`; tip.style.top = `${e.clientY - r.top}px`; tip.classList.remove('hidden');
}

// ---------------- downloads ----------------
function download(name, blobOrUrl) { const a = document.createElement('a'); a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl); a.download = name; a.click(); }
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function downloadSTL(id) { const p = state.plan.parts.find((x) => x.id === id); download(`${slug(state.title)}-${slug(p.name)}.stl`, viewer.exportSTL(id, scaleMm())); toast(`${p.name}.stl downloaded — print ×${p.qty}`); }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-stl]'); if (b) { e.stopPropagation(); downloadSTL(b.dataset.stl); } }, true);
$('#btnExport').addEventListener('click', (e) => { e.stopPropagation(); $('#exportMenu').classList.toggle('hidden'); });
document.addEventListener('click', () => $('#exportMenu').classList.add('hidden'));
$('#exportMenu').addEventListener('click', async (e) => {
  const x = e.target.closest('button')?.dataset.x; if (!x || !state) return;
  const { plan } = state;
  if (x === 'png') { download(`${slug(state.title)}-step${step + 1}.png`, viewer.screenshot()); toast('Screenshot saved'); }
  if (x === 'glb') { download(`${slug(state.title)}.glb`, await viewer.exportGLB()); toast('3D model exported (.glb)'); }
  if (x === 'stl') { const ids = plan.fabGroups?.print || []; if (!ids.length) return toast('This design has no 3D-printed parts'); for (const id of ids) { downloadSTL(id); await sleep(250); } }
  if (x === 'md') {
    const md = [`# ${state.title}`, '', plan.summary, '', `**Level:** ${plan.difficulty} · **Time:** ${plan.time} · **Cost:** ${plan.cost}`, '', '## What you need', '| Qty | Item | How it is made | Type / specification |', '|---|---|---|---|',
      ...plan.parts.map((p) => `| ${p.qty} | ${p.name} | ${p.fab?.label || ''} | ${p.spec} |`), '', '## Tools', ...plan.tools.map((t) => `- ${t}`), '',
      ...(plan.cutList ? ['## Cut list', ...plan.cutList.map((c) => `- ${c}`), ''] : []), '## Steps',
      ...plan.steps.flatMap((s, i) => [`### ${i + 1}. ${s.title}`, ...tasksFor(s).map((t) => `- [ ] ${t}`), ...(s.details || []).map((d) => `  - ${d}`), ...(s.warn ? [`> Warning: ${s.warn}`] : []), ...(s.code ? ['```cpp', s.code, '```'] : []), '']),
      '_Generated by Ingeniare._'].join('\n');
    download(`${slug(state.title)}.md`, new Blob([md], { type: 'text/markdown' })); toast('Instructions exported');
  }
});

// ---------------- events ----------------
$('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#prompt').value.trim(); if (q) start(q); });
$('#intent').addEventListener('click', (e) => { const b = e.target.closest('.bar'); if (b) start(lastPrompt, { forceLabel: b.dataset.label }); });
$('#features').addEventListener('click', (e) => { const k = e.target.dataset.f; if (!k) return; const set = new Set(state.features); set.has(k) ? set.delete(k) : set.add(k); regen({ overrides: { features: [...set].join(',') } }); toast(`${set.has(k) ? 'Added' : 'Removed'} ${e.target.textContent.toLowerCase()}`); });
$('#params').addEventListener('input', (e) => {
  const el = e.target; if (!el.dataset.k || el.type !== 'range') return; setRangeFill(el);
  const spec = state.paramSpecs.find((p) => p.key === el.dataset.k); $(`[data-out="${el.dataset.k}"]`).textContent = spec.type === 'length' ? fmtCm(+el.value) : `${el.value} ${spec.unit || ''}`;
});
$('#params').addEventListener('change', (e) => { const k = e.target.dataset.k; if (k) regen({ overrides: { ...state.params, [k]: e.target.value } }); });
$('#fabSummary').addEventListener('click', (e) => { const d = e.target.closest('[data-g]'); if (!d) return; $('#tabs [data-tab="parts"]').click(); document.getElementById('grp-' + d.dataset.g)?.scrollIntoView({ behavior: 'smooth' }); });
$('#prev').addEventListener('click', () => goStep(step - 1));
$('#next').addEventListener('click', () => { if (step === state.plan.steps.length - 1) { toast('Build complete — nice work!'); return; } goStep(step + 1); });
$('#prev3d').addEventListener('click', () => goStep(step - 1)); $('#next3d').addEventListener('click', () => goStep(step + 1));
$('#stepList').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) goStep(+li.dataset.i); });
$('#stepCard').addEventListener('click', (e) => { const li = e.target.closest('.tasks li'); if (li) return toggleTask(+li.dataset.k); if (e.target.dataset.id) showPart(e.target.dataset.id); });
$('#bom').addEventListener('click', (e) => { const el = e.target.closest('[data-id]'); if (el) showPart(el.dataset.id); });
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b)); $$('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== 'tab-' + b.dataset.tab)); });
$('#qaForm').addEventListener('submit', (e) => { e.preventDefault(); ask($('#qaInput').value); });
$('#qaSuggest').addEventListener('click', (e) => { if (e.target.matches('.chip')) { $('#qaInput').value = e.target.textContent; ask(e.target.textContent); } });
function ask(q) { if (!q.trim() || !state) return; const a = answer(q, state, step); $('#qaOut').innerHTML = `<div>${esc(a.text)}</div>${a.list ? `<ul>${a.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`; }
$('#explode').addEventListener('input', (e) => { setRangeFill(e.target); viewer.setExplode(+e.target.value); }); setRangeFill($('#explode'));
const toggle = (id, fn) => $(id).addEventListener('click', (e) => { const b = e.currentTarget; b.classList.toggle('on'); fn(b.classList.contains('on')); });
toggle('#ghost', (on) => viewer.setGhost(on)); toggle('#rotate', (on) => viewer.setAutoRotate(on)); toggle('#wire', (on) => viewer.setWireframe(on));
$('#btnFocus').addEventListener('click', () => viewer.focusStep(step)); $('#btnReset').addEventListener('click', () => viewer.resetView());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $$('.modal').forEach((m) => m.classList.add('hidden')); $('#exportMenu').classList.add('hidden'); return; }
  if (e.target.matches('input,select,textarea')) return;
  if (e.key === '?') return $('#help').classList.remove('hidden');
  if (!state) return;
  const k = e.key.toLowerCase();
  if (e.key === 'ArrowRight') goStep(step + 1); else if (e.key === 'ArrowLeft') goStep(step - 1);
  else if (e.key === ' ') { e.preventDefault(); const d = stepDone(step); const n = taskList(step).findIndex((_, i) => !d[i]); if (n >= 0) toggleTask(n); }
  else if (k === 'f') viewer.focusStep(step); else if (k === '0') viewer.resetView();
  else if (k === 'e') { const x = $('#explode'); x.value = +x.value > 0 ? 0 : 0.6; x.dispatchEvent(new Event('input')); }
  else if (k === 'g') $('#ghost').click(); else if (k === 'r') $('#rotate').click(); else if (k === 'w') $('#wire').click();
  else if (k === '/') { e.preventDefault(); $('#qaInput').focus(); }
});

// ---------------- settings ----------------
const about = `On-device neural network (${esc(MODEL.meta.arch)}) trained on ${MODEL.meta.examples.toLocaleString()} example requests (validation ${(MODEL.meta.valAcc * 100).toFixed(1)}%), plus a head-noun detector, a procedural 3D designer with ${MODEL.labels.length} archetypes and 22 subsystems, and a fabrication planner that decides what to 3D print, cut, weld, sew or buy. Everything runs offline.`;
$('#aboutAI').innerHTML = about;
$('[data-set="accent"]').innerHTML = ACCENTS.map((c) => `<button data-v="${c}" style="background:${c}" title="${c}"></button>`).join('');
function syncSettingsUI() {
  $$('.seg[data-set], .swatches[data-set]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(settings[g.dataset.set]))));
  $$('input[type=checkbox][data-set]').forEach((i) => { i.checked = !!settings[i.dataset.set]; });
  $$('input[type=range][data-set]').forEach((i) => { i.value = settings[i.dataset.set]; setRangeFill(i); });
}
function updateSetting(key, value) {
  settings[key] = value; store.set('ingeniare.settings', settings); syncSettingsUI();
  if (key === 'theme') { document.documentElement.dataset.theme = theme(); viewer.applySettings({ theme: theme() }); if (state) { viewer.load(state.plan); viewer.setStep(step, false); } }
  if (['quality', 'grid', 'animSpeed', 'autoFocus'].includes(key)) viewer.applySettings({ [key]: value });
  if (key === 'autoRotate') { viewer.setAutoRotate(value); $('#rotate').classList.toggle('on', value); }
  if (['units', 'skill', 'accent'].includes(key) && state) regen();
  if (key === 'experts' && state) start(lastPrompt);
}
mq.addEventListener?.('change', () => { if (settings.theme === 'system') updateSetting('theme', 'system'); });
$('#settings').addEventListener('click', (e) => { const b = e.target.closest('[data-set] button'); if (b) updateSetting(b.parentElement.dataset.set, b.dataset.v); });
$('#settings').addEventListener('change', (e) => { const k = e.target.dataset.set; if (k) updateSetting(k, e.target.type === 'checkbox' ? e.target.checked : +e.target.value); });
$('#settings').addEventListener('input', (e) => { if (e.target.type === 'range') setRangeFill(e.target); });
$$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.classList.add('hidden'); }));
$('#btnSettings').addEventListener('click', () => { syncSettingsUI(); $('#settings').classList.remove('hidden'); });
$('#btnHelp').addEventListener('click', () => $('#help').classList.remove('hidden'));
$('#clearRecent').addEventListener('click', () => { store.set('ingeniare.recent', []); store.set('ingeniare.progress', {}); renderRecent(); toast('History cleared'); });
$('#resetSettings').addEventListener('click', () => { settings = { ...DEFAULTS }; store.set('ingeniare.settings', settings); syncSettingsUI(); document.documentElement.dataset.theme = theme(); viewer.applySettings({ theme: theme(), quality: settings.quality, grid: settings.grid, animSpeed: settings.animSpeed, autoFocus: settings.autoFocus }); if (state) regen(); toast('Settings reset'); });
