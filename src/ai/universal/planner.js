// Universal planner: sizes, materials, subsystems, tools, cost and the final
// step-by-step plan for any request. Item descriptions are generic types with
// "what to look for" guidance rather than brand names or model numbers.
import { box, cyl, sphere, torus, comp, at, rbox, wing, tube, capsule } from '../../knowledge/shapes.js';
import { GEN, Builder } from './designer.js';
import { CATEGORIES } from './categories.js';

const has = (s, re) => re.test(s);

export const MATERIALS = {
  wood: { name: 'wood', color: '#c99a62', trim: '#a8794a', m: 'wood', stock: 'straight-grained hardwood or softwood', sheet: 'cabinet-grade plywood (18 mm / 3/4")', joinery: 'glue plus pre-drilled wood screws or pocket screws', finish: 'Sand 120 → 180 → 220 grit, then apply 2-3 coats of a water-based polyurethane or hard-wax oil (exterior: spar varnish or exterior stain).', tools: ['Saw (circular, mitre or hand saw)', 'Drill/driver with pilot bits', 'Clamps (at least 2)', 'Square, tape measure, pencil', 'Sander and sandpaper'] },
  metal: { name: 'metal', color: '#aab2bb', trim: '#7d858f', m: 'metal', stock: 'mild-steel or aluminium square/round tube', sheet: 'aluminium or steel sheet (1.5-3 mm)', joinery: 'bolts with lock-nuts, rivets or welds', finish: 'Degrease, scuff with a flap disc, prime with an etch/zinc primer and finish with 2 coats of enamel or powder coat.', tools: ['Angle grinder (cut-off + flap discs)', 'Drill with HSS/step bits', 'Welder or rivet gun', 'Files and deburring tool', 'Clamps, square, scribe'] },
  plastic: { name: 'plastic / 3D-printed', color: '#ff7a1a', trim: '#2b2f36', m: 'paint', stock: '3D-printed PETG/ABS parts or plastic profile', sheet: 'ABS, HDPE or acrylic sheet (3-6 mm)', joinery: 'machine screws into heat-set inserts, or solvent cement', finish: 'Sand print lines, apply filler primer, sand again and paint with 2 light coats of acrylic plus clear coat.', tools: ['3D printer (or an online print service)', 'Soldering iron for heat-set inserts', 'Calipers', 'Deburring tool, files', 'Drill'] },
  cardboard: { name: 'cardboard', color: '#c8a27a', trim: '#a57e57', m: 'paint', stock: 'laminated corrugated cardboard strips', sheet: 'double-wall corrugated cardboard', joinery: 'hot glue and paper tape', finish: 'Seal with diluted PVA glue, then paint with acrylics.', tools: ['Craft knife and cutting mat', 'Steel ruler', 'Hot-glue gun', 'Pencil'] },
  pvc: { name: 'PVC pipe', color: '#f2f2f2', trim: '#d9d9d9', m: 'plastic', stock: 'Schedule 40 PVC pipe', sheet: 'PVC foam board', joinery: 'PVC fittings with primer and solvent cement', finish: 'Lightly sand and paint with a plastic-bonding spray paint.', tools: ['PVC pipe cutter or hacksaw', 'Primer and solvent cement', 'Tape measure, marker', 'Drill'] },
  fabric: { name: 'fabric', color: '#ff7a1a', trim: '#2b2f36', m: 'fabric', stock: 'nylon webbing', sheet: 'heavy nylon/canvas fabric', joinery: 'bar-tacked stitching and rivets', finish: 'Seal cut nylon edges with heat, and apply a water-repellent spray.', tools: ['Heavy-duty sewing machine', 'Fabric scissors / rotary cutter', 'Clips and pins', 'Lighter or hot knife'] },
  concrete: { name: 'concrete / masonry', color: '#bdb8b1', trim: '#9c978f', m: 'concrete', stock: 'rebar-reinforced concrete', sheet: 'cement board', joinery: 'mortar and anchor bolts', finish: 'Cure 7 days kept damp, then seal with a penetrating concrete sealer.', tools: ['Mixer or wheelbarrow + hoe', 'Trowels and float', 'Level', 'Rebar cutter', 'Formwork lumber'] },
  carbon: { name: 'carbon fibre', color: '#222', trim: '#111', m: 'carbon', stock: 'carbon-fibre tube', sheet: 'carbon-fibre plate', joinery: 'epoxy bonding and bolts', finish: 'Wet-sand edges and seal cut edges with thin CA glue.', tools: ['Diamond cutting wheel (rotary tool)', 'Dust mask (carbon dust)', 'Epoxy and mixing cups', 'Drill with carbide bits'] },
};
const CAT_MAT = { furniture: 'wood', structure: 'wood', land_vehicle: 'metal', watercraft: 'wood', aircraft: 'plastic', robot: 'plastic', electronics: 'plastic', lighting: 'wood', machine: 'metal', container: 'wood', appliance: 'metal', energy: 'metal', instrument: 'wood', toy: 'wood', wearable: 'fabric', custom: 'plastic' };
export const MATERIAL_KEYS = Object.keys(MATERIALS);

