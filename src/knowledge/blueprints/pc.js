import { box, cyl, comp, at, fan, pcb } from '../shapes.js';
import { usd } from '../util.js';

const TIERS = {
  budget: { price: 900, target: '1080p high / 1440p medium at 60-120 FPS',
    cpu: 'AMD Ryzen 5 9600X (6-core, AM5, 65 W)', mobo: 'MSI B650 GAMING PLUS WIFI (ATX, AM5)', ram: '32 GB (2 x 16 GB) DDR5-6000 CL30 (G.Skill Flare X5, AMD EXPO)', gpu: 'AMD Radeon RX 9060 XT 16 GB', gpuLen: 240,
    ssd: 'WD_BLACK SN770 1 TB NVMe PCIe 4.0 M.2 2280', cooler: 'Thermalright Assassin X 120 Refined SE (single tower)', coolerBig: false, psu: 'Corsair RM650e 650 W 80+ Gold, fully modular, ATX 3.1', case: 'Lian Li Lancool 207 (ATX mid-tower, 4 fans included)' },
  mid: { price: 1550, target: '1440p ultra at 100-165 FPS',
    cpu: 'AMD Ryzen 7 9800X3D (8-core, AM5, 120 W)', mobo: 'MSI MAG B850 TOMAHAWK MAX WIFI (ATX, AM5)', ram: '32 GB (2 x 16 GB) DDR5-6000 CL30 (AMD EXPO)', gpu: 'NVIDIA GeForce RTX 5070 12 GB', gpuLen: 285,
    ssd: 'Samsung 990 EVO Plus 2 TB NVMe M.2 2280', cooler: 'Thermalright Peerless Assassin 120 SE (dual tower)', coolerBig: true, psu: 'Corsair RM750e 750 W 80+ Gold, ATX 3.1, native 12V-2x6', case: 'Lian Li Lancool 217 (ATX mid-tower)' },
  high: { price: 4200, target: '4K ultra with ray tracing at 100+ FPS',
    cpu: 'AMD Ryzen 9 9950X3D (16-core, AM5, 170 W)', mobo: 'ASUS ROG STRIX X870E-E GAMING WIFI (ATX, AM5)', ram: '64 GB (2 x 32 GB) DDR5-6000 CL30 (AMD EXPO)', gpu: 'NVIDIA GeForce RTX 5090 32 GB', gpuLen: 304,
    ssd: 'Samsung 9100 PRO 2 TB NVMe PCIe 5.0 M.2 2280', cooler: 'Arctic Liquid Freezer III 360 AIO', coolerBig: true, aio: true, psu: 'Corsair HX1200i 1200 W 80+ Platinum, ATX 3.1, native 12V-2x6', case: 'Lian Li O11 Dynamic EVO XL (full tower)' },
};

