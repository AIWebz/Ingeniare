import MODEL from './ai/model.js';
import { IngeniareAI } from './ai/engine.js';
import { Viewer } from './viewer/viewer.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- settings ----------------
const DEFAULTS = { theme: 'light', accent: '#ff7a1a', units: 'imperial', skill: 'intermediate', experts: true, quality: 'high', animSpeed: 1, grid: true, autoRotate: false };
const ACCENTS = ['#ff7a1a', '#ff4d4d', '#2f80ed', '#10b981', '#8b5cf6', '#f5f5f5', '#2b2f36'];
let settings = { ...DEFAULTS };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ingeniare.settings') || '{}')); } catch {}
const saveSettings = () => { try { localStorage.setItem('ingeniare.settings', JSON.stringify(settings)); } catch {} };
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => (settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : settings.theme);
function applyTheme() { document.documentElement.dataset.theme = effectiveTheme(); }
applyTheme();
mq.addEventListener?.('change', () => { if (settings.theme === 'system') { applyTheme(); viewer.applySettings({ theme: effectiveTheme() }); } });

const ai = new IngeniareAI(MODEL);
const viewer = new Viewer($('#viewport'), { onPick: (id) => showPart(id), settings: { theme: effectiveTheme(), quality: settings.quality, grid: settings.grid, animSpeed: settings.animSpeed } });
let state = null, step = 0, lastPrompt = '', lastOpts = {};

const EXAMPLES = ['A solar-powered boat with lights', 'A treehouse for my kids', 'A robot arm that sorts candy', 'An electric go kart', 'A wind turbine for my cabin', 'A smart automatic cat feeder', 'A bluetooth speaker', 'A 6 ft tall oak bookshelf', 'A 5 inch FPV drone', 'A backyard pizza oven', 'An arcade cabinet', 'A time machine with a screen'];
$('#examples').innerHTML = EXAMPLES.map((e) => `<button class="chip">${esc(e)}</button>`).join('');
const aboutText = `On-device neural network (${esc(MODEL.meta.arch)}) trained on ${MODEL.meta.examples.toLocaleString()} example requests, combined with a head-noun detector and a procedural engineering designer covering ${MODEL.labels.length} archetypes plus open-ended custom designs. Validation accuracy ${(MODEL.meta.valAcc * 100).toFixed(1)}%. Everything runs offline — your ideas never leave this computer.`;
$('#modelInfo').innerHTML = aboutText; $('#aboutAI').innerHTML = aboutText;

// ---------------- generate ----------------
function run(opts = {}) {
  const prompt = $('#prompt').value.trim();
  if (!prompt) return;
  lastPrompt = prompt; lastOpts = opts;
  $('#busy').classList.remove('hidden');
  setTimeout(() => {
    try { state = ai.generate(prompt, { ...opts, settings }); render(); }
    finally { $('#busy').classList.add('hidden'); }
  }, 220);
}
function regen(extra = {}, keepStep = true) {
  const keep = step;
  state = ai.generate(lastPrompt, { ...lastOpts, forceLabel: state.label, ...extra, overrides: { ...(lastOpts.overrides || {}), ...(extra.overrides || {}) }, settings });
  lastOpts = { ...lastOpts, forceLabel: state.label, overrides: { ...(lastOpts.overrides || {}), ...(extra.overrides || {}) } };
  render(false); goStep(keepStep ? Math.min(keep, state.plan.steps.length - 1) : 0);
}

const fmtLen = (cm) => settings.units === 'metric' ? (cm >= 100 ? `${(cm / 100).toFixed(2)} m` : `${Math.round(cm)} cm`) : (cm / 2.54 >= 36 ? `${Math.floor(cm / 30.48)}' ${Math.round((cm / 2.54) % 12)}"` : `${Math.round(cm / 2.54 * 4) / 4}"`);
const setRangeFill = (el) => { const p = ((el.value - el.min) / (el.max - el.min || 1)) * 100; el.style.setProperty('--p', p + '%'); };

