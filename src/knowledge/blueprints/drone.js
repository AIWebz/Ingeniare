import { box, cyl, comp, at, pcb, motorBrushless, prop, lipo } from '../shapes.js';
import { usd } from '../util.js';

const SIZES = {
  3: { wb: 140, motor: '1404 3800KV brushless motors (4S)', md: 18, mh: 15, stack: 'Flight controller + 4-in-1 ESC stack (≈ 35 A, 20 x 20 mm mounting)', stackSz: 26, propSpec: '3" tri-blade propellers', pd: 76, batt: '4S 650 mAh 75C LiPo, XT30', conn: 'XT30', bl: 60, frame: '3" 140 mm carbon frame, 3 mm arms', auw: 230, cost: 230, armW: 14 },
  5: { wb: 225, motor: '2207 1850KV brushless motors (6S), M5 shaft', md: 28, mh: 30, stack: 'Flight-controller + 4-in-1 ESC stack (≈ 55 A ESC, 30.5 x 30.5 mm mounting)', stackSz: 42, propSpec: '5.1" tri-blade propellers, ~3.1" pitch', pd: 130, batt: '6S 1100 mAh 120C LiPo, XT60', conn: 'XT60', bl: 75, frame: '5" true-X 225 mm carbon frame, 5 mm arms', auw: 650, cost: 380, armW: 22 },
  7: { wb: 295, motor: '2807 1300KV brushless motors (6S)', md: 34, mh: 32, stack: 'Flight controller + 4-in-1 ESC stack (≈ 55 A, 30.5 x 30.5 mm mounting)', stackSz: 42, propSpec: '7" tri-blade propellers, ~4" pitch', pd: 178, batt: '6S 1800 mAh 100C LiPo (or 6S 4000 mAh Li-ion for long range), XT60', conn: 'XT60', bl: 105, frame: '7" long-range 295 mm carbon frame, 6 mm arms', auw: 950, cost: 470, armW: 24 },
};