export function detectMaterial(p) {
  if (/\b(wood|wooden|oak|pine|cedar|maple|walnut|plywood|mdf|birch|poplar|bamboo|timber|lumber|2x4)/.test(p)) return 'wood';
  if (/\b(steel|metal|aluminum|aluminium|iron|copper|brass|welded|stainless)/.test(p)) return 'metal';
  if (/\b(plastic|3d print|3d-print|printed|acrylic|abs|petg|pla)\b/.test(p)) return 'plastic';
  if (/\bcardboard|paper\b/.test(p)) return 'cardboard';
  if (/\bpvc\b/.test(p)) return 'pvc';
  if (/\b(fabric|leather|canvas|cloth|nylon|textile)/.test(p)) return 'fabric';
  if (/\b(concrete|brick|stone|cement|masonry)/.test(p)) return 'concrete';
  if (/\bcarbon\b/.test(p)) return 'carbon';
  return null;
}

// default overall size in cm: [length (x), height (y), width (z)]
export function defaultSize(cat, p) {
  const small = /\b(model|mini|miniature|toy|rc|desk ?top|tabletop|small|tiny|scale)\b/.test(p);
  const S = (a) => a;
  const pick = (rules, def) => { for (const [re, v] of rules) if (re.test(p)) return v; return def; };
  let s;
  switch (cat) {
    case 'furniture': s = pick([[/stool/, [40, 65, 40]], [/chair|throne/, [48, 90, 48]], [/bench/, [120, 45, 40]], [/bunk|loft/, [200, 160, 100]], [/bed|futon/, [200, 100, 150]], [/crib/, [125, 90, 70]], [/sofa|couch/, [200, 85, 90]], [/desk|workstation/, [130, 75, 65]], [/coffee table/, [110, 45, 60]], [/table|island|counter/, [160, 75, 90]], [/dresser|drawer/, [100, 90, 50]], [/wardrobe|closet/, [100, 190, 60]], [/nightstand|side table/, [45, 60, 40]]], [90, 180, 35]); break;
    case 'structure': s = pick([[/bridge/, [400, 100, 120]], [/fence|railing/, [600, 120, 20]], [/gate/, [120, 120, 10]], [/doghouse|dog house|cat house|hutch/, [100, 90, 80]], [/coop/, [180, 170, 120]], [/treehouse|tree house/, [240, 380, 240]], [/tower/, [200, 500, 200]], [/greenhouse/, [300, 250, 240]], [/gazebo|pavilion/, [350, 300, 350]], [/pergola|carport/, [400, 270, 300]], [/playhouse|fort/, [180, 180, 150]], [/tiny house|cabin/, [600, 400, 250]], [/house|barn|garage/, [800, 500, 600]]], [300, 250, 240]); break;
    case 'land_vehicle': s = pick([[/skate|longboard|hoverboard/, [80, 12, 22]], [/bike|bicycle|motorcycle|scooter/, [180, 100, 60]], [/wagon|wheelbarrow|cart/, [110, 55, 60]], [/train/, [300, 120, 100]], [/trailer/, [250, 100, 150]]], [180, 90, 110]); break;
    case 'watercraft': s = pick([[/submarine|underwater/, [120, 40, 25]], [/kayak/, [380, 60, 65]], [/canoe/, [480, 70, 90]], [/paddle ?board/, [320, 20, 80]], [/raft/, [300, 60, 200]], [/ship|ferry|yacht|houseboat/, [900, 300, 300]]], [400, 110, 160]); break;
    case 'aircraft': s = pick([[/paper/, [30, 6, 25]], [/drone|quad|multirotor|copter/, [45, 15, 45]], [/rocket|missile|spacecraft|spaceship|lander/, [8, 100, 8]], [/balloon|blimp|airship/, [300, 400, 300]], [/kite/, [100, 2, 80]], [/hang glider/, [250, 60, 900]]], [100, 30, 150]).map((v, i, a) => v); if (/rocket|missile|spacecraft|spaceship|lander/.test(p)) s = [100, 100, 8]; break;
    case 'robot': s = pick([[/arm|gripper|hand/, [40, 60, 30]], [/humanoid|android|mech|biped/, [30, 80, 40]], [/dog|quadruped/, [60, 45, 30]], [/spider|hexapod/, [40, 25, 40]]], [50, 40, 40]); break;
    case 'electronics': s = pick([[/clock/, [30, 30, 8]], [/speaker|jukebox/, [25, 40, 25]], [/console|controller|handheld/, [30, 8, 18]], [/mirror/, [50, 80, 5]], [/laptop|tablet/, [32, 2, 22]]], [25, 15, 15]); break;
    case 'lighting': s = pick([[/floor lamp|street light/, [40, 160, 40]], [/sign|neon|light box/, [80, 40, 6]], [/lantern|torch|flashlight/, [20, 35, 20]], [/chandelier|pendant/, [60, 60, 60]]], [30, 55, 30]); break;
    case 'machine': s = pick([[/wind ?turbine|windmill|turbine/, [60, 300, 60]], [/3d printer|cnc|laser|plotter/, [50, 50, 50]], [/water ?wheel/, [120, 120, 60]], [/crane|excavator|forklift/, [150, 200, 40]]], [60, 40, 40]); break;
    case 'container': s = pick([[/aquarium|vivarium|terrarium|tank/, [100, 50, 40]], [/planter|compost/, [100, 40, 40]], [/chest/, [80, 50, 45]], [/jewelry|lunch/, [25, 10, 15]], [/bird feeder/, [25, 25, 20]]], [60, 35, 40]); break;
    case 'appliance': s = pick([[/\bfan\b|purifier/, [40, 110, 30]], [/smoker|kiln|fridge|refrigerator/, [70, 140, 60]], [/forge|pizza oven|fire pit/, [80, 110, 70]]], [60, 90, 55]); break;
    case 'energy': s = [300, 100, 100]; break;
    case 'instrument': s = pick([[/drum|bongo|conga/, [40, 50, 40]], [/cajon/, [30, 48, 30]], [/xylophone|marimba|glockenspiel|piano|keyboard|kalimba/, [80, 10, 35]], [/ukulele/, [55, 8, 20]], [/violin/, [60, 8, 21]]], [100, 10, 38]); break;
    case 'toy': s = pick([[/arcade|pinball|claw/, [65, 170, 70]], [/marble run|rube goldberg/, [60, 80, 10]], [/dollhouse/, [70, 70, 35]], [/table/, [140, 80, 75]]], [40, 30, 30]); break;
    case 'wearable': s = pick([[/helmet|mask/, [28, 28, 28]], [/armor|armour|suit|exoskeleton/, [45, 70, 30]]], [30, 48, 18]); break;
    default: s = [60, 50, 40];
  }
  if (small && ['land_vehicle', 'watercraft', 'structure'].includes(cat) && !/\bsmall\b/.test(p)) s = s.map((v) => v / 8);
  return S(s);
}

