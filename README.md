<p align="center"><img src="src/assets/logo-full.png" width="260" alt="Ingeniare"></p>

# Ingeniare

**Ingeniare** is a downloadable desktop app with a built-in AI that turns any plain-English idea — "a solar-powered boat with lights", "a treehouse for my kids", "a robot arm that sorts candy", "a time machine with a screen" — into **step-by-step engineering instructions with an interactive, high-detail 3D model** that assembles itself as you go.

It runs **100% offline**. The AI ships inside the app; nothing is sent to a server.

![Ingeniare](docs/screenshot.png)

## Download

Installers for Windows (`.exe`), macOS (`.dmg`) and Linux (`.AppImage` / `.deb`) are built by GitHub Actions on every push and published on the repository's **Releases** page (and as workflow artifacts under **Actions → Build desktop installers**).

Or run from source:

```bash
npm install
npm start          # desktop app (Electron)
npm run web        # same app in your browser at http://localhost:5173
npm run dist       # build an installer for your OS into ./release
```

## How the AI works

Ingeniare's AI is a from-scratch model — no external APIs:

1. **Neural intent model** (`src/ai/network.js`, `src/ai/features.js`) — a multi-layer perceptron (2048 → 64 ReLU → 15 softmax) with backpropagation, Adam, dropout and L2, trained by `npm run train` on ~6,000 generated requests covering 400+ kinds of objects (`src/ai/universal/categories.js`). It places **any** request into one of 15 engineering archetypes: furniture, buildings/structures, land vehicles, watercraft, aircraft/spacecraft, robots, electronic devices, lighting, machines, containers, appliances, energy systems, instruments, toys/games and wearables.
2. **Head-noun detector** — finds the object you actually want built ("a *boat* with lights" → watercraft, not lighting) and blends it with the network's prediction. Requests that fit no archetype become a **custom modular invention**.
3. **Parameter extractor** (`src/ai/extract.js`) — reads sizes (ft/in/cm/mm, "4x8"), counts, materials, budgets, watts, mAh and more.
4. **Procedural designer** (`src/ai/universal/`) — generates the structure for the archetype and sub-type (e.g. chair vs. bed vs. cabinet; plane vs. drone vs. rocket vs. balloon), then adds **22 subsystems** detected in your request — motors, batteries, solar, LEDs, smart controller, sensors, camera, speaker, screen, remote control, propeller, wings, pump, fan, heater, robotic arm, roof, handle, lock, waterproofing, insulation — each with its own build step and 3D part. Toggle any subsystem on/off and resize the design with sliders; the plan and model rebuild instantly.
5. **Generic, brand-free parts lists** — every item is described by *type* plus *what to look for* (e.g. "Rechargeable battery pack with protection circuit — Look for: capacity (Wh) = power x run-time x 1.25, a built-in BMS…"), so you can buy from any maker.
6. **Expert templates** — ten deeply detailed templates (bookshelf, workbench, raised bed, birdhouse, obstacle-avoiding robot car with full code, LED desk lamp, solar power bank, gaming PC, FPV drone, trebuchet) with computed cut lists and calculations are used automatically when they match (can be turned off in Settings).
7. **High-detail 3D viewer** (`src/viewer/viewer.js`, Three.js) — physically-based materials (clear-coat paint, chrome, wood grain, glass, carbon, fabric sheen, solar cells, glowing LEDs and screens), image-based reflections, soft shadows, bevelled edges, curved boat hulls, airfoil wings, real gear teeth, tubes and lathed shapes. Parts animate into place step by step; click any part for its spec, use exploded view, ghost upcoming parts, wireframe and auto-rotate.

### Settings

Light / dark / system theme, model accent colour, imperial or metric units, skill level (beginner tips ↔ expert brevity), expert templates on/off, render quality, animation speed, floor grid and auto-rotate. Settings are remembered between sessions.

## Safety

Instructions include safety warnings, but you are responsible for your own work. Follow tool manufacturers' instructions, local codes and laws (e.g. drone registration), and battery-safety practice. Component prices and availability change — verify before buying.
