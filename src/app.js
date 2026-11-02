import MODEL from './ai/model.js';
import { IngeniareAI } from './ai/engine.js';
import { Viewer } from './viewer/viewer.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ai = new IngeniareAI(MODEL);
const viewer = new Viewer($('#viewport'), { onPick: (id) => showPart(id) });
let state = null; let step = 0; let lastPrompt = '';

const EXAMPLES = [
  'Build a 6 ft tall oak bookshelf with 5 shelves',
  'Arduino robot car that avoids obstacles',
  '5 inch FPV drone',
  'Gaming PC under $1500',
  '4x8 cedar raised garden bed',
  'Warm white dimmable desk lamp',
  'Solar phone charger 10W 12000mAh',
  'Birdhouse for bluebirds',
  'Trebuchet that throws water balloons',
  'Garage workbench 8 ft long',
];
$('#examples').innerHTML = EXAMPLES.map((e) => `<button class="chip">${esc(e)}</button>`).join('');
$('#examples').addEventListener('click', (e) => { if (e.target.matches('.chip')) { $('#prompt').value = e.target.textContent; run(); } });
$('#modelInfo').innerHTML = `<b>On-device AI:</b> ${esc(MODEL.meta.arch)} trained on ${MODEL.meta.examples.toLocaleString()} examples · validation ${(MODEL.meta.valAcc * 100).toFixed(1)}% · held-out ${(MODEL.meta.evalAcc * 100).toFixed(0)}%. Runs fully offline — nothing leaves your computer.`;

