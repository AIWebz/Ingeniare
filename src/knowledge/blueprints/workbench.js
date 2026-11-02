import { box } from '../shapes.js';
import { fin, ftin, packBoards, cutPlan, usd } from '../util.js';

export default {
  id: 'workbench', title: 'Heavy-Duty Workbench', domain: 'Woodworking', unit: 'in', icon: '🛠️',
  params: [
    { key: 'length', label: 'Top length', type: 'number', min: 36, max: 96, step: 1, default: 72, unit: 'in', from: (e) => e.length ?? e.width },
    { key: 'depth', label: 'Top depth', type: 'number', min: 20, max: 36, step: 1, default: 30, unit: 'in', from: (e) => e.depth ?? (e.length && e.width ? e.width : undefined) },
    { key: 'height', label: 'Working height', type: 'number', min: 28, max: 42, step: 0.5, default: 36, unit: 'in', from: (e) => e.height },
    { key: 'shelf', label: 'Lower shelf', type: 'select', options: ['yes', 'no'], default: 'yes', from: (e) => (e.shelf ? 'yes' : undefined) },
  ],
  generate(p) {
    const L = p.length, Dp = p.depth, H = p.height, shelf = p.shelf === 'yes';
    const FL = L - 3, FW = Dp - 3, legH = H - 0.75;
    const fir = '#e2c38f', ply = '#dcc08a';
    const legX = FL / 2 - 1.5 - 1.75, legZ = FW / 2 - 1.5 - 1.75;
    const mids = L > 60 ? [0] : [];
    const railSet = [FL, FL, FW - 3, FW - 3, ...mids.map(() => FW - 3)];
    const bins2x4 = packBoards(shelf ? [...railSet, ...railSet] : railSet);
    const bins4x4 = packBoards(Array(4).fill(legH));
    const yTop = legH - 1.75, yShelf = 6 + 1.75;
    const frame = (y) => [
      { part: 'railLong', p: [0, y, FW / 2 - 0.75] }, { part: 'railLong', p: [0, y, -(FW / 2 - 0.75)] },
      { part: 'railShort', p: [FL / 2 - 0.75, y, 0] }, { part: 'railShort', p: [-(FL / 2 - 0.75), y, 0] },
      ...mids.map((x) => ({ part: 'railShort', p: [x, y, 0] })),
    ];
    const constrScrews = (shelf ? 2 : 1) * (4 * 4) + mids.length * 2 * (shelf ? 2 : 1) * 2;
    const cost = bins2x4.length * 5 + bins4x4.length * 14 + 62 + (shelf ? 45 : 0) + 30;
    return {
      summary: `A ${ftin(L)} x ${fin(Dp)} workbench, ${fin(H)} working height, built from 4x4 legs and a 2x4 apron frame with a 3/4" plywood top${shelf ? ' and a 1/2" plywood lower shelf 6" off the floor' : ''}. Supports ~1,000 lb distributed load.`,
      difficulty: 'Beginner', time: '5-7 hours', cost: usd(cost),
      tools: ['Circular saw with speed-square guide', 'Impact driver + T25 star bit', 'Drill with 1/8" pilot bit', 'Tape measure, pencil, 4 ft level', '2x 36" bar clamps', 'Jigsaw (for shelf leg notches)', 'Safety glasses, dust mask'],
      cutList: [...cutPlan(bins2x4, '2x4 x 8 ft SPF stud'), ...cutPlan(bins4x4, '4x4 x 8 ft #2 pressure-treated or Doug fir post')],
      parts: [
        { id: 'leg', name: 'Leg', spec: `4x4 post (3-1/2" x 3-1/2") x ${fin(legH)}`, qty: 4, shape: box(3.5, legH, 3.5, fir) },
        { id: 'railLong', name: 'Long apron rail', spec: `2x4 (1-1/2" x 3-1/2") x ${fin(FL)}`, qty: shelf ? 4 : 2, shape: box(FL, 3.5, 1.5, fir) },
        { id: 'railShort', name: 'Short apron rail / joist', spec: `2x4 x ${fin(FW - 3)}`, qty: (2 + mids.length) * (shelf ? 2 : 1), shape: box(1.5, 3.5, FW - 3, fir) },
        { id: 'top', name: 'Top', spec: `3/4" sanded pine/birch plywood, ${fin(L)} x ${fin(Dp)}`, qty: 1, shape: box(L, 0.75, Dp, ply) },
        ...(shelf ? [{ id: 'shelfPanel', name: 'Lower shelf', spec: `1/2" plywood, ${fin(FL)} x ${fin(FW)}, notched 3-1/2" x 3-1/2" at corners`, qty: 1, shape: box(FL, 0.5, FW, ply) }] : []),
        { id: 'cscrew', name: 'Structural screws', spec: '#10 x 3-1/2" star-drive structural/construction screws', qty: constrScrews, shape: null },
        { id: 'tscrew', name: 'Deck screws', spec: '#8 x 1-5/8" coated deck screws (top & shelf)', qty: Math.ceil((2 * L + 2 * Dp) / 8) * (shelf ? 2 : 1), shape: null },
        { id: 'glue', name: 'Construction adhesive', spec: 'Wood glue or polyurethane construction adhesive', qty: 1, shape: null },
        { id: 'finish', name: 'Top finish', spec: 'Danish oil or penetrating finishing oil, ~1 pt', qty: 1, shape: null },
      ],
      steps: [
        { title: 'Cut the legs', text: `Crosscut four 4x4 legs to exactly ${fin(legH)} (working height ${fin(H)} minus the 3/4" top). Cut from both faces with the circular saw (blade depth max ~2-3/8"), then sand the seam flush. Stand all four together — any length difference over 1/32" will make the bench rock.`, add: [{ part: 'leg', p: [-legX, legH / 2, legZ] }, { part: 'leg', p: [legX, legH / 2, legZ] }, { part: 'leg', p: [-legX, legH / 2, -legZ] }, { part: 'leg', p: [legX, legH / 2, -legZ] }] },
        { title: 'Build the top apron frame', text: `Cut two 2x4 rails to ${fin(FL)} and ${2 + mids.length} joists to ${fin(FW - 3)}. Butt the joists between the long rails, flush on top, and drive two 3-1/2" construction screws through the long rail into each joist end (pre-drill 1/8" within 1" of the board end).${mids.length ? ' Centre the extra joist to stop the top from sagging.' : ''} Outer frame: ${fin(FL)} x ${fin(FW)}.`, add: frame(yTop) },
        { title: 'Attach legs inside the frame corners', text: `Flip the frame upside down on a flat floor. Set a leg in each inside corner, tight to both rails and flush with the frame top. Clamp, then drive 2 construction screws through each rail face into the leg (4 per leg). Check each leg with a square before the second screw.`, add: [] },
        ...(shelf ? [{ title: 'Add the lower shelf frame', text: `Stand the bench up. Mark 6" up from the floor on each leg. Build a second ${fin(FL)} x ${fin(FW)} frame exactly like the first and fasten it to the legs with its bottom edge on the 6" marks. This frame is what keeps the legs from racking.`, add: frame(yShelf) }] : []),
        { title: 'Fasten the plywood top', text: `Lay the ${fin(L)} x ${fin(Dp)} top on the frame with a 1-1/2" overhang on all sides (lets you clamp work to the edge). Run a bead of glue on the frame, then drive 1-5/8" deck screws every 8" around the perimeter and along the joists, countersunk 1/16" below the surface.`, add: [{ part: 'top', p: [0, H - 0.375, 0] }] },
        ...(shelf ? [{ title: 'Drop in the lower shelf', text: 'Lay the 1/2" plywood on the shelf frame and trace the four legs. Cut 3-1/2" x 3-1/2" corner notches with a jigsaw, drop it in and screw it down every 10".', add: [{ part: 'shelfPanel', p: [0, 6 + 3.5 + 0.25, 0] }] }] : []),
        { title: 'Level and finish', text: 'Move the bench to its final spot, check the top with a 4 ft level in both directions and shim legs as needed. Ease edges with 120-grit, then wipe on Danish oil, wait 30 min, wipe off excess. Two coats, 8 h apart.', add: [] },
      ],
    };
  },
};
