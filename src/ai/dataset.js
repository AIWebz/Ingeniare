// Training corpus generator for the Ingeniare intent model.
// Each class lists the ways people describe a project; templates combine them
// with request phrasings and modifiers to create a large, varied training set.

import { mulberry32 } from './network.js';

export const CLASSES = {
  bookshelf: ['bookshelf', 'bookcase', 'book shelf', 'shelving unit', 'wooden shelves', 'storage shelf', 'shelf for books', 'display shelf', 'tall shelf', 'library shelf', 'shelf unit', 'cube shelf', 'standing shelves', 'shelves for my room', 'shelf'],
  workbench: ['workbench', 'work bench', 'garage workbench', 'workshop table', 'sturdy table', 'tool bench', 'work table', 'wooden table', 'craft table', 'woodworking bench', 'shop table', '2x4 table', 'heavy duty table', 'outdoor table', 'table', 'desk', 'potting bench'],
  garden_bed: ['raised garden bed', 'planter box', 'vegetable bed', 'garden box', 'raised bed', 'planter', 'cedar planter', 'vegetable garden', 'herb garden box', 'garden bed', 'elevated garden', 'flower bed', 'tomato bed', 'grow bed'],
  birdhouse: ['birdhouse', 'bird house', 'nest box', 'nesting box', 'bluebird house', 'wren house', 'chickadee house', 'bird box', 'house for birds', 'bird nest', 'nesting house', 'bird shelter'],
  robot_car: ['robot', 'robot car', 'obstacle avoiding robot', 'arduino robot', 'rover', 'robotic car', 'autonomous car', 'self driving car', 'smart car', 'arduino car', 'line following robot', 'mobile robot', 'robot vehicle', 'bot', 'remote control car', 'rc car', 'wheeled robot'],
  led_lamp: ['lamp', 'desk lamp', 'led lamp', 'reading light', 'led light', 'light fixture', 'night light', 'table lamp', 'task light', 'dimmable lamp', 'lighting', 'study lamp', 'bedside lamp', 'light'],
  solar_charger: ['solar charger', 'solar power bank', 'solar phone charger', 'solar panel charger', 'portable solar power', 'usb solar charger', 'solar battery pack', 'solar generator', 'solar powered charger', 'power bank', 'battery bank', 'solar panel', 'off grid charger', 'phone charger'],
  pc: ['gaming pc', 'computer', 'desktop pc', 'pc build', 'gaming rig', 'workstation', 'custom computer', 'gaming computer', 'pc', 'desktop computer', 'personal computer', 'rig', 'streaming pc', 'editing pc', 'tower pc'],
  drone: ['drone', 'quadcopter', 'fpv drone', 'quad', 'multirotor', 'uav', 'flying camera', 'racing drone', 'freestyle drone', 'aerial drone', 'cinewhoop', 'long range drone', 'copter'],
  trebuchet: ['trebuchet', 'catapult', 'siege engine', 'launcher', 'medieval catapult', 'pumpkin launcher', 'counterweight catapult', 'projectile launcher', 'siege weapon', 'throwing machine', 'ballista'],
};

export const LABELS = Object.keys(CLASSES);

const CONTEXT = {
  bookshelf: ['for my books', 'out of pine', 'with 5 shelves', 'for the living room', 'from plywood', '6 feet tall', 'to hold vinyl records', 'in oak'],
  workbench: ['for my garage', 'out of 2x4s', 'with a lower shelf', 'that is 6 feet long', 'for woodworking', 'that holds heavy tools'],
  garden_bed: ['for vegetables', 'out of cedar', '4x8', 'for tomatoes', 'in my backyard', 'with gopher mesh', 'two boards high'],
  birdhouse: ['for bluebirds', 'for wrens', 'out of cedar', 'for my yard', 'that hangs on a post', 'for chickadees'],
  robot_car: ['with arduino', 'that avoids obstacles', 'with ultrasonic sensor', 'with 2 wheels', 'with 4wd', 'that drives itself', 'with motors'],
  led_lamp: ['with leds', 'that is dimmable', 'warm white', 'for my desk', 'with a wooden base', 'for reading', '12 volt'],
  solar_charger: ['to charge my phone', 'for camping', '10000mah', '20 watt', 'with usb', 'with lithium batteries', 'for emergencies'],
  pc: ['for gaming', 'under 1500 dollars', 'with rtx', 'for video editing', 'with ryzen', 'for 1440p', 'for streaming', 'budget'],
  drone: ['for fpv', '5 inch', 'with a camera', 'from scratch', 'for freestyle', 'with betaflight', '7 inch long range', '3 inch'],
  trebuchet: ['for a school project', 'out of wood', 'that throws water balloons', 'for physics class', 'with counterweight', 'tabletop', 'backyard'],
};