export default {
  id: 'pc', title: 'Custom Gaming PC Build', domain: 'Computers', unit: 'mm', icon: '🖥️',
  params: [{ key: 'tier', label: 'Build tier', type: 'select', options: ['budget', 'mid', 'high'], default: 'mid', from: (e) => (e.budget ? (e.budget < 1150 ? 'budget' : e.budget < 2600 ? 'mid' : 'high') : e.tier) }],
  generate(p) {
    const t = TIERS[p.tier];
    const CW = 230, CH = 460, CD = 450, mx = -CW / 2 + 12;
    const moboY = CH - 25 - 152, moboZ = -CD / 2 + 15 + 122;
    const cpuY = moboY + 50, cpuZ = moboZ - 10;
    const shell = comp(
      at(box(CW, 4, CD, '#3a404c', 'metal'), [0, 2, 0]), at(box(CW, 4, CD, '#3a404c', 'metal'), [0, CH - 2, 0]),
      at(box(CW, CH, 4, '#3a404c', 'metal'), [0, CH / 2, -CD / 2 + 2]), at(box(CW, CH, 4, '#3a4150', 'glass'), [0, CH / 2, CD / 2 - 2]),
      at(box(4, CH, CD, '#3a404c', 'metal'), [-CW / 2 + 2, CH / 2, 0]), at(box(CW - 8, 4, 180, '#3a404c', 'metal'), [0, 100, -CD / 2 + 92]),
    );
    const cooler = t.aio
      ? comp(at(cyl(30, 40, '#111', 'plastic', 'x')), at(box(8, 30, 10, '#111', 'rubber'), [10, 40, 0]))
      : comp(at(box(150, 125, t.coolerBig ? 110 : 55, '#c9ccd1', 'metal'), [0, 0, 0]), at(fan(120), [0, 0, (t.coolerBig ? 0 : 40)], [90, 0, 0]));
    return {
      summary: `A ${p.tier}-tier AM5 gaming PC (~${usd(t.price)} at time of writing) targeting ${t.target}: ${t.cpu}, ${t.gpu}, ${t.ram}, ${t.ssd}. Prices and stock change — verify before buying.`,
      difficulty: 'Intermediate', time: '2-3 hours', cost: '~' + usd(t.price),
      tools: ['#2 Phillips screwdriver (magnetic, 6" shaft)', 'Anti-static wrist strap (or touch the PSU case often)', 'Zip ties / velcro straps', 'Flashlight', 'USB stick (16 GB+) with the Windows 11 Media Creation Tool', 'Thermal paste if not pre-applied (Arctic MX-6)'],
      parts: [
        { id: 'case', name: 'Case', spec: t.case, qty: 1, shape: shell },
        { id: 'glass', name: 'Tempered-glass side panel', spec: 'Included with case', qty: 1, shape: box(4, CH, CD, '#9fc6e0', 'glass') },
        { id: 'mobo', name: 'Motherboard', spec: t.mobo, qty: 1, shape: comp(at(box(1.6, 305, 244, '#2f3540', 'pcb')), at(box(20, 60, 30, '#3a3d44', 'metal'), [10, 110, -100]), at(box(20, 30, 100, '#3a3d44', 'metal'), [10, 140, -30]), at(box(18, 100, 40, '#3a3d44', 'metal'), [9, -60, 80])) },
        { id: 'cpu', name: 'CPU', spec: t.cpu, qty: 1, shape: box(4, 40, 40, '#d4d4d4', 'metal') },
        { id: 'ssd', name: 'SSD', spec: t.ssd, qty: 1, shape: box(3, 22, 80, '#111', 'pcb') },
        { id: 'ram', name: 'Memory (per stick)', spec: t.ram, qty: 2, shape: comp(at(box(34, 133, 7, '#2c2c2c', 'metal')), at(box(4, 133, 7.5, '#e0e0e0', 'emissive'), [18, 0, 0])) },
        { id: 'cooler', name: 'CPU cooler', spec: t.cooler, qty: 1, shape: cooler },
        ...(t.aio ? [{ id: 'radiator', name: '360 mm radiator', spec: 'Arctic Liquid Freezer III 360 radiator + 3 x P12 fans', qty: 1, shape: comp(at(box(120, 38, 400, '#111', 'metal')), ...[-130, 0, 130].map((z) => at(fan(120), [0, -32, z]))) }] : []),
        { id: 'gpu', name: 'Graphics card', spec: t.gpu, qty: 1, shape: comp(at(box(130, 55, t.gpuLen, '#26282d', 'metal')), at(box(4, 50, t.gpuLen - 10, '#76b900', 'emissive'), [64, 0, 0]), ...[-1, 0, 1].map((k) => at(cyl(42, 4, '#111', 'plastic', 'y'), [0, -29, k * (t.gpuLen / 3.2)]))) },
        { id: 'psu', name: 'Power supply', spec: t.psu, qty: 1, shape: comp(at(box(150, 86, 160, '#151515', 'metal')), at(cyl(60, 4, '#333', 'plastic', 'y'), [0, 44, 0])) },
        { id: 'fans', name: 'Case fans', spec: 'Included case fans (front intake x3)', qty: 1, shape: comp(...[0, 135, 270].map((y) => at(fan(120), [0, y, 0], [90, 0, 0]))) },
        { id: 'os', name: 'Operating system', spec: 'Windows 11 Home (USB installer) or Linux (e.g. Fedora / Ubuntu)', qty: 1, shape: null },
      ],
      steps: [
        { title: 'Prepare the case', text: `Lay the ${t.case} on its side, remove both side panels and store the glass panel safely. Check the pre-installed motherboard standoffs line up with all 9 ATX holes. Unbox the motherboard and set it on its box (a good anti-static work surface).`, add: [{ part: 'case', p: [0, 0, 0] }] },
        { title: 'Install the CPU', text: 'Lift the AM5 socket retention lever and open the load plate (leave the plastic cover on — it pops off when you close the plate). Align the gold triangle on the CPU corner with the triangle on the socket, lower it straight down with NO pressure, close the plate and press the lever down under its hook.', warn: 'Never touch the socket pins (LGA) — one bent pin can kill the board.', add: [{ part: 'mobo', p: [mx, moboY, moboZ] }, { part: 'cpu', p: [mx + 3, cpuY, cpuZ] }] },
        { title: 'Install the NVMe SSD', text: `Remove the heatsink over the top M.2 slot (M2_1 — wired directly to the CPU). Slide the ${t.ssd} in at 30°, press it down, lock it with the latch/screw, peel the thermal-pad film and refit the heatsink.`, add: [{ part: 'ssd', p: [mx + 3, cpuY - 85, cpuZ - 20] }] },
        { title: 'Install the RAM', text: 'Open the clips and install the two sticks in slots A2 and B2 (2nd and 4th from the CPU — check the manual). Line up the notch and press each end firmly until both clips click.', add: [{ part: 'ram', p: [mx + 18, cpuY, cpuZ + 62] }, { part: 'ram', p: [mx + 18, cpuY, cpuZ + 82] }] },
        { title: 'Mount the CPU cooler', text: t.aio ? 'Fit the AM5 bracket from the Liquid Freezer III kit (it uses the stock backplate). Mount the 360 mm radiator to the TOP of the case, fans blowing up (exhaust), tubes at the front. Apply a pea-sized dot of paste only if the pump block has none, and screw the pump down in a cross pattern.' : `Remove the stock AM5 plastic retention clips, keep the backplate, and fit the ${t.cooler} mounting bars. Apply a pea-sized dot of thermal paste in the centre of the CPU, lower the tower straight down and tighten the spring screws alternately until they stop. Clip the fan on, blowing toward the rear exhaust fan, and plug it into CPU_FAN.`, add: [{ part: 'cooler', p: [mx + (t.aio ? 25 : 78), cpuY, cpuZ] }, ...(t.aio ? [{ part: 'radiator', p: [0, CH - 30, 0] }] : [])] },
        { title: 'Install the motherboard and PSU', text: `Lower the board onto the standoffs, push it toward the rear I/O cutout and drive the 9 motherboard screws snug (not tight). Slide the ${t.psu} into the bottom shroud, fan facing DOWN over the dust filter, and fix it with 4 screws at the back. Route the 24-pin ATX, 8-pin EPS (top-left) and GPU cable through the back.`, add: [{ part: 'psu', p: [0, 50, -CD / 2 + 90] }] },
        { title: 'Install the graphics card', text: `Remove the expansion-slot covers matching the card's thickness. Open the latch on the top PCIe x16 slot, press the ${t.gpu} in until it clicks and screw it to the bracket. Connect the PSU's ${p.tier === 'budget' ? '8-pin PCIe cable(s)' : 'native 12V-2x6 (16-pin) cable — push until the latch clicks with NO visible gap'}.`, warn: p.tier === 'budget' ? undefined : 'A partly-inserted 12V-2x6 connector can overheat. Do not bend the cable within 35 mm of the plug.', add: [{ part: 'gpu', p: [mx + 70, moboY - 70, -CD / 2 + 12 + t.gpuLen / 2] }] },
        { title: 'Front-panel, fans and cable management', text: 'Connect the front-panel header (PWR_SW, RESET, HDD LED — follow the manual diagram), USB 3.0, USB-C (key-A) and HD_AUDIO. Plug case fans into SYS_FAN headers. Strap cables behind the tray every 10 cm.', add: [{ part: 'fans', p: [0, 120, CD / 2 - 20] }] },
        { title: 'First boot and BIOS setup', text: 'Close the glass panel, connect the monitor to the GRAPHICS CARD (not the motherboard), switch the PSU on and press power. AM5 memory training can take 1-3 minutes on first boot — be patient. In the BIOS: update to the latest version (USB flashback), enable EXPO profile 1 for DDR5-6000, check CPU temps < 50 °C idle, then install the OS from the USB stick.', add: [{ part: 'glass', p: [CW / 2, CH / 2, 0] }] },
      ],
    };
  },
};