export default {
  id: 'drone', title: 'FPV Quadcopter', domain: 'Aerospace / RC', unit: 'mm', icon: '🚁',
  params: [{ key: 'size', label: 'Prop size', type: 'select', options: ['3', '5', '7'], default: '5', unit: 'in', from: (e) => (e.sizeIn ? String(e.sizeIn <= 4 ? 3 : e.sizeIn <= 6 ? 5 : 7) : undefined) }],
  generate(p) {
    const s = SIZES[p.size], R = s.wb / 2, d = R / Math.SQRT2;
    const corners = [[d, d], [-d, d], [d, -d], [-d, -d]];
    const twr = Math.round((s.md > 25 ? (s.md > 30 ? 1700 : 1500) : 450) * 4 / s.auw * 10) / 10;
    return {
      summary: `A ${p.size}-inch FPV quad (${s.wb} mm wheelbase, ~${s.auw} g all-up): ${s.frame}, ${s.motor}, ${s.stack}, ${s.propSpec}, ${s.batt}, 2.4 GHz digital receiver and analog 5.8 GHz video. Thrust-to-weight ≈ ${twr}:1.`,
      difficulty: 'Advanced', time: '4-6 hours + tuning', cost: '~' + usd(s.cost) + ' (excl. radio & goggles)',
      tools: ['Soldering iron 80 W+ with chisel tip, 400 °C for power pads', '63/37 solder 0.8 mm + flux paste', 'Hex drivers 1.5 / 2.0 / 2.5 mm', '8 mm prop wrench', 'Multimeter + smoke stopper (fuse)', 'Medium-strength (blue) thread-locker', 'Computer with flight-controller configuration software', 'Radio transmitter and FPV goggles', 'LiPo charger + fireproof bag'],
      parts: [
        { id: 'frame', name: 'Frame', spec: s.frame, qty: 1, shape: comp(at(box(2 * R + 20, 5, s.armW, '#222', 'carbon'), [0, 0, 0], [0, 45, 0]), at(box(2 * R + 20, 5, s.armW, '#222', 'carbon'), [0, 0, 0], [0, -45, 0]), at(box(s.stackSz + 40, 3, s.stackSz + 70, '#222', 'carbon'), [0, 0, 0])) },
        { id: 'motor', name: 'Motor', spec: s.motor, qty: 4, shape: motorBrushless(s.md, s.mh) },
        { id: 'esc', name: '4-in-1 ESC', spec: s.stack.split('+')[1]?.trim() || s.stack, qty: 1, shape: pcb(s.stackSz, s.stackSz, '#111', [[6, 3, 6, -10, -10, '#555'], [6, 3, 6, 10, -10, '#555'], [6, 3, 6, -10, 10, '#555'], [6, 3, 6, 10, 10, '#555']]) },
        { id: 'fc', name: 'Flight controller', spec: s.stack.split('+')[0].trim(), qty: 1, shape: pcb(s.stackSz, s.stackSz, '#1565c0', [[8, 2, 8, 0, 0], [4, 3, 6, -12, 0, '#ccc']]) },
        { id: 'cap', name: 'Capacitor', spec: '1000 µF 35 V low-ESR electrolytic capacitor', qty: 1, shape: cyl(5, 20, '#222', 'plastic', 'z') },
        { id: 'rx', name: 'Receiver', spec: '2.4 GHz long-range digital nano receiver (matching the protocol of your radio)', qty: 1, shape: pcb(13, 10, '#333', [[6, 2, 6, 0, 0]]) },
        { id: 'cam', name: 'FPV camera', spec: 'Micro-size (19 mm) low-latency FPV camera', qty: 1, shape: comp(at(box(19, 19, 19, '#111', 'plastic')), at(cyl(6, 8, '#333', 'glass', 'z'), [0, 0, 12])) },
        { id: 'vtx', name: 'Video transmitter', spec: '5.8 GHz video transmitter with adjustable power (legal limits apply) + circular-polarised antenna', qty: 1, shape: pcb(30, 30, '#2e7d32', [[10, 4, 10, 0, 0, '#888']]) },
        { id: 'top', name: 'Top plate', spec: 'Frame top plate with M3 x 25 aluminium standoffs', qty: 1, shape: box(s.stackSz + 30, 2.5, s.stackSz + 60, '#222', 'carbon') },
        { id: 'battery', name: 'Battery', spec: s.batt + ' + 20 x 250 mm kevlar battery strap', qty: 1, shape: lipo(s.bl, 36, 35) },
        { id: 'prop', name: 'Propeller', spec: s.propSpec + ' (2 CW + 2 CCW)', qty: 4, shape: prop(s.pd) },
      ],
      steps: [
        { title: 'Assemble the frame', text: `Bolt the arms between the bottom plates with the supplied M3 bolts and a drop of medium-strength (blue) thread-locker on each. Torque firmly but don't strip the carbon. Check the arms don't flex when you twist the frame.`, add: [{ part: 'frame', p: [0, 0, 0] }] },
        { title: 'Mount the motors', text: `Fix each motor with 4 x M3 bolts that protrude no more than 1 mm into the motor (measure: arm thickness + 3 mm). A bolt touching the windings will short and burn the motor. Point the wires toward the frame centre.`, warn: 'Spin each motor by hand after tightening — any grinding means the bolt is too long.', add: corners.map(([x, z]) => ({ part: 'motor', p: [x, 3 + s.mh / 2, z] })) },
        { title: 'Install and solder the ESC', text: `Mount the 4-in-1 ESC on silicone grommets on the 30.5/20 mm standoffs, arrow forward. Cut each motor's 3 wires to length, tin and solder them to the ESC pads (any order — direction is fixed in software). Solder the ${s.conn} pigtail (12-14 AWG) to the main pads with the 1000 µF capacitor in parallel, observing polarity.`, details: ['Tin pads at 400 °C with flux; each joint should be shiny and volcano-shaped.', 'Check resistance between + and − with the multimeter: it must NOT read 0 Ω.'], add: [{ part: 'esc', p: [0, 9, 0] }, { part: 'cap', p: [0, 9, -s.stackSz / 2 - 20] }] },
        { title: 'Stack the flight controller', text: 'Plug the ESC harness into the flight controller, mount the FC on grommets 6-8 mm above the ESC, arrow forward. Tighten the stack nuts only until the grommets just start to compress (vibration isolation).', add: [{ part: 'fc', p: [0, 17, 0] }] },
        { title: 'Wire the receiver, camera and VTX', text: 'receiver: 5V → 5V, GND → GND, RX TX → FC UART2 RX (R2), RX RX → FC T2. Camera: 5V/GND/Video → FC "CAM" pads. VTX: 9V/GND/Video-out → FC "VTX" pads and SmartAudio → T4. Mount the camera at 25-35° up-tilt in the front cage and the VTX antenna out the back.', add: [{ part: 'rx', p: [0, 24, -s.stackSz / 2 - 5] }, { part: 'cam', p: [0, 20, s.stackSz / 2 + 25] }, { part: 'vtx', p: [0, 26, -s.stackSz / 2 - 18] }] },
        { title: 'Smoke-stop and configure the flight controller', text: 'Fit a smoke stopper and plug in a battery: no smoke, LEDs on. Connect USB, open the flight-controller configurator: Ports → Serial RX on UART2; Receiver → CRSF; Motors → protocol DSHOT600, "Motor direction is reversed" ON (props-out), then set each motor\'s direction. Bind the receiver with your binding phrase. Modes: ARM on a switch, ANGLE/ACRO on another. Set failsafe stage 2 to DROP.', warn: 'NEVER test motors on the bench with propellers installed.', add: [{ part: 'top', p: [0, 34, 0] }] },
        { title: 'Battery strap and props, then maiden flight', text: `Strap the ${s.batt} on top. Install props LAST: props-out means the front-right and rear-left motors spin counter-clockwise when viewed from above. Tighten the M5 locknuts with the prop wrench. Do your first hover in an open field, 3 m away, at low throttle; check video and arming before flying lines.`, details: ['Check local rules (e.g. FAA TRUST + registration in the US for > 250 g).'], add: [{ part: 'battery', p: [-20, 34 + 18, 0], r: [0, 90, 0] }, ...corners.map(([x, z]) => ({ part: 'prop', p: [x, 3 + s.mh + 5, z] }))] },
      ],
    };
  },
};