// ---------- subsystems the AI can add to ANY design ----------
export const FEATURES = [
  { key: 'wheels', label: 'Wheels', re: /\b(wheel|wheels|rolling|caster|mobile|on wheels)\b/ },
  { key: 'motor', label: 'Motor drive', re: /\b(motor|motors|motorized|motorised|engine|self.?propelled|drives?|moving|spinning|rotating)\b/ },
  { key: 'battery', label: 'Battery power', re: /\b(battery|batteries|cordless|rechargeable|portable power)\b/ },
  { key: 'solar', label: 'Solar power', re: /\b(solar|sun.?powered|sunlight)\b/ },
  { key: 'lights', label: 'LED lighting', re: /\b(light|lights|led|leds|glow|illuminat\w*|lit|rgb)\b/ },
  { key: 'controller', label: 'Smart controller', re: /\b(smart|automatic|automated|programmable|arduino|raspberry|microcontroller|app|wifi|wi-fi|bluetooth|iot|autonomous|ai)\b/ },
  { key: 'sensor', label: 'Sensors', re: /\b(sensor|sensors|detect\w*|avoid\w*|measur\w*|temperature|humidity|motion|distance|ultrasonic|lidar)\b/ },
  { key: 'camera', label: 'Camera', re: /\b(camera|video|fpv|record\w*|vision|webcam)\b/ },
  { key: 'speaker', label: 'Speaker / sound', re: /\b(speaker|sound|music|audio|alarm|buzzer|voice)\b/ },
  { key: 'screen', label: 'Display screen', re: /\b(screen|display|monitor|touchscreen|lcd|oled)\b/ },
  { key: 'remote', label: 'Remote control', re: /\b(remote|rc|radio.?control\w*|wireless control)\b/ },
  { key: 'propeller', label: 'Propeller', re: /\b(propeller|prop|thrust|propelled)\b/ },
  { key: 'wings', label: 'Wings', re: /\b(wing|wings|fly|flying|glide|gliding)\b/ },
  { key: 'pump', label: 'Pump & plumbing', re: /\b(pump|irrigation|fountain|watering|sprinkler|hydraulic)\b/ },
  { key: 'fan', label: 'Fan / ventilation', re: /\b(fan|ventilat\w*|cooling|cooled|vent|air.?flow)\b/ },
  { key: 'heater', label: 'Heating element', re: /\b(heat|heated|heating|heater|warm\w*)\b/ },
  { key: 'arm', label: 'Robotic arm', re: /\b(arm|gripper|grabber|claw|pick up|manipulator)\b/ },
  { key: 'roof', label: 'Roof / canopy', re: /\b(roof|canopy|cover|covered|shade|awning)\b/ },
  { key: 'handle', label: 'Carry handle', re: /\b(handle|carry|portable|tote)\b/ },
  { key: 'lock', label: 'Lock / security', re: /\b(lock|locking|secure|security|safe|keypad)\b/ },
  { key: 'waterproof', label: 'Waterproofing', re: /\b(waterproof|water.?resistant|weatherproof|outdoor|rain)\b/ },
  { key: 'insulation', label: 'Insulation', re: /\b(insulat\w*|thermal|keep warm|keep cold)\b/ },
];
const ELECTRIC = ['motor', 'lights', 'controller', 'sensor', 'camera', 'speaker', 'screen', 'pump', 'fan', 'remote', 'arm'];

