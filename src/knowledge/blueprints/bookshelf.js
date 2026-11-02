import { box, comp, at, screw } from '../shapes.js';
import { fin, ftin, packBoards, cutPlan, WOOD_COLORS, usd } from '../util.js';

const BOARD = { '1x8': 7.25, '1x10': 9.25, '1x12': 11.25 };
const PRICE = { pine: 1.6, poplar: 2.6, oak: 4.9, maple: 4.6, walnut: 9.5, plywood: 0.9, cedar: 2.8, cherry: 7.5, birch: 0.9, mdf: 0.6, redwood: 3.5 }; // $/linear ft of 1x10 approx

export default {
  id: 'bookshelf', title: 'Solid-Wood Bookshelf', domain: 'Woodworking', unit: 'in', icon: '📚',
  params: [
    { key: 'height', label: 'Height', type: 'number', min: 30, max: 96, step: 1, default: 72, unit: 'in', from: (e) => e.height ?? (e.scale ? 72 * e.scale : undefined) },
    { key: 'width', label: 'Width', type: 'number', min: 18, max: 48, step: 1, default: 32, unit: 'in', from: (e) => e.width },
    { key: 'board', label: 'Board (depth)', type: 'select', options: ['1x8', '1x10', '1x12'], default: '1x10', from: (e) => (e.depth ? (e.depth <= 8 ? '1x8' : e.depth <= 10 ? '1x10' : '1x12') : undefined) },
    { key: 'shelves', label: 'Shelf boards (incl. top & bottom)', type: 'number', min: 3, max: 9, step: 1, default: 5, from: (e) => (e.count ? e.count + 0 : undefined) },
    { key: 'material', label: 'Wood', type: 'select', options: ['pine', 'poplar', 'oak', 'maple', 'walnut', 'plywood'], default: 'pine', from: (e) => e.material },
  ],
  generate(p) {
    const T = 0.75, H = p.height, W = p.width, D = BOARD[p.board], n = p.shelves, kick = 3.5;
    const Wi = W - 2 * T;
    const color = WOOD_COLORS[p.material] || WOOD_COLORS.pine;
    const y0 = kick + T / 2, y1 = H - T / 2;
    const ys = Array.from({ length: n }, (_, i) => y0 + (i * (y1 - y0)) / (n - 1));
    const gap = (ys[1] - ys[0]) - T;
    const isPly = p.material === 'plywood';
    const stockName = isPly ? `3/4" birch plywood strip ripped to ${fin(D)}` : `${p.board} ${p.material} board, 8 ft (actual 3/4" x ${fin(D)})`;
    const bins = packBoards([H, H, ...Array(n).fill(Wi), Wi]);
    const pocketScrews = n * 2 * 3;
    const cost = isPly ? 72 + 25 : bins.length * 8 * PRICE[p.material] * (D / 9.25) + 25;
    const parts = [
      { id: 'side', name: 'Side panel', spec: `${p.material} ${p.board}, 3/4" x ${fin(D)} x ${fin(H)}`, qty: 2, shape: box(T, H, D, color) },
      { id: 'shelf', name: 'Shelf / top / bottom', spec: `${p.material} ${p.board}, 3/4" x ${fin(D)} x ${fin(Wi)}`, qty: n, shape: box(Wi, T, D, color) },
      { id: 'kick', name: 'Toe kick', spec: `${p.material} ${p.board} ripped to 3-1/2" x ${fin(Wi)}`, qty: 1, shape: box(Wi, kick, T, color) },
      { id: 'back', name: 'Back panel', spec: `1/4" birch plywood, ${fin(W)} x ${fin(H)}`, qty: 1, shape: box(W, H, 0.25, '#e9d6ad') },
      { id: 'screw', name: 'Pocket-hole screws', spec: 'Kreg SML-C125 1-1/4" #7 coarse-thread washer-head', qty: pocketScrews, shape: screw(1.25) },
      { id: 'brad', name: 'Brad nails', spec: '18-gauge 3/4" brads (or 3/4" #4 screws)', qty: Math.ceil((2 * H + (n + 1) * W) / 6), shape: null },
      { id: 'glue', name: 'Wood glue', spec: 'Titebond II Premium, 8 oz', qty: 1, shape: null },
      { id: 'strap', name: 'Anti-tip kit', spec: 'Furniture anti-tip strap + #10 x 2-1/2" screw into a wall stud', qty: 1, shape: box(1, 2, 0.2, '#eee', 'plastic') },
      { id: 'finish', name: 'Finish', spec: 'Minwax Water-Based Polycrylic, satin, 1 qt + 120/180/220-grit sandpaper', qty: 1, shape: null },
    ];
    const z = 0;
    const shelfAdds = ys.map((y) => ({ part: 'shelf', p: [0, y, z] }));
    return {
      summary: `A ${ftin(H)} tall, ${fin(W)} wide, ${fin(D)} deep ${p.material} bookshelf with ${n} shelf boards (${fin(gap)} clear between shelves), pocket-hole joinery and a 1/4" plywood back. Rated ~40 lb per shelf.`,
      difficulty: 'Beginner', time: '1 weekend (6-8 h + finish drying)', cost: usd(cost),
      tools: ['Circular saw or miter saw (40T blade)', 'Kreg R3 or 720 pocket-hole jig set for 3/4" stock', 'Cordless drill/driver with #2 square bit', '18-gauge brad nailer (or hammer)', 'Speed square + tape measure', '2x 24" bar clamps', 'Random-orbit sander', 'Safety glasses & hearing protection'],
      cutList: cutPlan(bins, stockName),
      parts,
      steps: [
        { title: 'Buy, acclimate and cut the sides', text: `Buy ${bins.length} x ${stockName}${isPly ? ' (one 4x8 sheet)' : ''}. Let the wood sit indoors 48 h. Cut two sides to exactly ${fin(H)}. Clamp them together edge-to-edge and use a speed square to mark shelf lines at ${ys.map((y) => fin(y - T / 2)).join(', ')} from the bottom (bottom face of each shelf).`, details: ['Check each board for twist by sighting down its length; reject any that rock on the floor.', 'Mark the inside face of each side with an "X" so the marks stay hidden.'], add: [{ part: 'side', p: [-(W / 2 - T / 2), H / 2, z] }] },
        { title: `Cut ${n} shelves and drill pocket holes`, text: `Cut ${n} shelf boards to ${fin(Wi)} (outer width ${fin(W)} minus two 3/4" sides). Set the Kreg jig and drill collar for 3/4" stock and drill 3 pocket holes on the underside of each end (1-1/2" from each edge and one centred). Glue and drive 1-1/4" coarse screws to fix each shelf to the LEFT side on its line.`, details: ['Top shelf: drill pocket holes on the top face only if the top will be above eye level; otherwise keep them underneath.', 'Wipe squeeze-out with a damp rag within 5 minutes.'], add: shelfAdds },
        { title: 'Attach the right side', text: `Lay the assembly on its back. Spread a thin bead of glue on each shelf end, stand the right side on, align to the marks and drive the remaining ${pocketScrews / 2} pocket screws. Clamp across the top and bottom shelves while driving.`, add: [{ part: 'side', p: [W / 2 - T / 2, H / 2, z] }] },
        { title: 'Install the toe kick', text: `Rip a ${fin(Wi)} piece to 3-1/2" wide. Glue it under the bottom shelf, flush with the front edges, and fix with 2 pocket screws per end into the sides. It stiffens the base and hides the floor gap.`, add: [{ part: 'kick', p: [0, kick / 2, D / 2 - T / 2] }] },
        { title: 'Square it and fit the back', text: `Measure both diagonals; push the long corner until they match within 1/16". Lay the ${fin(W)} x ${fin(H)} plywood back on, align to one corner, and fire 3/4" brads every 6" into the sides and every shelf. The back now locks the case square.`, warn: 'Do not glue the back if you will ever need to move the case through a narrow doorway — brads alone allow repair.', add: [{ part: 'back', p: [0, H / 2, -D / 2 - 0.125] }] },
        { title: 'Sand and finish', text: 'Ease all sharp edges with 180 grit. Sand faces 120 → 180 → 220. Vacuum, wipe with a tack cloth, then brush 3 thin coats of satin Polycrylic, waiting 2 h between coats and scuffing with 320 grit between coats 2 and 3. Cure 24 h before loading books.', add: [] },
        { title: 'Anchor to the wall', text: `Stand the case in place, locate a stud with a stud finder, and fasten the anti-tip strap to the top shelf back edge and to the stud with the #10 x 2-1/2" screw. Required for any bookshelf over 30" tall.`, warn: 'Tip-over injuries are common with tall furniture — never skip the anchor.', add: [{ part: 'strap', p: [0, H - 2, -D / 2 - 0.5] }] },
      ],
    };
  },
};