function render(reset = true) {
  const { intent, plan, extracted, mode, label } = state;
  $('#modeBadge').textContent = mode === 'expert' ? 'Expert template' : label === 'custom' ? 'Custom invention' : 'Universal designer';
  $('#intent').innerHTML = intent.ranked.slice(0, 4).map((r, i) => `<div class="bar ${r.label === label || (mode === 'expert' && i === 0) ? 'top' : ''}" data-label="${r.label}" title="Re-design as ${esc(r.title)}"><span class="ico">${r.icon}</span><span class="name">${esc(r.title)}</span><span class="pct">${(r.p * 100).toFixed(1)}%</span><div class="track"><div class="fill" style="width:${(r.p * 100).toFixed(1)}%"></div></div></div>`).join('')
    + (label === 'custom' ? '<div class="tag" style="margin-top:8px">No close archetype — Ingeniare is inventing a <b>custom modular design</b>. Tap a category to steer it.</div>' : '');
  $('#extracted').innerHTML = extracted.found.length ? extracted.found.map((f) => `<span class="tag">${esc(f.key)}: <b>${esc(typeof f.value === 'number' ? +f.value.toFixed(2) : f.value)}</b></span>`).join('') : '<span class="tag">Using engineered default proportions</span>';

  const featCard = $('#featCard');
  if (mode === 'universal') {
    featCard.classList.remove('hidden');
    $('#features').innerHTML = state.allFeatures.map((f) => `<button class="chip ${state.features.includes(f.key) ? 'on' : ''}" data-f="${f.key}">${esc(f.label)}</button>`).join('');
  } else featCard.classList.add('hidden');

  $('#params').innerHTML = state.paramSpecs.map((p) => {
    const v = state.params[p.key];
    if (p.type === 'select') return `<div class="param"><label>${esc(p.label)}</label><select data-k="${p.key}">${p.options.map((o) => `<option value="${esc(o)}" ${String(v) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    const shown = p.type === 'length' ? fmtLen(v) : `${v} ${p.unit || ''}`;
    return `<div class="param"><label>${esc(p.label)} <b data-out="${p.key}">${esc(shown)}</b></label><input type="range" data-k="${p.key}" data-type="${p.type}" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}"></div>`;
  }).join('');
  $$('#params input[type=range]').forEach(setRangeFill);

  $('#planHead').innerHTML = `<h2><span class="ico">${state.icon}</span><span>${esc(state.title)}<span class="dom">${esc(state.domain)}</span></span></h2>
    <div class="stats"><div class="stat"><small>Time</small><b>${esc(plan.time)}</b></div><div class="stat"><small>Cost</small><b>${esc(plan.cost)}</b></div><div class="stat"><small>Level</small><b>${esc(plan.difficulty)}</b></div></div><p>${esc(plan.summary)}</p>`;
  $('#bom').innerHTML = plan.parts.map((p) => `<div class="card part" data-id="${p.id}"><div class="ph"><span>${esc(p.name)}</span><span class="qty">×${p.qty}</span></div><div class="spec">${esc(p.spec)}</div>${p.tip ? `<div class="tip">${esc(p.tip)}</div>` : ''}</div>`).join('');
  $('#tools').innerHTML = plan.tools.map((t) => `<li>${esc(t)}</li>`).join('');
  $('#cutCard').classList.toggle('hidden', !plan.cutList);
  $('#cuts').innerHTML = (plan.cutList || []).map((t) => `<li>${esc(t)}</li>`).join('');
  $('#stepList').innerHTML = plan.steps.map((s, i) => `<li data-i="${i}" data-n="${i + 1}">${esc(s.title)}</li>`).join('');
  viewer.load(plan);
  viewer.setAutoRotate(settings.autoRotate); $('#rotate').classList.toggle('on', settings.autoRotate);
  if (reset) goStep(0);
}

function goStep(i) {
  const steps = state.plan.steps;
  step = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[step];
  const byId = Object.fromEntries(state.plan.parts.map((p) => [p.id, p]));
  const added = [...new Set((s.add || []).map((a) => a.part))];
  $('#stepCard').innerHTML = `<h3><span class="num">${step + 1}</span>${esc(s.title)}</h3><div>${esc(s.text)}</div>`
    + (s.details?.length ? `<ul>${s.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '')
    + (s.warn ? `<div class="warn">⚠ ${esc(s.warn)}</div>` : '')
    + (s.code ? `<pre><code>${esc(s.code)}</code></pre><button class="btn-ghost" id="copyCode">Copy code</button>` : '')
    + (added.length ? `<div class="adds">${added.map((id) => `<button class="chip" data-id="${id}">${esc(byId[id].name)} ×${s.add.filter((a) => a.part === id).length}</button>`).join('')}</div>` : '');
  $('#progBar').style.width = `${((step + 1) / steps.length) * 100}%`;
  $$('#stepList li').forEach((li, k) => { li.className = k === step ? 'cur' : k < step ? 'done' : ''; });
  $('#copyCode')?.addEventListener('click', () => navigator.clipboard?.writeText(s.code));
  $('#partTip').classList.add('hidden');
  const chip = $('#stepChip'); chip.classList.remove('hidden'); chip.innerHTML = `<span>Step ${step + 1}/${steps.length}</span>${esc(s.title)}`;
  viewer.setStep(step);
}

function showPart(id) {
  const p = state.plan.parts.find((x) => x.id === id); if (!p) return;
  const tip = $('#partTip');
  tip.innerHTML = `<b>${esc(p.name)}</b> × ${p.qty}<div class="small">${esc(p.spec)}</div>${p.tip ? `<div class="small muted" style="margin-top:6px">${esc(p.tip)}</div>` : ''}`;
  tip.classList.remove('hidden');
  $$('#bom .part').forEach((el) => el.classList.toggle('sel', el.dataset.id === id));
  viewer.highlightPart(id);
}

// ---------------- events ----------------
$('#askForm').addEventListener('submit', (e) => { e.preventDefault(); run(); });
$('#examples').addEventListener('click', (e) => { if (e.target.matches('.chip')) { $('#prompt').value = e.target.textContent; run(); } });
$('#intent').addEventListener('click', (e) => { const b = e.target.closest('.bar'); if (b) { lastOpts = {}; run({ forceLabel: b.dataset.label }); } });
$('#features').addEventListener('click', (e) => {
  const k = e.target.dataset.f; if (!k) return;
  const set = new Set(state.features); set.has(k) ? set.delete(k) : set.add(k);
  regen({ overrides: { features: [...set].join(',') } });
});
$('#params').addEventListener('input', (e) => {
  const el = e.target; if (!el.dataset.k || el.type !== 'range') return;
  setRangeFill(el);
  const out = $(`[data-out="${el.dataset.k}"]`); const spec = state.paramSpecs.find((p) => p.key === el.dataset.k);
  if (out) out.textContent = spec.type === 'length' ? fmtLen(+el.value) : `${el.value} ${spec.unit || ''}`;
});
$('#params').addEventListener('change', (e) => { const k = e.target.dataset.k; if (k) regen({ overrides: { ...state.params, [k]: e.target.value } }); });
$('#prev').addEventListener('click', () => goStep(step - 1)); $('#next').addEventListener('click', () => goStep(step + 1));
$('#prev3d').addEventListener('click', () => goStep(step - 1)); $('#next3d').addEventListener('click', () => goStep(step + 1));
$('#stepList').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) goStep(+li.dataset.i); });
$('#stepCard').addEventListener('click', (e) => { if (e.target.dataset.id) showPart(e.target.dataset.id); });
$('#bom').addEventListener('click', (e) => { const el = e.target.closest('.part'); if (el) showPart(el.dataset.id); });
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== 'tab-' + b.dataset.tab));
});
$('#explode').addEventListener('input', (e) => { setRangeFill(e.target); viewer.setExplode(+e.target.value); });
setRangeFill($('#explode'));
const toggle = (id, fn) => $(id).addEventListener('click', (e) => { const b = e.currentTarget; b.classList.toggle('on'); fn(b.classList.contains('on')); });
toggle('#ghost', (on) => viewer.setGhost(on)); toggle('#rotate', (on) => viewer.setAutoRotate(on)); toggle('#wire', (on) => viewer.setWireframe(on));
$('#btnReset').addEventListener('click', () => viewer.resetView());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettings();
  if (e.target.matches('input,select,textarea') || !state) return;
  if (e.key === 'ArrowRight') goStep(step + 1); if (e.key === 'ArrowLeft') goStep(step - 1);
});

function download(name, href) { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }
$('#btnShot').addEventListener('click', () => state && download(`ingeniare-${state.label}-step${step + 1}.png`, viewer.screenshot()));
$('#btnExport').addEventListener('click', () => {
  if (!state) return;
  const { plan } = state;
  const md = [`# ${state.title}`, '', plan.summary, '', `**Level:** ${plan.difficulty} · **Time:** ${plan.time} · **Cost:** ${plan.cost}`, '', '## What you need', '| Qty | Item | Type / specification | What to look for |', '|---|---|---|---|',
    ...plan.parts.map((p) => `| ${p.qty} | ${p.name} | ${p.spec} | ${(p.tip || '').replace(/^Look for:\s*/, '')} |`), '', '## Tools', ...plan.tools.map((t) => `- ${t}`), '',
    ...(plan.cutList ? ['## Cut list', ...plan.cutList.map((c) => `- ${c}`), ''] : []), '## Steps',
    ...plan.steps.flatMap((s, i) => [`### ${i + 1}. ${s.title}`, s.text, ...(s.details || []).map((d) => `- ${d}`), ...(s.warn ? [`> ⚠ ${s.warn}`] : []), ...(s.code ? ['```cpp', s.code, '```'] : []), '']),
    '_Generated by Ingeniare._'].join('\n');
  download(`ingeniare-${state.label}.md`, URL.createObjectURL(new Blob([md], { type: 'text/markdown' })));
});