function addFeature(key, b, c, bx, mount) {
  const { L, H, W } = bx, { len, accent } = c;
  const mx = mount?.x ?? 0, my = mount?.y ?? H * 0.4;
  const front = L / 2, top = bx.roofY ?? H;
  const s = (title, text, opts) => b.stage(title, text, opts);
  const u = Math.max(4, Math.min(L, W, H) * 0.18);
  switch (key) {
    case 'wheels': {
      const r = Math.max(3, Math.min(H * 0.18, 15));
      b.part('fwheel', 'Wheel / caster', `${len(2 * r)} wheel or locking swivel caster`, comp(at(torus(r * 0.75, r * 0.28, '#1d1d1f', 'rubber', 'x')), at(cyl(r * 0.55, r * 0.5, '#c9ced6', 'chrome', 'x'))), { tip: 'Look for: a load rating per wheel ≥ 1/3 of the total weight (one wheel often lifts on uneven ground), sealed bearings, and locking brakes on at least two.' });
      const st = s('Add the wheels', `Mount four ${len(2 * r)} wheels/casters at the corners with through-bolts and washers. Put locking casters at the end you push from.`);
      for (const x of [1, -1]) for (const z of [1, -1]) b.put(st, 'fwheel', [x * (L / 2 - r), r * 0.9, z * (W / 2 + r * 0.2)], [0, 90, 0]);
      break;
    }
    case 'motor': {
      b.part('fmotor', 'Electric motor', 'Electric motor with gearbox or speed controller', comp(at(capsule(u * 0.35, u * 0.6, '#2b2f36', 'metal', 'x')), at(cyl(u * 0.08, u * 0.5, '#d0d4da', 'chrome', 'x'), [u * 0.6, 0, 0])), { tip: 'Look for: torque ≥ 2x (force needed x lever/wheel radius), RPM = target speed ÷ wheel circumference, and a motor controller rated for the motor\'s stall current.' });
      b.item('fesc', 'Motor controller', 'Motor speed controller / driver matched to motor voltage and peak current', 1);
      const st = s('Install the drive motor', 'Mount the motor rigidly on a bracket, align its shaft with the driven part (use a coupling, chain or belt), and connect it through the motor controller. Add a guard over exposed shafts.');
      b.put(st, 'fmotor', [mx, my, 0]);
      break;
    }
    case 'battery': {
      b.part('fbatt', 'Battery pack', 'Rechargeable battery pack with protection circuit', rbox(u * 1.4, u * 0.6, u * 0.9, '#2b2f36', 'metal', u * 0.1), { tip: 'Look for: capacity (Wh) = average power (W) x run-time (h) x 1.25, a built-in battery management system (BMS), and a matching charger. LiFePO4 is the safest chemistry for larger packs.' });
      b.item('ffuse', 'Fuse & switch', 'Main fuse (rated just above max current) and a master power switch', 1);
      const st = s('Mount the battery and power switch', 'Fix the battery low and central (better stability) in a strap or bracket it cannot slide out of. Fit a fuse on the positive lead within 15 cm of the battery, then the master switch.', { warn: 'Never short battery terminals; disconnect the battery before working on any wiring.' });
      b.put(st, 'fbatt', [mx - u * 0.5, Math.max(u * 0.4, my - u * 0.6), 0]);
      break;
    }
    case 'solar': {
      const pw = Math.max(L * 0.6, 10), pd = Math.max(W * 0.6, 8);
      b.part('fsolar', 'Solar panel', `Solar panel about ${len(pw)} x ${len(pd)}`, comp(at(rbox(pw, 1.2, pd, '#c9ced6', 'metal', 0.4)), at(box(pw * 0.94, 1.4, pd * 0.92, '#16264f', 'solar'))), { tip: 'Look for: monocrystalline cells, wattage = daily energy need (Wh) ÷ peak sun hours ÷ 0.7, and a charge controller (MPPT preferred) between panel and battery.' });
      b.item('fmppt', 'Solar charge controller', 'MPPT or PWM solar charge controller matched to panel voltage and battery chemistry', 1);
      const st = s('Mount the solar panel', 'Mount the panel on top facing the sun (tilted toward the equator if fixed), route the cable through a waterproof gland and connect it via the charge controller — never directly to the battery.');
      b.put(st, 'fsolar', [0, top + 2, 0]);
      break;
    }
    case 'lights': {
      b.part('flight', 'LED light', 'LED module or strip with diffuser', comp(at(rbox(1.2, u * 0.4, W * 0.5, '#2b2f36', 'metal', 0.3)), at(box(1.4, u * 0.25, W * 0.45, '#fff4d6', 'emissive'))), { tip: 'Look for: the same voltage as your power system (5/12/24 V), warm white (2700-3000 K) for ambience or 5000 K for task lighting, and an aluminium mount for heat.' });
      const st = s('Add the LED lighting', 'Mount the LEDs on an aluminium channel or heat-sink, add a current-limiting driver or resistor if needed, and run the wiring through grommets.');
      b.put(st, 'flight', [front + 0.7, my + u * 0.4, 0]);
      break;
    }
    case 'controller': {
      b.part('fmcu', 'Controller board', 'Microcontroller development board (with Wi-Fi/Bluetooth if it needs an app)', comp(at(box(u * 1.2, 0.3, u * 0.8, '#1d6b3a', 'pcb')), at(box(u * 0.3, 0.5, u * 0.3, '#111', 'plastic'), [0, 0.4, 0]), at(box(u * 0.2, 0.8, u * 0.15, '#c9ced6', 'metal'), [u * 0.45, 0.5, 0])), { tip: 'Look for: enough I/O pins for every sensor/actuator plus 20% spare, 3.3 V or 5 V logic matching your modules, built-in wireless if you want phone control, and good community libraries.' });
      const st = s('Install the controller', 'Mount the controller on standoffs inside an enclosure, connect inputs and outputs with labelled plugs, and upload a simple test program for each function before writing the full logic.', { details: ['Write the control logic as a state machine (idle → active → fault).', 'Add a watchdog/fail-safe that stops all motors if communication is lost.'] });
      b.put(st, 'fmcu', [mx + u * 0.6, my + u * 0.5, 0]);
      break;
    }
    case 'sensor': {
      b.part('fsensor', 'Sensor module', 'Sensor module for the quantity you need to measure', comp(at(rbox(1, u * 0.5, u * 0.9, '#0b4f8a', 'pcb', 0.2)), at(cyl(u * 0.15, 1.2, '#c9ced6', 'chrome', 'x'), [0.6, 0, u * 0.22]), at(cyl(u * 0.15, 1.2, '#c9ced6', 'chrome', 'x'), [0.6, 0, -u * 0.22])), { tip: 'Look for: a measuring range that covers your use, the right interface (analog, I²C, UART) for your controller, and a weather-sealed version for outdoor use.' });
      const st = s('Fit the sensors', 'Mount sensors with a clear view of what they measure (front-facing for distance, shaded and ventilated for temperature). Calibrate each against a known reference.');
      b.put(st, 'fsensor', [front + 0.5, my + u * 0.2, 0]);
      break;
    }
    case 'camera': {
      b.part('fcam', 'Camera module', 'Compact camera module with wide-angle lens', comp(at(rbox(u * 0.5, u * 0.5, u * 0.5, '#111', 'plastic', u * 0.08)), at(cyl(u * 0.16, u * 0.2, '#1d2b3a', 'glass', 'x'), [u * 0.3, 0, 0])), { tip: 'Look for: the resolution/frame rate you need, a lens field of view of 90-150° for driving/flying, low-light performance and the right connector for your controller.' });
      const st = s('Mount the camera', 'Mount the camera on a vibration-damped bracket with a clear forward view, slightly tilted for the expected direction of travel.');
      b.put(st, 'fcam', [front - u * 0.2, top + u * 0.3, 0]);
      break;
    }
    case 'speaker': {
      b.part('fspk', 'Speaker', 'Full-range speaker driver with amplifier module', comp(at(cyl(u * 0.45, u * 0.2, '#2b2f36', 'metal', 'x')), at(cyl(u * 0.36, u * 0.1, '#111', 'rubber', 'x', u * 0.1), [u * 0.12, 0, 0])), { tip: 'Look for: an amplifier whose output (W) matches the speaker\'s rated power and impedance (4/8 Ω), and an enclosure volume per the speaker\'s datasheet.' });
      const st = s('Add the speaker and amplifier', 'Cut a hole for the speaker, seal it with foam gasket tape and wire it to the amplifier, keeping audio wires away from motor/power wires to avoid hum.');
      b.put(st, 'fspk', [front + u * 0.1, my, W * 0.25]);
      break;
    }
    case 'screen': {
      b.part('fscreen', 'Display', 'Display panel with protective bezel', rbox(1, u * 0.8, u * 1.3, '#0e2a47', 'screen', 0.3), { tip: 'Look for: OLED for contrast, e-ink for low power, IPS LCD for daylight; check viewing angles and that your controller has a driver library.' });
      const st = s('Mount the display', 'Cut a clean window for the display, mount it behind a bezel with foam tape, and connect it with a short ribbon cable.');
      b.put(st, 'fscreen', [front + 0.5, my + u * 0.6, 0]);
      break;
    }
    case 'remote': {
      b.part('fremote', 'Remote control', 'Handheld transmitter and matching receiver', comp(at(rbox(u * 1.2, u * 0.35, u * 2, '#2b2f36', 'plastic', u * 0.1)), at(cyl(u * 0.04, u * 1.2, '#888', 'metal'), [-u * 0.4, u * 0.6, u * 0.7]), at(cyl(u * 0.15, u * 0.2, accent, 'paint'), [0, u * 0.25, -u * 0.4]), at(cyl(u * 0.15, u * 0.2, accent, 'paint'), [0, u * 0.25, u * 0.4])), { tip: 'Look for: enough channels for every function, a 2.4 GHz digital link with fail-safe, and range at least 2x what you need.' });
      const st = s('Pair the remote control', 'Bind the receiver to the transmitter, assign each control channel, and set the fail-safe so everything stops if the signal is lost.');
      b.put(st, 'fremote', [front + L * 0.3 + u * 2, u * 0.2, W * 0.6]);
      break;
    }
    case 'propeller': {
      b.part('fprop', 'Propeller', 'Propeller matched to the motor', comp(at(sphere(u * 0.2, '#d0d4da', 'chrome')), ...[0, 120, 240].map((a) => at(rbox(0.5, u * 0.9, u * 0.3, accent, 'paint', 0.2), [0, Math.cos(a / 57.3) * u * 0.45, Math.sin(a / 57.3) * u * 0.45], [a, 0, 15]))), { tip: 'Look for: diameter and pitch from the motor maker\'s thrust table; larger/slower props are more efficient, smaller/faster ones give top speed.' });
      const st = s('Fit the propeller', 'Fit the propeller on the motor shaft with a locking nut, check the direction of thrust, and add a guard if people could come near it.', { warn: 'Spinning propellers cause serious injuries — test with the craft held securely and everyone behind the prop line.' });
      b.put(st, 'fprop', [-L / 2 - 1, my, 0]);
      break;
    }
    case 'wings': {
      b.part('fwing', 'Wing', 'Lightweight wing panel with a cambered airfoil', wing(W * 0.9, L * 0.35, L * 0.03, '#f5f5f5', 'paint'), { tip: 'Look for: wing area large enough that wing loading stays low (light aircraft: < 30 g/dm² for models), with a spar along 25-30% of the chord.' });
      const st = s('Attach the wings', 'Attach a wing to each side with the leading edge slightly raised (2-3° angle of incidence). The centre of gravity must sit 25-33% back from the leading edge.');
      b.put(st, 'fwing', [0, my, W / 2 + W * 0.45]); b.put(st, 'fwing', [0, my, -W / 2 - W * 0.45]);
      break;
    }
    case 'pump': {
      b.part('fpump', 'Pump', 'Water pump with inlet filter', comp(at(capsule(u * 0.35, u * 0.4, '#1f5fbf', 'paint', 'x')), at(cyl(u * 0.12, u * 0.6, '#c9ced6', 'chrome', 'y'), [u * 0.3, u * 0.4, 0])), { tip: 'Look for: flow rate (L/min) at your required head height on the pump curve, food-safe materials for drinking water, and a dry-run protection feature.' });
      b.part('fpipe', 'Tubing', 'Flexible tubing with hose clamps', tube([[0, 0, 0], [L * 0.2, H * 0.3, 0], [L * 0.4, H * 0.35, 0]], Math.max(0.4, u * 0.08), '#9ad1ff', 'glass'));
      const st = s('Install the pump and plumbing', 'Mount the pump below the water source if possible (self-priming), connect tubing with hose clamps, and add a filter on the inlet.');
      b.put(st, 'fpump', [mx, Math.max(u * 0.4, my - u * 0.5), W * 0.25]); b.put(st, 'fpipe', [mx, my, W * 0.25]);
      break;
    }
    case 'fan': {
      b.part('ffan', 'Fan', 'Axial fan with finger guard', comp(at(rbox(u, u, u * 0.25, '#2b2f36', 'plastic', u * 0.1)), ...[0, 72, 144, 216, 288].map((a) => at(rbox(u * 0.35, u * 0.12, 0.3, accent, 'paint', 0.1), [Math.cos(a / 57.3) * u * 0.22, Math.sin(a / 57.3) * u * 0.22, 0], [0, 0, a]))), { tip: 'Look for: airflow (CFM / m³/h) to change the air volume several times a minute, low noise (dBA), and the right voltage; ball-bearing fans last longest.' });
      const st = s('Add the ventilation fan', 'Cut the fan opening, fit the fan blowing in on the cool side with an exhaust vent on the opposite side for cross-flow.');
      b.put(st, 'ffan', [-L / 2 - 0.5, my + u * 0.4, 0], [0, 90, 0]);
      break;
    }
    case 'heater': {
      b.part('fheat', 'Heating element', 'Heating element with thermostat and thermal cut-out', torus(u * 0.4, u * 0.06, '#ff6a2a', 'emissive', 'y'), { tip: 'Look for: wattage = mass x specific heat x ΔT ÷ time, an adjustable thermostat, and a separate over-temperature safety cut-out.' });
      const st = s('Install the heating element', 'Mount the element on ceramic standoffs away from any flammable material, wire it through a thermostat and a thermal fuse.', { warn: 'Mains-powered heaters must be wired by a qualified person, use earth-bonded metal parts and an RCD/GFCI.' });
      b.put(st, 'fheat', [0, Math.max(u * 0.3, my - u * 0.3), 0]);
      break;
    }
    case 'arm': {
      b.part('farm', 'Robotic arm', 'Compact 3-axis arm with gripper, servo-driven', comp(at(cyl(u * 0.35, u * 0.2, '#2b2f36', 'metal')), at(rbox(u * 0.2, u * 1.2, u * 0.2, accent, 'paint', 0.3), [u * 0.2, u * 0.6, 0], [0, 0, -20]), at(rbox(u * 0.16, u * 0.9, u * 0.16, '#f5f5f5', 'paint', 0.3), [u * 0.6, u * 1.2, 0], [0, 0, -70]), at(rbox(u * 0.3, u * 0.12, u * 0.3, '#2b2f36', 'metal', 0.2), [u * 1.0, u * 1.25, 0])), { tip: 'Look for: servo torque ≥ (payload + arm weight) x reach x 2, metal gears for the shoulder joint, and a gripper opening wider than your largest object.' });
      const st = s('Mount the robotic arm', 'Bolt the arm base to the strongest point of the structure. Set servo limits in software so the arm cannot hit its own body.');
      b.put(st, 'farm', [L * 0.2, top, 0]);
      break;
    }
    case 'roof': {
      b.part('froof', 'Roof / canopy', 'Weatherproof roof or canopy panel', rbox(L * 1.1, Math.max(1, u * 0.12), W * 1.1, accent, 'paint', 0.5), { tip: 'Look for: UV-stable material (polycarbonate, coated steel or treated canvas) and a slope of at least 5° so water runs off.' });
      const st = s('Add the roof / canopy', 'Support the roof on posts or brackets at each corner and tilt it slightly so rain drains off the back.');
      b.put(st, 'froof', [0, top + u * 1.5, 0], [0, 0, -4]);
      break;
    }
    case 'handle': {
      b.part('fhandle', 'Carry handle', 'Comfortable carry handle', comp(at(torus(Math.min(L, W) * 0.15, Math.max(0.5, u * 0.08), '#2b2f36', 'rubber', 'z'))), { tip: 'Look for: a grip at least 10 cm wide, rated for 2x the loaded weight, through-bolted rather than screwed into thin material.' });
      const st = s('Fit the carry handle', 'Through-bolt the handle at the balance point (centre of gravity) so the object hangs level when carried.');
      b.put(st, 'fhandle', [0, top, 0]);
      break;
    }
    case 'lock': {
      b.part('flock', 'Lock', 'Lock or keypad latch', comp(at(rbox(1, u * 0.5, u * 0.35, '#c9ced6', 'chrome', 0.2)), at(cyl(u * 0.08, 1.2, '#2b2f36', 'metal', 'x'), [0.4, 0, 0])), { tip: 'Look for: a hardened shackle or bolt, a mount that can\'t be unscrewed from outside, and an electronic version with a mechanical key override.' });
      const st = s('Fit the lock', 'Fit the lock with fasteners that are only accessible from inside, and align the strike so it closes without force.');
      b.put(st, 'flock', [front + 0.5, my, W * 0.3]);
      break;
    }
    case 'waterproof': s('Waterproof everything', 'Seal seams with marine sealant, use cable glands where wires pass through, add drain holes at the lowest points, and use stainless or galvanised fasteners. Aim for IP65 or better on electronics.'); b.item('fseal', 'Sealing kit', 'Marine-grade sealant, cable glands and gasket tape', 1); break;
    case 'insulation': s('Insulate', 'Line the inside with rigid foam or mineral-wool insulation, tape the joints and keep a vapour barrier on the warm side.'); b.item('finsul', 'Insulation', 'Rigid foam board or mineral wool, plus foil tape', 1); break;
  }
}

