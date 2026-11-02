// Ingeniare text featurizer: hashed word unigrams, bigrams and character trigrams
// with sublinear TF weighting and L2 normalisation. Shared by training and inference.

export const FEATURE_DIM = 2048;

const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'and', 'my', 'me', 'i', 'it', 'with', 'that', 'is', 'be', 'can', 'you', 'please', 'want', 'would', 'like', 'some', 'own', 'in', 'on', 'at']);

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text) {
  return normalize(text).split(' ').filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
}

// Light stemmer so "shelves"/"shelf", "robots"/"robot", "building"/"build" collide.
export function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ves')) return w.slice(0, -3) + 'f';
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('es') && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function featurize(text) {
  const toks = tokenize(text).map(stem);
  const counts = new Map();
  const add = (key, w) => {
    const h = fnv1a(key);
    const idx = h % FEATURE_DIM;
    const sign = (h >>> 31) ? 1 : -1; // signed hashing reduces collision bias
    counts.set(idx, (counts.get(idx) || 0) + sign * w);
  };
  for (let i = 0; i < toks.length; i++) {
    add('u:' + toks[i], 1.0);
    if (i + 1 < toks.length) add('b:' + toks[i] + '_' + toks[i + 1], 0.8);
    const padded = '<' + toks[i] + '>';
    for (let j = 0; j + 3 <= padded.length; j++) add('c:' + padded.slice(j, j + 3), 0.35);
  }
  const vec = new Float32Array(FEATURE_DIM);
  let norm = 0;
  for (const [idx, v] of counts) {
    const s = Math.sign(v) * Math.log1p(Math.abs(v));
    vec[idx] = s;
    norm += s * s;
  }
  norm = Math.sqrt(norm) || 1;
  for (const idx of counts.keys()) vec[idx] /= norm;
  return vec;
}