$('#btnGen').addEventListener('click', () => run());
$('#prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } });

function run(opts = {}) {
  const prompt = $('#prompt').value.trim();
  if (!prompt) return;
  lastPrompt = prompt;
  state = ai.generate(prompt, opts);
  render();
}

function render() {
  const { intent, plan, blueprint, params, extracted, label } = state;
  $('#empty').classList.add('hidden');
  $('#insight').classList.remove('hidden'); $('#paramsCard').classList.remove('hidden');
  $('#intent').innerHTML = intent.ranked.slice(0, 4).map((r) => `<div class="bar" data-label="${r.label}" title="Use this design"><span>${r.icon}</span><div class="track"><div class="fill" style="width:${(r.p * 100).toFixed(1)}%"></div></div><span>${(r.p * 100).toFixed(1)}%</span><span class="name">${esc(r.title)}${r.label === label ? ' ✓' : ''}</span></div>`).join('');
  $('#extracted').innerHTML = extracted.found.length ? 'Understood: ' + extracted.found.map((f) => `<b>${esc(f.key)}</b>=${esc(typeof f.value === 'number' ? +f.value.toFixed(2) : f.value)} <i>("${esc(f.source)}")</i>`).join(', ') : 'No explicit dimensions found — using engineered defaults (adjust below).';
  const ood = $('#oodNote');
  if (!intent.inDomain) { ood.classList.remove('hidden'); ood.innerHTML = `I'm not confident this matches one of my trained engineering domains. Showing the closest design (<b>${esc(blueprint.title)}</b>). Click another bar above to switch, or rephrase.`; } else ood.classList.add('hidden');
  $('#params').innerHTML = blueprint.params.map((p) => p.type === 'select'
    ? `<div class="param"><label>${esc(p.label)}</label><select data-k="${p.key}">${p.options.map((o) => `<option ${String(params[p.key]) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`
    : `<div class="param"><label>${esc(p.label)} <span>${params[p.key]} ${esc(p.unit || '')}</span></label><input type="range" data-k="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${params[p.key]}"></div>`).join('');
  $('#planHead').innerHTML = `<h2>${blueprint.icon} ${esc(blueprint.title)}</h2><div class="meta"><span>${esc(blueprint.domain)}</span><span>⏱ ${esc(plan.time)}</span><span>💲 ${esc(plan.cost)}</span><span>📈 ${esc(plan.difficulty)}</span><span>Units: ${blueprint.unit}</span></div><p>${esc(plan.summary)}</p>`;
  $('#bom').innerHTML = '<tr><th>Qty</th><th>Item</th><th>Exact specification</th></tr>' + plan.parts.map((p) => `<tr data-id="${p.id}"><td>${p.qty}</td><td>${esc(p.name)}</td><td>${esc(p.spec)}</td></tr>`).join('');
  $('#tools').innerHTML = plan.tools.map((t) => `<li>${esc(t)}</li>`).join('');
  $('#cuts').innerHTML = (plan.cutList || ['No cutting required — see Parts tab for purchasing.']).map((t) => `<li>${esc(t)}</li>`).join('');
  $('#stepList').innerHTML = plan.steps.map((s, i) => `<li data-i="${i}">${esc(s.title)}</li>`).join('');
  viewer.load(plan);
  goStep(0);
}

function goStep(i) {
  const steps = state.plan.steps;
  step = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[step];
  const partsById = Object.fromEntries(state.plan.parts.map((p) => [p.id, p]));
  const added = [...new Set((s.add || []).map((a) => a.part))];
  $('#stepCard').innerHTML = `<h3><span class="num">Step ${step + 1}</span>${esc(s.title)}</h3><div>${esc(s.text)}</div>`
    + (s.details?.length ? `<ul>${s.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '')
    + (s.warn ? `<div class="warn">⚠ ${esc(s.warn)}</div>` : '')
    + (s.code ? `<pre><code>${esc(s.code)}</code></pre><button id="copyCode">Copy code</button>` : '')
    + (added.length ? `<div class="adds">Highlighted in 3D: ${added.map((id) => `<b data-id="${id}">${esc(partsById[id].name)}</b> ×${s.add.filter((a) => a.part === id).length}`).join(', ')}</div>` : '');
  $('#stepCount').textContent = `${step + 1} / ${steps.length}`;
  [...$('#stepList').children].forEach((li, k) => { li.className = k === step ? 'cur' : k < step ? 'done' : ''; });
  $('#copyCode')?.addEventListener('click', () => navigator.clipboard?.writeText(s.code));
  $('#partTip').classList.add('hidden');
  viewer.setStep(step);
}

function showPart(id) {
  const p = state.plan.parts.find((x) => x.id === id); if (!p) return;
  const tip = $('#partTip');
  tip.innerHTML = `<b>${esc(p.name)}</b> × ${p.qty}<div class="small muted">${esc(p.spec)}</div>`;
  tip.classList.remove('hidden');
  document.querySelectorAll('#bom tr').forEach((tr) => tr.classList.toggle('sel', tr.dataset.id === id));
  viewer.highlightPart(id);
}

$('#params').addEventListener('input', (e) => {
  const k = e.target.dataset.k; if (!k) return;
  const span = e.target.parentElement.querySelector('label span'); if (span) span.textContent = e.target.value + ' ' + (state.blueprint.params.find((p) => p.key === k).unit || '');
});
$('#params').addEventListener('change', (e) => {
  const k = e.target.dataset.k; if (!k) return;
  const overrides = { ...state.params, [k]: e.target.value };
  state = ai.generate(lastPrompt, { forceLabel: state.label, overrides });
  const keep = step; render(); goStep(Math.min(keep, state.plan.steps.length - 1));
});
$('#intent').addEventListener('click', (e) => { const b = e.target.closest('.bar'); if (b) run({ forceLabel: b.dataset.label }); });
$('#prev').addEventListener('click', () => goStep(step - 1));
$('#next').addEventListener('click', () => goStep(step + 1));
$('#stepList').addEventListener('click', (e) => { if (e.target.dataset.i) goStep(+e.target.dataset.i); });
$('#stepCard').addEventListener('click', (e) => { if (e.target.dataset.id) showPart(e.target.dataset.id); });
$('#bom').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) showPart(tr.dataset.id); });
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== 'tab-' + b.dataset.tab));
}));
$('#explode').addEventListener('input', (e) => viewer.setExplode(+e.target.value));
$('#ghost').addEventListener('change', (e) => viewer.setGhost(e.target.checked));
$('#rotate').addEventListener('change', (e) => viewer.setAutoRotate(e.target.checked));
$('#wire').addEventListener('change', (e) => viewer.setWireframe(e.target.checked));
$('#btnReset').addEventListener('click', () => viewer.resetView());
document.addEventListener('keydown', (e) => { if (e.target.matches('textarea,input,select') || !state) return; if (e.key === 'ArrowRight') goStep(step + 1); if (e.key === 'ArrowLeft') goStep(step - 1); });

function download(name, href) { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }
$('#btnShot').addEventListener('click', () => state && download(`ingeniare-${state.label}-step${step + 1}.png`, viewer.screenshot()));
$('#btnExport').addEventListener('click', () => {
  if (!state) return;
  const { plan, blueprint } = state;
  const md = [`# ${blueprint.title}`, '', plan.summary, '', `**Difficulty:** ${plan.difficulty} · **Time:** ${plan.time} · **Cost:** ${plan.cost}`, '', '## Parts', '| Qty | Item | Specification |', '|---|---|---|',
    ...plan.parts.map((p) => `| ${p.qty} | ${p.name} | ${p.spec} |`), '', '## Tools', ...plan.tools.map((t) => `- ${t}`), '',
    ...(plan.cutList ? ['## Cut list', ...plan.cutList.map((c) => `- ${c}`), ''] : []), '## Steps',
    ...plan.steps.flatMap((s, i) => [`### ${i + 1}. ${s.title}`, s.text, ...(s.details || []).map((d) => `- ${d}`), ...(s.warn ? [`> ⚠ ${s.warn}`] : []), ...(s.code ? ['```cpp', s.code, '```'] : []), '']),
    '_Generated by Ingeniare._'].join('\n');
  download(`ingeniare-${state.label}.md`, URL.createObjectURL(new Blob([md], { type: 'text/markdown' })));
});

$('#prompt').value = EXAMPLES[0];
run();
