// Smoke tests: every blueprint generates a valid plan for many prompts/params.
import MODEL from '../src/ai/model.js';
import { IngeniareAI } from '../src/ai/engine.js';
import { BLUEPRINTS } from '../src/knowledge/blueprints/index.js';
import { extractParams } from '../src/ai/extract.js';

const ai = new IngeniareAI(MODEL);
let fail = 0;
const check = (cond, msg) => { if (!cond) { fail++; console.error('FAIL:', msg); } };

function validate(res, tag) {
  const { plan } = res;
  const ids = new Set(plan.parts.map((p) => p.id));
  check(plan.steps.length >= 4, `${tag}: too few steps`);
  for (const s of plan.steps) {
    check(s.title && s.text, `${tag}: empty step`);
    for (const a of s.add || []) {
      check(ids.has(a.part), `${tag}: step "${s.title}" adds unknown part ${a.part}`);
      check(a.p.every(Number.isFinite), `${tag}: non-finite position for ${a.part}`);
      check(plan.parts.find((x) => x.id === a.part)?.shape, `${tag}: part ${a.part} placed but has no shape`);
    }
  }
  const json = JSON.stringify(plan);
  check(!/NaN|undefined|Infinity/.test(json.replace(/"warn":undefined/g, '')), `${tag}: NaN/undefined in plan`);
}

const prompts = [
  ['build a 6 ft tall oak bookshelf with 6 shelves', 'bookshelf'], ['I need a sturdy workbench for my garage 8 ft long', 'workbench'],
  ['4x8 raised garden bed out of cedar', 'garden_bed'], ['birdhouse for wrens', 'birdhouse'], ['arduino robot car that avoids obstacles 4wd', 'robot_car'],
  ['warm white dimmable desk lamp', 'led_lamp'], ['solar phone charger 20W 12000mah', 'solar_charger'], ['gaming pc under $1000', 'pc'],
  ['7 inch long range fpv drone', 'drone'], ['trebuchet that throws water balloons', 'trebuchet'], ['make me a catapult for physics class with 20 lb counterweight', 'trebuchet'],
];
for (const [p, want] of prompts) {
  const r = ai.generate(p);
  check(r.label === want, `"${p}" -> ${r.label} (${(r.intent.ranked[0].p * 100).toFixed(0)}%), wanted ${want}`);
  validate(r, p);
  console.log(`${r.label.padEnd(14)} ${(r.intent.ranked[0].p * 100).toFixed(1).padStart(5)}%  ${JSON.stringify(r.params)}  <- "${p}"`);
}
for (const [id, bp] of Object.entries(BLUEPRINTS)) {
  for (const spec of bp.params) {
    const vals = spec.type === 'select' ? spec.options : [spec.min, spec.default, spec.max];
    for (const v of vals) validate(ai.generate('x', { forceLabel: id, overrides: { [spec.key]: v } }), `${id}.${spec.key}=${v}`);
  }
}
const ex = extractParams('a 6 ft tall, 30 inch wide pine bookshelf with 5 shelves');
check(ex.height === 72 && ex.width === 30 && ex.count === 5 && ex.material === 'pine', 'extractor basic ' + JSON.stringify(ex));
const ood = ai.classify('bake a chocolate cake');
console.log('out-of-domain check:', ood.inDomain ? 'in-domain' : 'flagged out-of-domain', ood.ranked[0].label, ood.ranked[0].p.toFixed(2));
console.log(fail ? `${fail} FAILURES` : 'ALL TESTS PASSED');
process.exit(fail ? 1 : 0);
