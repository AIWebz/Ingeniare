// A small, real feed-forward neural network (MLP) implemented from scratch:
// input -> dense(ReLU) -> dense(softmax). Trained with mini-batch Adam and
// cross-entropy loss, with dropout and L2 regularisation. Pure JS, no deps,
// runs identically in Node (training) and the browser/Electron (inference).

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MLP {
  constructor(inDim, hidden, outDim, seed = 7) {
    this.inDim = inDim; this.hidden = hidden; this.outDim = outDim;
    const rnd = mulberry32(seed);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    this.W1 = new Float32Array(inDim * hidden).map(() => gauss() * Math.sqrt(2 / inDim));
    this.b1 = new Float32Array(hidden);
    this.W2 = new Float32Array(hidden * outDim).map(() => gauss() * Math.sqrt(2 / hidden));
    this.b2 = new Float32Array(outDim);
    this.rnd = rnd;
  }

  forward(x, train = false, dropout = 0) {
    const { inDim, hidden, outDim, W1, b1, W2, b2 } = this;
    const h = new Float32Array(hidden);
    const mask = new Float32Array(hidden).fill(1);
    for (let j = 0; j < hidden; j++) h[j] = b1[j];
    for (let i = 0; i < inDim; i++) {
      const xi = x[i];
      if (xi === 0) continue;
      const row = i * hidden;
      for (let j = 0; j < hidden; j++) h[j] += xi * W1[row + j];
    }
    for (let j = 0; j < hidden; j++) {
      h[j] = h[j] > 0 ? h[j] : 0;
      if (train && dropout > 0) {
        mask[j] = this.rnd() < dropout ? 0 : 1 / (1 - dropout);
        h[j] *= mask[j];
      }
    }
    const z = new Float32Array(outDim);
    for (let k = 0; k < outDim; k++) z[k] = b2[k];
    for (let j = 0; j < hidden; j++) {
      const hj = h[j];
      if (hj === 0) continue;
      const row = j * outDim;
      for (let k = 0; k < outDim; k++) z[k] += hj * W2[row + k];
    }
    return { h, mask, p: softmax(z) };
  }

  predict(x) { return this.forward(x).p; }

  train(X, Y, { epochs = 30, lr = 0.003, batch = 32, l2 = 1e-5, dropout = 0.2, log = () => {} } = {}) {
    const { inDim, hidden, outDim } = this;
    const params = ['W1', 'b1', 'W2', 'b2'];
    const m = {}, v = {};
    for (const p of params) { m[p] = new Float32Array(this[p].length); v[p] = new Float32Array(this[p].length); }
    const b1c = 0.9, b2c = 0.999, eps = 1e-8;
    let t = 0;
    const idx = X.map((_, i) => i);
    for (let ep = 0; ep < epochs; ep++) {
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      let loss = 0;
      for (let s = 0; s < idx.length; s += batch) {
        const g = { W1: new Float32Array(inDim * hidden), b1: new Float32Array(hidden), W2: new Float32Array(hidden * outDim), b2: new Float32Array(outDim) };
        const bs = Math.min(batch, idx.length - s);
        for (let q = 0; q < bs; q++) {
          const n = idx[s + q], x = X[n], y = Y[n];
          const { h, mask, p } = this.forward(x, true, dropout);
          loss += -Math.log(p[y] + 1e-12);
          const dz = Float32Array.from(p); dz[y] -= 1;
          const dh = new Float32Array(hidden);
          for (let j = 0; j < hidden; j++) {
            const row = j * outDim;
            for (let k = 0; k < outDim; k++) { g.W2[row + k] += h[j] * dz[k]; dh[j] += this.W2[row + k] * dz[k]; }
            dh[j] = h[j] > 0 ? dh[j] * mask[j] : 0;
          }
          for (let k = 0; k < outDim; k++) g.b2[k] += dz[k];
          for (let i = 0; i < inDim; i++) {
            const xi = x[i]; if (xi === 0) continue;
            const row = i * hidden;
            for (let j = 0; j < hidden; j++) g.W1[row + j] += xi * dh[j];
          }
          for (let j = 0; j < hidden; j++) g.b1[j] += dh[j];
        }
        t++;
        for (const p of params) {
          const W = this[p], G = g[p], M = m[p], V = v[p];
          const decay = p.startsWith('W') ? l2 : 0;
          for (let i = 0; i < W.length; i++) {
            const gi = G[i] / bs + decay * W[i];
            M[i] = b1c * M[i] + (1 - b1c) * gi;
            V[i] = b2c * V[i] + (1 - b2c) * gi * gi;
            W[i] -= lr * (M[i] / (1 - Math.pow(b1c, t))) / (Math.sqrt(V[i] / (1 - Math.pow(b2c, t))) + eps);
          }
        }
      }
      log(ep + 1, loss / idx.length);
    }
  }

  toJSON() {
    const q = (a) => Array.from(a, (x) => Math.round(x * 1e4) / 1e4);
    return { inDim: this.inDim, hidden: this.hidden, outDim: this.outDim, W1: q(this.W1), b1: q(this.b1), W2: q(this.W2), b2: q(this.b2) };
  }

  static fromJSON(o) {
    const net = new MLP(o.inDim, o.hidden, o.outDim);
    net.W1 = Float32Array.from(o.W1); net.b1 = Float32Array.from(o.b1);
    net.W2 = Float32Array.from(o.W2); net.b2 = Float32Array.from(o.b2);
    return net;
  }
}

export function softmax(z) {
  let max = -Infinity;
  for (const v of z) if (v > max) max = v;
  const e = z.map((v) => Math.exp(v - max));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
