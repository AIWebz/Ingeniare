// Training corpus generator for the Ingeniare universal intent model.
// Every category lists hundreds of object names; templates combine them with
// request phrasings and neutral modifiers to create a large, varied training set.
import { mulberry32 } from './network.js';
import { CATEGORIES } from './universal/categories.js';

export const CLASSES = Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.nouns]));
export const LABELS = Object.keys(CLASSES);

// Modifiers shared by every class, so the network learns they carry no category signal.
const SHARED = ['with solar power', 'that is waterproof', 'out of wood', 'from metal', 'with leds', 'for kids', 'for my backyard', 'at home', 'that is remote controlled', 'with a motor', 'from scratch', '3 feet tall', 'for a school project', 'with arduino', 'that is cheap', 'with a battery', 'out of cardboard', 'that is portable', 'with sensors', 'from recycled materials', 'for my garage', 'with wheels', 'that looks futuristic', 'using 3d printing', 'with lights', 'with a camera', 'with a speaker', 'with a screen', 'with a solar panel', 'with a fan', 'with a pump', 'with an arm', 'powered by the sun', 'that can fly', 'with a lock', ''];
const VERBS = ['build', 'make', 'engineer', 'design', 'construct', 'create', 'assemble', 'diy', 'craft', 'fabricate', 'invent', 'prototype'];
const FRAMES = [
  (v, n, c) => `${v} a ${n} ${c}`, (v, n, c) => `how do i ${v} a ${n}`, (v, n, c) => `how to ${v} a ${n} ${c}`,
  (v, n, c) => `i want to ${v} a ${n}`, (v, n, c) => `help me ${v} a ${n} ${c}`, (v, n, c) => `instructions to ${v} a ${n}`,
  (v, n, c) => `step by step guide to ${v} a ${n} ${c}`, (v, n) => `${n}`, (v, n, c) => `${n} ${c}`, (v, n) => `diy ${n} plans`,
  (v, n) => `can you show me how to ${v} a ${n}`, (v, n, c) => `${v} my own ${n} ${c}`, (v, n, c) => `plans for a ${n} ${c}`,
  (v, n, c) => `i need a ${n} ${c}`, (v, n) => `what do i need to ${v} a ${n}`, (v, n) => `${v} a simple ${n}`,
  (v, n, c) => `${v} a large ${n} ${c}`, (v, n, c) => `${v} a small ${n} ${c}`, (v, n, c) => `${v} a working ${n} ${c}`,
  (v, n, c) => `${v} a homemade ${n} ${c}`, (v, n, c) => `${v} a model ${n}`,
];

export function buildDataset({ perClass = 400, seed = 42 } = {}) {
  const rnd = mulberry32(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const data = [];
  LABELS.forEach((label, y) => {
    const seen = new Set();
    let guard = 0;
    while (seen.size < perClass && guard++ < perClass * 20) {
      let text = pick(FRAMES)(pick(VERBS), pick(CLASSES[label]), rnd() < 0.5 ? pick(SHARED) : '').trim();
      if (rnd() < 0.06) { const i = 1 + Math.floor(rnd() * (text.length - 2)); text = text.slice(0, i) + text.slice(i + 1); }
      if (!seen.has(text)) { seen.add(text); data.push({ text, y }); }
    }
    for (const n of CLASSES[label]) data.push({ text: n, y }, { text: `build a ${n}`, y });
  });
  return data;
}

// Hand-written held-out phrasings used only for evaluation.
export const EVAL = [
  ['a comfy reading chair for my living room', 'furniture'], ['a dining table that seats eight', 'furniture'], ['bunk beds for my two kids', 'furniture'],
  ['a backyard shed to store my lawn mower', 'structure'], ['a treehouse for my children', 'structure'], ['a footbridge over a small creek', 'structure'],
  ['an electric go kart', 'land_vehicle'], ['a wooden wagon for hauling firewood', 'land_vehicle'], ['a bamboo bicycle', 'land_vehicle'],
  ['a solar powered boat', 'watercraft'], ['a cedar strip canoe', 'watercraft'], ['an rc submarine', 'watercraft'],
  ['a foam rc airplane', 'aircraft'], ['a water bottle rocket', 'aircraft'], ['a hot air balloon model', 'aircraft'],
  ['a robot that can pick up objects', 'robot'], ['a humanoid robot', 'robot'], ['a mars rover model', 'robot'],
  ['a bluetooth speaker', 'electronics'], ['a weather station with wifi', 'electronics'], ['a retro game console', 'electronics'],
  ['a neon sign for my room', 'lighting'], ['a floor lamp made from pipes', 'lighting'],
  ['a small wind turbine for my cabin', 'machine'], ['a diy 3d printer', 'machine'], ['a steam engine', 'machine'],
  ['a treasure chest', 'container'], ['an aquarium for fish', 'container'],
  ['a backyard pizza oven', 'appliance'], ['a blacksmith forge', 'appliance'],
  ['an off grid solar power system for my van', 'energy'],
  ['an acoustic guitar', 'instrument'], ['a homemade drum', 'instrument'],
  ['a marble run for kids', 'toy'], ['an arcade cabinet', 'toy'],
  ['a hiking backpack', 'wearable'], ['iron man armor', 'wearable'],
];
