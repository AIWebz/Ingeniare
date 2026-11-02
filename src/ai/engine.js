// Ingeniare inference engine: neural intent model + parameter extraction +
// parametric engineering knowledge base -> complete, specific 3D build plan.

import { featurize, tokenize, stem } from './features.js';
import { MLP } from './network.js';
import { extractParams } from './extract.js';
import { BLUEPRINTS } from '../knowledge/blueprints/index.js';

export class IngeniareAI {
  constructor(model) {
    this.net = MLP.fromJSON(model.net);
    this.labels = model.labels;
    this.vocab = new Set(model.vocab);
    this.meta = model.meta;
  }

  classify(prompt) {
    const p = this.net.predict(featurize(prompt));
    const ranked = this.labels.map((label, i) => ({ label, p: p[i], title: BLUEPRINTS[label].title, icon: BLUEPRINTS[label].icon })).sort((a, b) => b.p - a.p);
    const toks = tokenize(prompt).map(stem);
    const known = toks.filter((t) => this.vocab.has(t)).length;
    const coverage = toks.length ? known / toks.length : 0;
    return { ranked, coverage, inDomain: known > 0 && ranked[0].p > 0.35 };
  }

  resolveParams(bp, extracted, overrides = {}) {
    const out = {};
    for (const spec of bp.params) {
      let v = overrides[spec.key];
      if (v === undefined) v = spec.from ? spec.from(extracted) : undefined;
      if (v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))) v = spec.default;
      if (spec.type === 'number') v = Math.min(spec.max, Math.max(spec.min, Math.round(+v / spec.step) * spec.step));
      if (spec.type === 'select' && !spec.options.includes(String(v))) v = spec.default;
      out[spec.key] = spec.type === 'number' ? +v : String(v);
    }
    return out;
  }

  generate(prompt, { forceLabel, overrides } = {}) {
    const intent = this.classify(prompt);
    const label = forceLabel || intent.ranked[0].label;
    const bp = BLUEPRINTS[label];
    const extracted = extractParams(prompt);
    const params = this.resolveParams(bp, extracted, overrides);
    const plan = bp.generate(params);
    plan.parts.forEach((part) => { part.used = 0; });
    plan.steps.forEach((s) => (s.add || []).forEach((a) => { const part = plan.parts.find((x) => x.id === a.part); if (part) part.used++; }));
    return { label, blueprint: { id: bp.id, title: bp.title, domain: bp.domain, unit: bp.unit, icon: bp.icon, params: bp.params }, intent, extracted, params, plan };
  }
}

export const listBlueprints = () => Object.values(BLUEPRINTS).map((b) => ({ id: b.id, title: b.title, icon: b.icon, domain: b.domain }));