// ---------------- settings UI ----------------
$('[data-set="accent"]').innerHTML = ACCENTS.map((c) => `<button data-v="${c}" style="background:${c}" title="${c}"></button>`).join('');
function syncSettingsUI() {
  $$('.seg[data-set], .swatches[data-set]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(settings[g.dataset.set]))));
  $$('input[type=checkbox][data-set]').forEach((i) => { i.checked = !!settings[i.dataset.set]; });
  $$('input[type=range][data-set]').forEach((i) => { i.value = settings[i.dataset.set]; setRangeFill(i); });
}
function updateSetting(key, value) {
  settings[key] = value; saveSettings(); syncSettingsUI();
  if (key === 'theme') { applyTheme(); viewer.applySettings({ theme: effectiveTheme() }); if (state) viewer.load(state.plan), viewer.setStep(step, false); }
  if (['quality', 'grid', 'animSpeed'].includes(key)) viewer.applySettings({ [key]: value });
  if (key === 'autoRotate') { viewer.setAutoRotate(value); $('#rotate').classList.toggle('on', value); }
  if (['units', 'skill', 'accent', 'experts'].includes(key) && state) {
    if (key === 'experts') { lastOpts = {}; run(); } else regen({}, true);
  }
}
$('#settings').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) return closeSettings();
  const b = e.target.closest('[data-set] button'); if (b) updateSetting(b.parentElement.dataset.set, b.dataset.v);
});
$('#settings').addEventListener('change', (e) => { const k = e.target.dataset.set; if (!k) return; updateSetting(k, e.target.type === 'checkbox' ? e.target.checked : +e.target.value); });
$('#settings').addEventListener('input', (e) => { if (e.target.type === 'range') setRangeFill(e.target); });
const openSettings = () => { syncSettingsUI(); $('#settings').classList.remove('hidden'); };
function closeSettings() { $('#settings').classList.add('hidden'); }
$('#btnSettings').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings); $('#doneSettings').addEventListener('click', closeSettings);
$('#resetSettings').addEventListener('click', () => { const prev = settings; settings = { ...DEFAULTS }; saveSettings(); syncSettingsUI(); applyTheme(); viewer.applySettings({ theme: effectiveTheme(), quality: settings.quality, grid: settings.grid, animSpeed: settings.animSpeed }); if (state) { lastOpts = {}; run(); } });

$('#prompt').value = EXAMPLES[0];
run();