function nounPhrase(p, cat) {
  let best = '';
  for (const n of CATEGORIES[cat]?.nouns || []) if (p.includes(n) && n.length > best.length) best = n;
  if (!best) for (const c of Object.values(CATEGORIES)) for (const n of c.nouns) if (new RegExp(`\\b${n}s?\\b`).test(p) && n.length > best.length) best = n;
  if (!best) {
    const w = p.trim().replace(/^(how (do|to|can) (i|you|we) )?(build|make|engineer|design|create|construct)( me)?( a| an| the| my)?/, '').replace(/\b(that|which|with|for|to|using|from|out of)\b.*$/, '').trim().split(' ').filter(Boolean).slice(-3).join(' ');
    best = w.replace(/^(a|an|the|my|some)\s+/, '') || 'device';
  }
  return best;
}
const titleCase = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\b(Rc|Led|Cnc|3d|Ai|Diy|Pc|Tv|Ev|Rgb)\b/g, (m) => m.toUpperCase());
const PREFIX = { solar: 'Solar-Powered', motor: 'Motorized', controller: 'Smart', remote: 'Remote-Controlled', lights: 'Illuminated', wheels: 'Mobile', waterproof: 'Weatherproof' };

export function universalPlan({ category, prompt, extracted, overrides = {}, settings = {} }) {
  const p = ' ' + prompt.toLowerCase() + ' ';
  const units = settings.units || 'imperial';
  const len = (cm) => units === 'metric' ? (cm >= 100 ? `${(cm / 100).toFixed(2)} m` : `${Math.round(cm * 10) / 10} cm`) : (() => { const inch = cm / 2.54; if (inch >= 36) { const ft = Math.floor(inch / 12); const r = Math.round(inch - ft * 12); return r ? `${ft}' ${r}"` : `${ft}'`; } return `${Math.round(inch * 4) / 4}"`; })();
  let [L, H, W] = defaultSize(category, p);
  const ex = extracted || {};
  const cm = (v) => v * 2.54;
  if (ex.length) L = cm(ex.length); if (ex.height) H = cm(ex.height);
  if (ex.width) { if (ex.length) W = cm(ex.width); else if (!ex.length && L > W) L = cm(ex.width); else W = cm(ex.width); }
  if (ex.depth) W = cm(ex.depth);
  if (ex.scale && !ex.length && !ex.height && !ex.width) { L *= ex.scale; H *= ex.scale; W *= ex.scale; }
  if (overrides.L) L = +overrides.L; if (overrides.H) H = +overrides.H; if (overrides.W) W = +overrides.W;
  const matKey = overrides.material && overrides.material !== 'auto' ? overrides.material : detectMaterial(p) || CAT_MAT[category] || 'wood';
  const accent = settings.accent || '#ff7a1a';
  const mat = { ...MATERIALS[matKey], key: matKey };
  if (matKey === 'plastic' || matKey === 'fabric') mat.color = accent;
  const ctx = { L, H, W, p, mat, len, accent, roof: '#5b6470', skill: settings.skill || 'intermediate' };

  const b = new Builder();
  const req = b.stage('Define requirements & sketch', '');
  const gen = GEN[category] || GEN.custom;
  const out = gen(b, ctx);
  const box = { ...out.box, roofY: out.roofY };

  // subsystems
  let feats = overrides.features != null ? String(overrides.features).split(',').filter(Boolean) : FEATURES.filter((f) => f.re.test(p)).map((f) => f.key);
  const covers = new Set(out.covers || []);
  if (overrides.features == null) {
    feats = feats.filter((k) => !covers.has(k));
    if (feats.some((k) => ELECTRIC.includes(k)) && !feats.includes('battery') && !feats.includes('solar') && !covers.has('battery') && !/\b(plug|mains|wall power|corded)\b/.test(p)) feats.push('battery');
    if (feats.includes('solar') && !feats.includes('battery') && !covers.has('battery')) feats.push('battery');
    if (category === 'robot' && !covers.has('controller') && !feats.includes('controller')) feats.push('controller');
    if (['land_vehicle', 'watercraft', 'aircraft'].includes(category) && !covers.has('motor') && !feats.includes('motor') && /\b(solar|battery|electric|powered|motor)/.test(p) && !/\b(glider|kite|sail|paper|balloon|hang)/.test(p)) feats.unshift('motor');
  }
  const nounEarly = nounPhrase(p, category);
  if (overrides.features == null) feats = feats.filter((k) => !FEATURES.find((f) => f.key === k).re.test(' ' + nounEarly + ' '));
  if (overrides.features == null && category === 'robot' && !covers.has('battery') && !feats.includes('battery') && !feats.includes('solar')) feats.push('battery');
  feats = [...new Set(feats)];
  for (const k of feats) addFeature(k, b, ctx, box, out.mount);
  const electric = feats.some((k) => ELECTRIC.includes(k) || k === 'battery' || k === 'solar') || ['electronics', 'robot', 'energy', 'lighting'].includes(category);
  if (electric) {
    b.stage('Wire and test the electronics', 'Draw a wiring diagram first. Use a fused, switched main supply; red for positive, black for ground; crimp or solder and heat-shrink every joint; strain-relieve every cable. Power up with a current-limited supply first and check every function one by one.', { details: ['Size wire for the current: roughly 22 AWG/0.3 mm² up to 1 A, 18 AWG/0.75 mm² up to 5 A, 12 AWG/3.3 mm² up to 20 A.', 'Keep signal wires away from motor and power wires.'] });
    b.item('wire', 'Wire & connectors', 'Stranded copper wire in red/black sized for the current, heat-shrink, crimp connectors and cable ties', 1);
  }
  b.item('fasteners', 'Fasteners', `Assorted fasteners for ${mat.name}: ${mat.joinery}`, 1);
  b.stage('Finish the surfaces', mat.finish);
  b.stage('Test, tune and stay safe', `Test the ${nounPhrase(p, category)} step by step: first check every joint, fastener and connection, then use it gently and increase load, speed or power in stages while watching for flex, heat, noise or wobble. Fix anything that changes as it warms up, and keep these instructions with the build for maintenance.`, { warn: 'Wear eye protection when cutting, drilling or testing; follow the safety instructions of every tool and component.' });

  // requirement stage text (written last so it can summarise everything)
  const noun = nounPhrase(p, category);
  const prefixes = feats.filter((k) => !(k === 'remote' && /\brc\b|remote/.test(noun)) && !(k === 'solar' && /solar/.test(noun)) && !(k === 'lights' && /light|lamp|lantern/.test(noun))).map((k) => PREFIX[k]).filter(Boolean).slice(0, 2);
  const title = titleCase([...prefixes, noun].join(' '));
  const featLabels = feats.map((k) => FEATURES.find((f) => f.key === k).label.toLowerCase());
  req.text = `Target: a ${title.toLowerCase()} about ${len(L)} long x ${len(W)} wide x ${len(H)} tall, built mainly from ${mat.name}${featLabels.length ? `, with ${featLabels.join(', ')}` : ''}. Sketch it in three views (front, side, top) at this size, mark every dimension, and list what it must do, who will use it, and the maximum load it must carry.`;
  req.details = ['Choose the simplest design that meets every requirement — every extra part is another thing that can fail.', 'Make a cheap mock-up (cardboard or scrap) to check size and proportions before cutting good material.'];

  // skill level shaping
  const steps = b.stages.map((s) => ({ ...s }));
  if (ctx.skill === 'beginner') steps.forEach((s) => { s.details = [...(s.details || []), 'Beginner tip: measure twice, cut once — and dry-fit everything before glue or final fasteners.']; });
  if (ctx.skill === 'expert') steps.forEach((s) => { delete s.details; });

  const parts = [...b.parts.values()].map((pt) => ({ ...pt, qty: pt.qty || 1 }));
  for (const pt of parts) if (!pt.tip) pt.tip = `Look for: ${pt.spec.toLowerCase().includes('look for') ? '' : 'quality that matches the loads and environment it will see; buy 10% extra of consumables.'}`;

  const tools = [...mat.tools];
  if (electric) tools.push('Soldering iron (temperature-controlled) and solder', 'Multimeter', 'Wire stripper and crimper', 'Heat gun / heat-shrink');
  if (feats.includes('controller') || category === 'robot' || category === 'electronics') tools.push('Computer for programming the controller');
  tools.push('Safety glasses, hearing protection and dust mask');

  const size = Math.cbrt(L * H * W) / 50;
  const base = { furniture: 120, structure: 900, land_vehicle: 450, watercraft: 500, aircraft: 180, robot: 220, electronics: 90, lighting: 60, machine: 250, container: 60, appliance: 260, energy: 900, instrument: 150, toy: 50, wearable: 80, custom: 150 }[category] || 150;
  const low = Math.round((base * Math.max(0.3, size) + feats.length * 25) / 10) * 10, high = Math.round(low * 2.2 / 10) * 10;
  const hours = Math.round((4 + steps.length * 1.5) * Math.max(0.6, Math.min(4, size)));
  const score = steps.length + feats.length * 1.5 + (electric ? 3 : 0) + (['aircraft', 'robot', 'watercraft', 'machine'].includes(category) ? 3 : 0);
  return {
    title, noun, features: feats, material: matKey, dims: { L, H, W }, units,
    plan: {
      summary: `Ingeniare designed a ${title.toLowerCase()} (${CATEGORIES[category]?.title || 'custom'} archetype): ${len(L)} x ${len(W)} x ${len(H)}, ${mat.name} construction${featLabels.length ? ', with ' + featLabels.join(', ') : ''}. The parts list describes the type of item you need and what to look for — choose any brand that meets the spec.`,
      difficulty: score > 16 ? 'Advanced' : score > 11 ? 'Intermediate' : 'Beginner',
      time: hours > 40 ? `${Math.round(hours / 8)} days` : `${hours} hours`,
      cost: `$${low.toLocaleString()} – $${high.toLocaleString()} (estimate)`,
      tools: [...new Set(tools)], parts, steps,
    },
  };
}
