// Ingeniare inference engine.
// 1) a neural network classifies ANY request into an engineering archetype,
// 2) a parameter extractor reads sizes, materials and specs from the text,
// 3) either a detailed expert template (for well-known projects) or the
//    universal procedural designer produces the plan and its 3D model.
import { featurize, tokenize, stem } from './features.js';
import { MLP } from './network.js';
import { extractParams } from './extract.js';
import { CATEGORIES } from './universal/categories.js';
import { universalPlan, FEATURES, MATERIAL_KEYS, defaultSize } from './universal/planner.js';
import { BLUEPRINTS } from '../knowledge/blueprints/index.js';

const EXPERTS = [
  ['bookshelf', /\b(book ?shel(f|ves)|bookcase)\b/],
  ['workbench', /\bwork ?bench\b/],
  ['garden_bed', /\b(raised (garden )?bed|garden bed|planter box)\b/],
  ['birdhouse', /\b(bird ?house|nest(ing)? box|bluebird box)\b/],
  ['robot_car', /\b(obstacle.{0,20}(robot|car)|arduino (robot|car)|robot car)\b/],
  ['led_lamp', /\b(led|desk) lamp\b/],
  ['solar_charger', /\bsolar (phone |usb )?(charger|power bank)\b/],
  ['pc', /\b((gaming|custom|desktop) (pc|computer)|pc build|build (a |my )?(gaming )?pc|gaming rig)\b/],
  ['drone', /\b((fpv|racing|freestyle) (drone|quad)|quadcopter|fpv drone)\b/],
  ['trebuchet', /\b(trebuchet|catapult)\b/],
];

export class IngeniareAI {
  constructor(model) {
    this.net = MLP.fromJSON(model.net);
    this.labels = model.labels;
    this.vocab = new Set(model.vocab);
    this.meta = model.meta;
  }

  classify(prompt) {
    const p = this.net.predict(featurize(prompt));
    // lexical head-noun detector: the object named before "with/that/for..." is what the user wants built
    const lower = ' ' + prompt.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const head = lower.split(/ (with|that|which|for|using|powered by|to|so|and|out of|from|made of) /)[0] + ' ';
    let lex = null, best = 0;
    for (const [label, c] of Object.entries(CATEGORIES)) for (const n of c.nouns) {
      const re = new RegExp(`\\b${n}(s|es)?\\b`);
      const score = (re.test(head) ? 2 : re.test(lower) ? 1 : 0) * 100 + n.length;
      if (score >= 100 && score > best) { best = score; lex = label; }
    }
    const mix = this.labels.map((label, i) => (lex ? 0.35 * p[i] + (label === lex ? 0.65 : 0) : p[i]));
    const ranked = this.labels.map((label, i) => ({ label, p: mix[i], net: p[i], title: CATEGORIES[label].title, icon: CATEGORIES[label].icon })).sort((a, b) => b.p - a.p);
    const toks = tokenize(prompt).map(stem);
    const known = toks.filter((t) => this.vocab.has(t)).length;
    return { ranked, lexical: lex, coverage: toks.length ? known / toks.length : 0, inDomain: !!lex || (known > 0 && ranked[0].p > 0.45) };
  }

  generate(prompt, { forceLabel, overrides = {}, settings = {} } = {}) {
    const intent = this.classify(prompt);
    const extracted = extractParams(prompt);
    const lower = prompt.toLowerCase();
    let expertId = null;
    if (forceLabel && BLUEPRINTS[forceLabel]) expertId = forceLabel;
    else if (!forceLabel && settings.experts !== false) expertId = EXPERTS.find(([, re]) => re.test(lower))?.[0] || null;

    if (expertId) {
      const bp = BLUEPRINTS[expertId];
      const params = resolveParams(bp.params, extracted, overrides);
      const plan = bp.generate(params);
      return { mode: 'expert', label: expertId, title: bp.title, icon: bp.icon, domain: bp.domain, unit: bp.unit, paramSpecs: bp.params, params, intent, extracted, plan };
    }

    const category = forceLabel && (CATEGORIES[forceLabel] || forceLabel === 'custom') ? forceLabel : intent.inDomain ? intent.ranked[0].label : 'custom';
    const u = universalPlan({ category, prompt, extracted, overrides, settings });
    const def = defaultSize(category, ' ' + lower + ' ');
    const dimSpec = (key, label, v, d) => ({ key, label, type: 'length', min: Math.max(1, Math.round(Math.min(v, d) * 0.25)), max: Math.round(Math.max(v, d) * 3), step: Math.max(0.5, Math.round(Math.max(v, d) / 100)), default: d });
    const paramSpecs = [
      dimSpec('L', 'Length', u.dims.L, def[0]), dimSpec('W', 'Width / depth', u.dims.W, def[2]), dimSpec('H', 'Height', u.dims.H, def[1]),
      { key: 'material', label: 'Primary material', type: 'select', options: ['auto', ...MATERIAL_KEYS], default: 'auto' },
    ];
    return {
      mode: 'universal', label: category, title: u.title, icon: CATEGORIES[category]?.icon || '🛠️', domain: CATEGORIES[category]?.title || 'Custom invention',
      unit: settings.units === 'metric' ? 'cm' : 'in', paramSpecs, params: { L: u.dims.L, W: u.dims.W, H: u.dims.H, material: overrides.material || 'auto' },
      features: u.features, allFeatures: FEATURES.map(({ key, label }) => ({ key, label })), intent, extracted, plan: u.plan,
    };
  }
}

export function resolveParams(specs, extracted, overrides = {}) {
  const out = {};
  for (const spec of specs) {
    let v = overrides[spec.key];
    if (v === undefined) v = spec.from ? spec.from(extracted) : undefined;
    if (v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))) v = spec.default;
    if (spec.type === 'number') v = Math.min(spec.max, Math.max(spec.min, Math.round(+v / spec.step) * spec.step));
    if (spec.type === 'select' && !spec.options.includes(String(v))) v = spec.default;
    out[spec.key] = spec.type === 'number' ? +v : String(v);
  }
  return out;
}