const VERBS = ['build', 'make', 'engineer', 'design', 'construct', 'create', 'assemble', 'put together', 'diy', 'craft', 'fabricate'];
const FRAMES = [
  (v, n, c) => `${v} a ${n} ${c}`,
  (v, n, c) => `how do i ${v} a ${n}`,
  (v, n, c) => `how to ${v} a ${n} ${c}`,
  (v, n, c) => `i want to ${v} a ${n}`,
  (v, n, c) => `help me ${v} a ${n} ${c}`,
  (v, n, c) => `instructions to ${v} a ${n}`,
  (v, n, c) => `step by step guide to ${v} a ${n} ${c}`,
  (v, n, c) => `${n}`,
  (v, n, c) => `${n} ${c}`,
  (v, n, c) => `diy ${n} plans`,
  (v, n, c) => `can you show me how to ${v} a ${n}`,
  (v, n, c) => `${v} my own ${n} ${c}`,
  (v, n, c) => `plans for a ${n} ${c}`,
  (v, n, c) => `i need a ${n} ${c}`,
  (v, n, c) => `what do i need to ${v} a ${n}`,
  (v, n, c) => `${v} a simple ${n}`,
  (v, n, c) => `${v} a cheap ${n} ${c}`,
  (v, n, c) => `${v} a large ${n}`,
  (v, n, c) => `${v} a small ${n} ${c}`,
];

export function buildDataset({ perClass = 260, seed = 42 } = {}) {
  const rnd = mulberry32(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const data = [];
  LABELS.forEach((label, y) => {
    const seen = new Set();
    let guard = 0;
    while (seen.size < perClass && guard++ < perClass * 20) {
      let text = pick(FRAMES)(pick(VERBS), pick(CLASSES[label]), rnd() < 0.6 ? pick(CONTEXT[label]) : '').trim();
      if (rnd() < 0.08) text = typo(text, rnd);
      if (!seen.has(text)) { seen.add(text); data.push({ text, y }); }
    }
    // Always include the bare canonical names.
    for (const n of CLASSES[label]) data.push({ text: n, y });
  });
  return data;
}

function typo(s, rnd) {
  const i = 1 + Math.floor(rnd() * Math.max(1, s.length - 2));
  return s.slice(0, i) + s.slice(i + 1);
}

// Hand-written held-out phrasings used only for evaluation.
export const EVAL = [
  ['I would like to put together shelving for all my paperback novels', 'bookshelf'],
  ['tall pine bookcase 7 ft', 'bookshelf'],
  ['heavy duty bench for my garage shop', 'workbench'],
  ['a table to work on in my workshop', 'workbench'],
  ['raised cedar beds for growing veggies', 'garden_bed'],
  ['4x8 planter for herbs', 'garden_bed'],
  ['a little house for bluebirds to nest in', 'birdhouse'],
  ['wren nest box', 'birdhouse'],
  ['arduino rover that avoids walls', 'robot_car'],
  ['robot with ultrasonic sensor and two motors', 'robot_car'],
  ['dimmable LED reading lamp for my desk', 'led_lamp'],
  ['warm white bedside light', 'led_lamp'],
  ['solar powered usb power bank for camping', 'solar_charger'],
  ['charge my phone using the sun', 'solar_charger'],
  ['build a gaming computer for 1440p under $1500', 'pc'],
  ['custom desktop for video editing', 'pc'],
  ['5 inch fpv quadcopter', 'drone'],
  ['racing drone with betaflight', 'drone'],
  ['counterweight trebuchet for physics class', 'trebuchet'],
  ['medieval catapult that throws water balloons', 'trebuchet'],
];
