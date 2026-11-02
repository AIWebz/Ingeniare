import { box, cyl, comp, at, pcb, solarPanel, battery18650, switchRocker } from '../shapes.js';
import { usd, r1 } from '../util.js';

const PANELS = { 6: [190, 140], 10: [300, 200], 20: [420, 280] };

export default {
  id: 'solar_charger', title: 'Solar USB Power Bank', domain: 'Electronics / Energy', unit: 'mm', icon: '☀️',
  params: [
    { key: 'watts', label: 'Panel power', type: 'select', options: ['6', '10', '20'], default: '10', unit: 'W', from: (e) => (e.watts ? String(e.watts <= 7 ? 6 : e.watts <= 14 ? 10 : 20) : undefined) },
    { key: 'mah', label: 'Battery capacity', type: 'select', options: ['6000', '12000', '18000', '24000'], default: '12000', unit: 'mAh', from: (e) => (e.mah ? String(Math.min(24000, Math.max(6000, Math.round(e.mah / 6000) * 6000))) : undefined) },
  ],
  generate(p) {
    const W = +p.watts, mah = +p.mah, cells = mah / 3000;
    const wh = r1((mah / 1000) * 3.6);
    const [pw, pd] = PANELS[W];
    const hrs = r1(wh / (W * 0.7 * 0.85));
    const phoneCharges = r1((wh * 0.85) / 15);
    const boxW = Math.max(150, cells * 20 + 40);
    const cellAdds = Array.from({ length: cells }, (_, i) => ({ part: 'cell', p: [(i - (cells - 1) / 2) * 20, 22, -15], r: [0, 90, 0] }));
    return {
      summary: `A ${wh} Wh (${mah} mAh @ 3.6 V) solar power bank: ${W} W 6 V monocrystalline panel → CN3791 MPPT Li-ion charger → ${cells} x 18650 cells in parallel (1S${cells}P) with 1S BMS → 5 V 2.1 A USB boost. Full solar charge in ~${hrs} h of strong sun; ~${phoneCharges} phone charges (15 Wh phone).`,
      difficulty: 'Intermediate', time: '3-4 hours', cost: usd(25 + W * 1.8 + cells * 5),
      tools: ['Soldering iron 60 W+ (380 °C for battery tabs)', 'Spot welder (or pre-tabbed cells)', 'Multimeter', 'Wire stripper', 'Drill + step bit (6-22 mm)', 'Hot glue / double-sided foam tape', 'Kapton tape'],
      parts: [
        { id: 'panel', name: 'Solar panel', spec: `${W} W 6 V monocrystalline ETFE panel (Vmp ~6 V, Voc ~7.2 V), ${pw} x ${pd} mm`, qty: 1, shape: solarPanel(pw, pd) },
        { id: 'enclosure', name: 'Enclosure', spec: `ABS project box ${boxW} x 100 x 50 mm, IP65`, qty: 1, shape: box(boxW, 50, 100, '#2e3a46', 'glass') },
        { id: 'cell', name: 'Li-ion cell', spec: '18650 3.6 V 3000 mAh 15 A (Samsung 30Q / Molicel P30B), all from the same batch, tabbed', qty: cells, shape: battery18650() },
        { id: 'mppt', name: 'Solar charge controller', spec: 'CN3791 MPPT Li-ion charger module, 6 V panel version (4.2 V float, 2 A max)', qty: 1, shape: pcb(40, 30, '#1f4fbf', [[10, 4, 10, -5, 0], [8, 6, 8, 10, 6, '#555']]) },
        { id: 'bms', name: 'Battery protection', spec: '1S 3.7 V Li-ion BMS, 8 A (DW01A + 8205A), over-discharge cut at 2.5 V', qty: 1, shape: pcb(40, 8, '#0d47a1', [[6, 2, 4, 0, 0]]) },
        { id: 'boost', name: 'USB boost converter', spec: '5 V 2.1 A dual-USB-A boost module (3-5 V in), or 18 W QC3.0 module', qty: 1, shape: pcb(45, 30, '#1d6b3a', [[14, 7, 14, 12, -6, '#ccc'], [14, 7, 14, 12, 8, '#ccc']]) },
        { id: 'switch', name: 'Power switch', spec: 'KCD1 rocker switch (cuts boost output)', qty: 1, shape: switchRocker() },
        { id: 'meter', name: 'Charge indicator', spec: '1S Li-ion 4-bar LED capacity indicator', qty: 1, shape: pcb(22, 12, '#111', [[4, 2, 3, -6, 0, '#4caf50'], [4, 2, 3, 0, 0, '#4caf50'], [4, 2, 3, 6, 0, '#4caf50']]) },
        { id: 'connector', name: 'Panel connector', spec: 'DC 5.5 x 2.1 mm IP67 panel-mount socket + 18 AWG twin cable 1 m', qty: 1, shape: cyl(7, 15, '#111', 'plastic', 'z') },
        { id: 'wire', name: 'Wire', spec: '18 AWG silicone wire (battery) + 22 AWG (signals), nickel strip 0.15 x 8 mm', qty: 1, shape: null },
      ],
      steps: [
        { title: 'Balance and build the battery pack', text: `Charge every 18650 to exactly 4.10-4.20 V and check they are within 0.05 V of each other — only then connect in PARALLEL. Spot-weld nickel strip across all ${cells} positive ends and all negative ends (1S${cells}P). Wrap the pack in Kapton tape.`, warn: 'Never solder directly onto a bare cell body for more than 2 s, never parallel cells at different voltages, never short the pack.', add: cellAdds },
        { title: 'Add the BMS', text: 'Solder pack + to BMS B+ and pack − to BMS B− with 18 AWG wire. All loads and chargers connect to BMS P+ / P−, never directly to the cells.', add: [{ part: 'bms', p: [0, 34, -40] }] },
        { title: 'Prepare the enclosure', text: `Drill: 12 mm hole for the DC panel socket (side), 2 slots for the USB ports (front), 13 x 20 mm cutout for the switch, and a 22 x 12 mm window for the LED gauge. Deburr with the step bit.`, add: [{ part: 'enclosure', p: [0, 25, 0] }] },
        { title: 'Mount the MPPT charger', text: 'Wire the DC socket → CN3791 "SOLAR+/−" input, and CN3791 "BAT+/−" → BMS P+/P−. The CN3791 holds the panel at its maximum-power voltage and stops at 4.2 V. Tape it to the lid with foam tape.', add: [{ part: 'mppt', p: [-35, 30, 30] }, { part: 'connector', p: [-boxW / 2, 25, 20], r: [0, 90, 0] }] },
        { title: 'Add the USB output and gauge', text: 'BMS P+ → rocker switch → boost "IN+"; BMS P− → boost "IN−". Wire the LED capacity gauge directly across P+/P−. Glue the boost board so its USB ports line up with the front slots.', add: [{ part: 'boost', p: [35, 30, 30] }, { part: 'switch', p: [0, 50, 35] }, { part: 'meter', p: [boxW / 2 - 25, 50, -30] }] },
        { title: 'Connect the panel and test', text: `Solder the panel's junction-box leads to a 5.5 x 2.1 mm plug (centre +). In full sun measure ~6 V at the socket and ~${r1(W * 0.7 / 4)} A charge current into the battery. Switch on, plug in a phone: the boost output must read 5.0-5.2 V.`, details: [`Real-world solar charge: ~${hrs} h of full sun. A USB-C 5 V charger can also feed the CN3791 input in winter.`], add: [{ part: 'panel', p: [0, 90, 0], r: [-20, 0, 0] }] },
      ],
    };
  },
};
