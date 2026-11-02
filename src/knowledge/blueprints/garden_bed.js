import { box } from '../shapes.js';
import { fin, ftin, packBoards, cutPlan, usd, r1 } from '../util.js';

export default {
  id: 'garden_bed', title: 'Cedar Raised Garden Bed', domain: 'Outdoor / Garden', unit: 'in', icon: '🌱',
  params: [
    { key: 'length', label: 'Length', type: 'number', min: 36, max: 144, step: 6, default: 96, unit: 'in', from: (e) => e.length },
    { key: 'width', label: 'Width', type: 'number', min: 24, max: 48, step: 6, default: 48, unit: 'in', from: (e) => e.width },
    { key: 'tiers', label: 'Board courses (5-1/2" each)', type: 'number', min: 1, max: 4, step: 1, default: 2, from: (e) => e.count ?? (e.height ? Math.round(e.height / 5.5) : undefined) },
  ],
  generate(p) {
    const L = p.length, W = p.width, n = p.tiers, Hb = n * 5.5;
    const cedar = '#b8693f';
    const longStock = L <= 96 ? 96 : L <= 120 ? 120 : 144;
    const ends = packBoards(Array(2 * n).fill(W - 3));
    const postBins = packBoards(Array(4 + (L > 72 ? 2 : 0)).fill(Hb));
    const vol = ((L - 3) * (W - 3) * (Hb - 1)) / 1728;
    const px = L / 2 - 1.5 - 1.75, pz = W / 2 - 1.5 - 1.75;
    const longAdds = [], endAdds = [];
    for (let i = 0; i < n; i++) {
      const y = 5.5 * i + 2.75;
      longAdds.push({ part: 'long', p: [0, y, W / 2 - 0.75] }, { part: 'long', p: [0, y, -(W / 2 - 0.75)] });
      endAdds.push({ part: 'end', p: [L / 2 - 0.75, y, 0] }, { part: 'end', p: [-(L / 2 - 0.75), y, 0] });
    }
    const posts = [[px, pz], [-px, pz], [px, -pz], [-px, -pz], ...(L > 72 ? [[0, pz], [0, -pz]] : [])];
    const cost = 2 * n * (longStock / 12) * 2.6 + ends.length * 21 + postBins.length * 20 + 38 + 22 + vol * 3.5;
    return {
      summary: `A ${ftin(L)} x ${ftin(W)} cedar raised bed, ${fin(Hb)} deep (${n} courses of 2x6), with 4x4 corner posts and galvanized gopher mesh. Holds ${r1(vol)} cu ft (${r1(vol / 27)} cu yd) of soil.`,
      difficulty: 'Beginner', time: '3-4 hours', cost: usd(cost),
      tools: ['Circular saw or miter saw', 'Impact driver with T25 bit', 'Heavy-duty staple gun with 1/2" galvanized staples', 'Tin snips', '4 ft level, tape measure, square', 'Flat shovel', 'Work gloves'],
      cutList: [`${2 * n} x 2x6 x ${longStock / 12} ft cedar: cut each to ${fin(L)}`, ...cutPlan(ends, '2x6 x 8 ft cedar'), ...cutPlan(postBins, '4x4 x 8 ft cedar post')],
      parts: [
        { id: 'long', name: 'Long side board', spec: `Western red cedar 2x6 (1-1/2" x 5-1/2") x ${fin(L)}`, qty: 2 * n, shape: box(L, 5.5, 1.5, cedar) },
        { id: 'end', name: 'End board', spec: `Cedar 2x6 x ${fin(W - 3)}`, qty: 2 * n, shape: box(1.5, 5.5, W - 3, cedar) },
        { id: 'post', name: 'Corner / mid post', spec: `Cedar 4x4 x ${fin(Hb)}`, qty: posts.length, shape: box(3.5, Hb, 3.5, '#a85c35') },
        { id: 'mesh', name: 'Gopher mesh', spec: `1/2" galvanized hardware cloth, 19-gauge, ${fin(L - 3)} x ${fin(W - 3)} (buy a 4 ft x 10 ft roll)`, qty: 1, shape: box(L - 3, 0.06, W - 3, '#9ea7ad', 'metal') },
        { id: 'screws', name: 'Exterior screws', spec: '#10 x 3" coated exterior deck screws', qty: posts.length * n * 2 + 4 * n * 2, shape: null },
        { id: 'soil', name: 'Soil mix', spec: `${r1(vol)} cu ft: 60% topsoil (${r1(vol * 0.6)}), 30% compost (${r1(vol * 0.3)}), 10% perlite or pine fines (${r1(vol * 0.1)})`, qty: 1, shape: box(L - 3.2, Hb - 1, W - 3.2, '#4a3222', 'soil') },
      ],
      steps: [
        { title: 'Cut the boards and posts', text: `Cut ${2 * n} long boards to ${fin(L)}, ${2 * n} end boards to ${fin(W - 3)} (width minus two 1-1/2" long boards), and ${posts.length} posts to ${fin(Hb)}. Use untreated western red cedar — it resists rot for 10-15 years without leaching chemicals into food soil.`, add: [] },
        { title: 'Build the two end panels', text: `Lay 2 posts on a flat surface ${fin(W - 3 - 7)} apart (inside faces). Place ${n} end board${n > 1 ? 's' : ''} across them, flush with the post outer faces and tops. Drive two 3" screws through each board into each post, pre-drilling 1/8" pilots 1" from board ends to prevent splitting.`, add: [...endAdds, ...posts.slice(0, 4).map(([x, z]) => ({ part: 'post', p: [x, Hb / 2, z] }))] },
        { title: 'Attach the long sides', text: `Stand the end panels up ${fin(L)} apart. Attach the long boards so they overlap the end-board ends, screwing 2 per board into each post.${L > 72 ? ' Add the mid posts at the centre of each long side to stop the boards bowing outward under soil pressure.' : ''} Measure diagonals — equal within 1/4" means square.`, add: [...longAdds, ...posts.slice(4).map(([x, z]) => ({ part: 'post', p: [x, Hb / 2, z] }))] },
        { title: 'Site, level and line the bottom', text: 'Place the bed in a spot with 6-8 h of direct sun. Skim soil until the bed is level end-to-end (check with the 4 ft level). Unroll the hardware cloth inside, cut with snips, and staple it to the bottom board inner faces every 3" with 1/2" galvanized staples. This stops gophers and voles.', add: [{ part: 'mesh', p: [0, 0.05, 0] }] },
        { title: 'Fill with soil', text: `Fill with ${r1(vol)} cu ft (${Math.ceil(vol / 1.5)} bags of 1.5 cu ft, or ${r1(vol / 27)} cu yd bulk) of the 60/30/10 mix. Water thoroughly and top up after 1 week as it settles ~10%. Leave 1" of board exposed above the soil.`, add: [{ part: 'soil', p: [0, (Hb - 1) / 2 + 0.1, 0] }] },
      ],
    };
  },
};
