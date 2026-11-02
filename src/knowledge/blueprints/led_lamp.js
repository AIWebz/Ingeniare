import { box, cyl, comp, at, ledStrip, alChannel, switchRocker } from '../shapes.js';
import { usd, r2 } from '../util.js';

export default {
  id: 'led_lamp', title: 'Dimmable LED Desk Lamp', domain: 'Electronics / Lighting', unit: 'mm', icon: '💡',
  params: [
    { key: 'reach', label: 'Light bar length', type: 'number', min: 200, max: 600, step: 50, default: 300, unit: 'mm', from: (e) => (e.length ? Math.round(e.length * 25.4 / 50) * 50 : e.width ? Math.round(e.width * 25.4 / 50) * 50 : undefined) },
    { key: 'height', label: 'Post height', type: 'number', min: 250, max: 600, step: 25, default: 400, unit: 'mm', from: (e) => (e.height ? Math.round(e.height * 25.4 / 25) * 25 : undefined) },
    { key: 'kelvin', label: 'Colour temperature', type: 'select', options: ['2700K', '4000K', '5000K'], default: '4000K', from: (e) => (e.kelvin ? (e.kelvin < 3300 ? '2700K' : e.kelvin < 4500 ? '4000K' : '5000K') : undefined) },
    { key: 'material', label: 'Base wood', type: 'select', options: ['oak', 'walnut', 'maple'], default: 'oak', from: (e) => (['oak', 'walnut', 'maple'].includes(e.material) ? e.material : undefined) },
  ],
  generate(p) {
    const len = p.reach, H = p.height;
    const watts = r2((len / 1000) * 9.6), amps = r2(watts / 12);
    const wood = { oak: '#c49a6c', walnut: '#6b4a2f', maple: '#e8d1a7' }[p.material];
    const lumens = Math.round(watts * 100);
    return {
      summary: `An L-shaped desk lamp: ${p.material} base, ${H} mm brushed-aluminium post and a ${len} mm aluminium light bar with ${p.kelvin} 2835 LED strip (${Math.round(len / 8.3)} LEDs, ${watts} W, ~${lumens} lm, ${amps} A at 12 V), knob dimmer and rocker switch. Powered by a 12 V 2 A adapter.`,
      difficulty: 'Beginner', time: '3 hours', cost: usd(48),
      tools: ['Soldering iron (350 °C) + 0.8 mm rosin-core solder', 'Wire stripper', 'Heat gun or lighter (heat-shrink)', 'Drill with 8 mm, 12 mm and 22 mm (Forstner) bits', 'Hacksaw with metal blade', 'Multimeter', 'Sandpaper 120/220', 'Epoxy (JB Weld 5-minute)'],
      parts: [
        { id: 'base', name: 'Base', spec: `${p.material} block, 160 x 160 x 30 mm`, qty: 1, shape: box(160, 30, 160, wood) },
        { id: 'post', name: 'Post', spec: `12 mm OD x 1 mm wall aluminium tube, ${H} mm`, qty: 1, shape: cyl(6, H, '#c9ccd1', 'metal') },
        { id: 'elbow', name: 'Elbow', spec: '12 mm aluminium 90° tube connector (or bent tube)', qty: 1, shape: cyl(8, 26, '#9ea3a8', 'metal', 'z') },
        { id: 'channel', name: 'Light bar', spec: `16 x 12 mm aluminium LED channel with opal diffuser + end caps, ${len} mm`, qty: 1, shape: alChannel(len) },
        { id: 'strip', name: 'LED strip', spec: `12 V SMD2835 LED strip, 120 LEDs/m, 9.6 W/m, ${p.kelvin}, CRI 90+, ${len - 10} mm (cut on copper pads)`, qty: 1, shape: ledStrip(len - 10) },
        { id: 'psu', name: 'Power supply', spec: '12 V DC 2 A UL-listed wall adapter, 5.5 x 2.1 mm barrel', qty: 1, shape: null },
        { id: 'jack', name: 'DC jack', spec: '5.5 x 2.1 mm panel-mount DC barrel jack (12 mm hole)', qty: 1, shape: cyl(6, 14, '#222', 'plastic', 'x') },
        { id: 'dimmer', name: 'Dimmer', spec: '12 V PWM LED dimmer module with 10 kΩ knob pot (5 A)', qty: 1, shape: comp(at(box(30, 10, 22, '#1d6b3a', 'pcb')), at(cyl(6, 16, '#111', 'plastic'), [0, 13, 0])) },
        { id: 'switch', name: 'Switch', spec: 'KCD1 rocker switch, 20 x 13 mm cutout', qty: 1, shape: switchRocker() },
        { id: 'wire', name: 'Wire', spec: '22 AWG 2-conductor red/black silicone wire, 1.5 m + 3 mm heat-shrink', qty: 1, shape: null },
        { id: 'feet', name: 'Feet', spec: '4 x 12 mm self-adhesive cork/rubber pads', qty: 4, shape: null },
      ],
      steps: [
        { title: 'Make the wooden base', text: `Cut the ${p.material} to 160 x 160 x 30 mm. Drill a 12 mm hole 25 mm deep, 30 mm from the back edge (post socket). From the back edge drill an 8 mm wire channel to meet it. Rout or chisel a 50 x 30 x 15 mm pocket underneath for the dimmer. Drill a 12 mm hole in the back for the DC jack and a 13 x 20 mm slot in the side for the switch. Sand 120 → 220 and oil.`, add: [{ part: 'base', p: [0, 15, 0] }] },
        { title: 'Wire the base electronics', text: 'Mount the DC jack in the back hole and the rocker switch in the side slot. Wire: jack centre (+) → switch → dimmer "V+ IN"; jack sleeve (−) → dimmer "V− IN". Press the dimmer into the underside pocket with the knob shaft poking through an 8 mm hole in the top.', details: ['Heat-shrink every joint; check with the multimeter that + and − are not shorted before powering up.'], add: [{ part: 'jack', p: [-70, 15, -50] }, { part: 'switch', p: [0, 15, 81], r: [90, 0, 0] }, { part: 'dimmer', p: [45, 12, 30] }] },
        { title: 'Prepare the light bar', text: `Cut the aluminium channel to ${len} mm with the hacksaw and deburr. Cut the LED strip to ${len - 10} mm, cutting ONLY across the copper pads at the scissor marks. Solder 1 m of red/black wire to the strip's +12V/GND pads (tin pads first, 2 s per joint).`, add: [] },
        { title: 'Install the LEDs in the channel', text: `Peel the 3M backing and press the strip into the channel — the aluminium is the heat sink, so press firmly along its whole length. Snap in the opal diffuser and end caps; drill a 4 mm hole in the end cap for the wire. At ${watts} W the channel stays under 45 °C.`, add: [{ part: 'channel', p: [len / 2 - 2, H + 18, -50] }, { part: 'strip', p: [len / 2 - 2, H + 11.5, -50], r: [180, 0, 0] }] },
        { title: 'Assemble the post and arm', text: `Feed the wire through the 90° elbow and down the ${H} mm post. Epoxy the post into the base socket (check plumb with a square, hold 5 min). Push the light bar onto the elbow and epoxy.`, add: [{ part: 'post', p: [0, 30 + H / 2 - 25, -50] }, { part: 'elbow', p: [0, H + 18, -50], r: [0, 90, 0] }] },
        { title: 'Final connection and test', text: `Solder the light-bar wires to the dimmer "LED+ / LED−" outputs. Stick on the 4 cork feet. Plug in the 12 V adapter, flip the switch and turn the knob: brightness should go smoothly from ~5% to 100%. Measured current should be ~${amps} A at full brightness.`, warn: 'Use only a 12 V DC adapter — 24 V will instantly destroy a 12 V strip.', add: [] },
      ],
    };
  },
};
