// Tests: classifier accuracy, expert templates, and the universal designer on many arbitrary requests.
import MODEL from '../src/ai/model.js';
import { IngeniareAI } from '../src/ai/engine.js';
import { BLUEPRINTS } from '../src/knowledge/blueprints/index.js';
import { extractParams } from '../src/ai/extract.js';
import { CATEGORIES } from '../src/ai/universal/categories.js';

const ai = new IngeniareAI(MODEL);
let fail = 0;
const check = (cond, msg) => { if (!cond) { fail++; console.error('FAIL:', msg); } };
const BRANDS = /\b(Kreg|Titebond|Minwax|SPAX|GRK|Watco|Samsung|Molicel|TowerPro|SpeedyBee|HQProp|RadioMaster|Caddx|RushFPV|Corsair|Thermalright|MSI|ASUS|Ryzen|Radeon|GeForce|RTX|Betaflight)\b/;

function validate(res, tag) {
  const { plan } = res;
  const ids = new Set(plan.parts.map((p) => p.id));
  check(plan.steps.length >= 3, `${tag}: too few steps`);
  for (const s of plan.steps) {
    check(s.title && s.text, `${tag}: empty step ${s.title}`);
    for (const a of s.add || []) {
      check(ids.has(a.part), `${tag}: unknown part ${a.part}`);
      check(a.p.every(Number.isFinite), `${tag}: non-finite position for ${a.part}`);
      check(plan.parts.find((x) => x.id === a.part)?.shape, `${tag}: part ${a.part} has no shape`);
    }
  }
  const json = JSON.stringify(plan);
  check(!/NaN|Infinity/.test(json) && !/"undefined|undefined"/.test(json), `${tag}: NaN/undefined in plan`);
  check(!BRANDS.test(json), `${tag}: brand name found: ${json.match(BRANDS)?.[0]}`);
  check(plan.steps.some((s) => s.add?.length), `${tag}: no 3D parts`);
}

const anything = ['build a time machine', 'a solar powered boat with lights', 'an electric go kart', 'a treehouse with a slide', 'a humanoid robot', 'a robot arm that sorts candy',
  'a wind turbine for my cabin', 'a bluetooth speaker', 'a cedar strip canoe', 'a hot air balloon', 'a water rocket', 'a 3d printer', 'an aquarium', 'a pizza oven', 'a guitar', 'a drum',
  'a marble run', 'an arcade cabinet', 'a backpack with solar panel', 'a helmet', 'a greenhouse', 'a bridge over a creek', 'a fence', 'an rc submarine', 'a hovercraft', 'a jetpack',
  'a perpetual motion machine', 'a coffee maker', 'a smart mirror', 'a neon sign', 'a floor lamp', 'a crane', 'a water wheel', 'a dog house', 'a standing desk', 'a sofa', 'a bed', 'a chair',
  'a smart automatic cat feeder', 'a self driving lawn mower', 'an underwater drone with camera', 'a flying car', 'a skateboard', 'a bicycle', 'a robot dog', 'a mech suit', 'a kite', 'a satellite'];
for (const q of anything) {
  const r = ai.generate(q, { settings: { units: 'metric' } });
  validate(r, q);
  console.log(`${r.mode.padEnd(9)} ${r.label.padEnd(13)} ${(r.intent.ranked[0].p * 100).toFixed(0).padStart(3)}%  ${r.title}  [${(r.features || []).join(',')}]  <- "${q}"`);
}
for (const id of Object.keys(CATEGORIES).concat('custom')) for (const units of ['metric', 'imperial']) for (const skill of ['beginner', 'expert']) validate(ai.generate('something with motor lights solar wheels sensor camera speaker screen remote propeller wings pump fan heater arm roof handle lock waterproof insulated', { forceLabel: id, settings: { units, skill } }), `${id}-${units}-${skill}`);
for (const [id, bp] of Object.entries(BLUEPRINTS)) for (const spec of bp.params) for (const v of spec.type === 'select' ? spec.options : [spec.min, spec.default, spec.max]) validate(ai.generate('x', { forceLabel: id, overrides: { [spec.key]: v } }), `${id}.${spec.key}=${v}`);
const experts = [['build a 6 ft tall oak bookshelf with 6 shelves', 'bookshelf'], ['5 inch fpv drone', 'drone'], ['gaming pc under $1000', 'pc'], ['trebuchet that throws water balloons', 'trebuchet']];
for (const [q, id] of experts) check(ai.generate(q).label === id, `expert routing for "${q}"`);
const ex = extractParams('a 6 ft tall, 30 inch wide pine bookshelf with 5 shelves');
check(ex.height === 72 && ex.width === 30 && ex.count === 5 && ex.material === 'pine', 'extractor basic ' + JSON.stringify(ex));
console.log(fail ? `${fail} FAILURES` : 'ALL TESTS PASSED');
process.exit(fail ? 1 : 0);
