import { box, cyl, comp, at } from '../shapes.js';
import { fin, usd } from '../util.js';

// Standard nest-box dimensions per species (inches).
const SPECIES = {
  bluebird: { floor: 5, hole: 1.5, holeH: 6, front: 9, mount: '5 ft on a smooth metal pole, facing an open field' },
  wren: { floor: 4, hole: 1.125, holeH: 5, front: 8, mount: '5-10 ft, near shrubs or a tree edge' },
  chickadee: { floor: 4, hole: 1.125, holeH: 7, front: 9, mount: '5-15 ft on a tree trunk at a wood edge' },
  nuthatch: { floor: 4, hole: 1.25, holeH: 7, front: 9, mount: '5-20 ft on a tree trunk' },
  titmouse: { floor: 4, hole: 1.25, holeH: 7, front: 10, mount: '5-15 ft on a tree trunk' },
  swallow: { floor: 5, hole: 1.5, holeH: 5, front: 8, mount: '5 ft on a pole near water or an open field' },
};

export default {
  id: 'birdhouse', title: 'Species-Correct Birdhouse', domain: 'Woodworking', unit: 'in', icon: '🐦',
  params: [{ key: 'species', label: 'Bird species', type: 'select', options: Object.keys(SPECIES), default: 'bluebird', from: (e) => e.species }],
  generate(p) {
    const s = SPECIES[p.species], T = 0.75, F = s.floor, Hf = s.front, Hb = Hf + 2;
    const Wout = F + 2 * T, cedar = '#b8693f';
    const slope = Math.atan(2 / (F + 2 * T)) * 180 / Math.PI;
    const roofD = F + 2 * T + 3.5;
    const holeShape = comp(at(cyl(s.hole / 2, 0.2, '#1a1209', 'plastic', 'z')));
    return {
      summary: `A ${p.species} nest box from one 1x6 cedar board: ${fin(F)} x ${fin(F)} floor, ${fin(s.hole)} entrance hole centred ${fin(s.holeH)} above the floor, sloped roof, side clean-out door, drainage and ventilation. Mount ${s.mount}.`,
      difficulty: 'Beginner', time: '2 hours', cost: usd(22),
      tools: ['Miter saw or handsaw + speed square', 'Drill with 1/4" bit and ' + fin(s.hole) + ' spade or Forstner bit', 'Hammer or drill/driver', 'Table saw or circular saw (rip floor to width)', 'Pencil, tape measure', 'Clamps'],
      cutList: [`1x6 x 6 ft rough cedar (actual 3/4" x 5-1/2"): front ${fin(Hf)}, back ${fin(Hb + 3)}, sides 2 x ${fin(Hf)} (ripped to ${fin(F)}), floor ${fin(F)} (ripped to ${fin(F)}), roof ${fin(roofD)}${Wout + 2 > 5.5 ? ' (use 1x8 for the roof)' : ''}`],
      parts: [
        { id: 'floor', name: 'Floor', spec: `Cedar 3/4" x ${fin(F)} x ${fin(F)}, corners clipped 3/8" for drainage`, qty: 1, shape: box(F, T, F, cedar) },
        { id: 'side', name: 'Side', spec: `Cedar 3/4" x ${fin(F)} x ${fin(Hf)}`, qty: 2, shape: box(T, Hf - 0.25, F, cedar) },
        { id: 'back', name: 'Back / mounting board', spec: `Cedar 3/4" x ${fin(Wout)} x ${fin(Hb + 3)}`, qty: 1, shape: box(Wout, Hb + 3, T, cedar) },
        { id: 'front', name: 'Front', spec: `Cedar 3/4" x ${fin(Wout)} x ${fin(Hf)} with ${fin(s.hole)} hole`, qty: 1, shape: box(Wout, Hf, T, cedar) },
        { id: 'hole', name: 'Entrance hole', spec: `${fin(s.hole)} diameter — exact size excludes larger competitors like starlings`, qty: 1, shape: holeShape },
        { id: 'roof', name: 'Roof', spec: `Cedar 3/4" x ${fin(Wout + 2)} x ${fin(roofD)}`, qty: 1, shape: box(Wout + 2, T, roofD, '#9c5530') },
        { id: 'nails', name: 'Fasteners', spec: '1-1/2" galvanized ring-shank siding nails or #8 x 1-5/8" exterior screws', qty: 20, shape: null },
        { id: 'pivot', name: 'Pivot nails', spec: '2 x 6d galvanized nails (door hinge) + 1 x 2" screw as door latch', qty: 3, shape: null },
        { id: 'pole', name: 'Mount', spec: '1" EMT conduit, 10 ft (driven 2 ft over 1/2" rebar) + 24" stovepipe predator baffle', qty: 1, shape: cyl(0.55, 30, '#b0b5ba', 'metal') },
      ],
      steps: [
        { title: 'Cut every piece from one board', text: `Cut the 1x6 cedar: front ${fin(Hf)}, back ${fin(Hb + 3)}, two sides ${fin(Hf)} ripped to ${fin(F)}, floor ${fin(F)} square, roof ${fin(roofD)}. Leave the rough-sawn face OUT on the roof and IN on the front (rough inside face = a ladder for fledglings).`, add: [] },
        { title: 'Prepare the floor', text: `Clip each floor corner 3/8" at 45° and drill four 1/4" drainage holes. The floor is recessed 1/4" up inside the walls so water does not wick into the end grain.`, add: [{ part: 'floor', p: [0, T / 2 + 0.25, 0] }] },
        { title: 'Attach the back and fixed side', text: `Nail the back to the floor (2 nails) so 3" of the back extends below the floor for mounting. Nail the LEFT side to the back and floor edge.`, add: [{ part: 'back', p: [0, (Hb + 3) / 2 - 3, -(F / 2 + T / 2)] }, { part: 'side', p: [-(F / 2 + T / 2), Hf / 2 - 0.125, 0] }] },
        { title: 'Drill the entrance and fit the front', text: `On the front, mark the hole centre ${fin(s.holeH)} above the floor top and centred side-to-side. Bore the ${fin(s.hole)} hole with a Forstner bit, backing the board with scrap to prevent tear-out. Nail the front to the floor and left side.`, warn: 'Do NOT add a perch — native cavity nesters do not need one and it helps predators and house sparrows.', add: [{ part: 'front', p: [0, Hf / 2, F / 2 + T / 2] }, { part: 'hole', p: [0, s.holeH + T, F / 2 + T + 0.02] }] },
        { title: 'Hang the clean-out door', text: 'Fit the right side 1/4" short of the top (this gap is the vent). Drive one 6d pivot nail through the front and one through the back, 1" below the top, into the side so it swings open. Secure the bottom with a 2" screw as a latch. Clean out old nests each fall.', add: [{ part: 'side', p: [F / 2 + T / 2, Hf / 2 - 0.125, 0] }] },
        { title: 'Nail on the sloped roof', text: `Bevel the back edge of the roof at ${slope.toFixed(0)}° so it sits flush. Nail it on with a 2" front overhang to keep rain out of the entrance. Leave cedar unfinished — paints and stains can be toxic to chicks.`, add: [{ part: 'roof', p: [0, (Hf + Hb) / 2 + T / 2, 0.9], r: [slope, 0, 0] }] },
        { title: 'Mount it', text: `Mount ${s.mount}, with the entrance facing east or away from prevailing wind. Drive 1/2" rebar 2 ft into the ground, slip the 1" EMT over it, add the 24" stovepipe baffle 4 ft up, and screw the back board to the pole with two conduit straps. Put it up by early March.`, add: [{ part: 'pole', p: [0, -18, -(F / 2 + T + 0.6)] }] },
      ],
    };
  },
};
