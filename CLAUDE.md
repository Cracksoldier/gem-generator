# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `index.html` directly in a browser — no build step, no server, no npm install required. It works via `file://` or any static host (GitHub Pages, etc.).

For automated testing use Playwright:
```powershell
npm init -y
npm install playwright
npx playwright install chromium
node test-app.mjs   # write a test script as needed
```
Clean up `package.json`, `package-lock.json`, and `node_modules/` before committing — they are not part of the project.

## Architecture

The app is split across four files:

| File | Contents |
|------|----------|
| `index.html` | HTML structure only — layout, controls markup, importmap, `<link>` to CSS/JS |
| `style.css` | All styles — CSS custom-property theming (`[data-theme="dark"\|"light"]`), responsive grid |
| `app.js` | ES module — three.js scene, geometry builders, UI wiring, STL export |
| `favicon.svg` | Inline SVG gem icon (flat-top diamond, accent red) |

three.js is loaded as UMD globals from jsDelivr CDN (r134) via plain `<script>` tags — no importmap, no ES modules. This keeps the app compatible with Chrome/Edge on `file://` (which blocks external ES module scripts due to CORS). `app.js` is a classic IIFE script; three.js globals are `THREE`, `THREE.OrbitControls`, `THREE.STLExporter`.

### JavaScript structure (`app.js`)

**CDN imports via importmap** (`https://esm.sh/three@0.160.0`):
- `three` — scene, camera, lights, renderer, materials
- `OrbitControls` — mouse/touch rotation and zoom
- `STLExporter` — binary STL serialisation for download

**Geometry pipeline** — pure math, no three.js geometry helpers:
- `ringPoints(n, rx, ry, shapeFn)` — samples `n` 2D `[x, y]` points around a named outline
- Shape functions (`circleShape`, `ellipseShape`, `marquiseShape`, `pearShape`, `squareShape`, `cushionShape`, `emeraldShape`) — each takes `(t, rx, ry)` and returns `[x, y]` for parameter `t ∈ [0,1)`
- `buildCap` — triangulates a flat polygon ring into a fan (table top / culet flat)
- `buildBelt(ringA, yA, ringB, yB)` — zips two rings into a quad-strip; handles same-count, 2× ratio, and generic cases
- `buildCone(tip, tipY, ring, ringY)` — collapses a ring to a single tip point (sharp culet)
- `buildGemGeometry(params)` — orchestrates the above into a `THREE.BufferGeometry` triangle soup, then calls `computeVertexNormals()`

**Ring stack** (Y axis: positive = up):
```
yTable      — table cap + top of crown belt
yGirdleTop  — top of girdle band
yGirdleBot  — bottom of girdle band
yPavMid     — intermediate pavilion ring (60% of pavilion depth)
yPavTip     — culet tip or flat
```

**UI → geometry flow**: every `<input>`/`<select>` fires `debouncedRebuild()` (80 ms debounce) → `rebuildGem()` → `buildGemGeometry(params)` → disposes old mesh, adds new `THREE.Mesh` to scene. Camera is positioned only on the first build (`firstBuild` flag).

**STL export**: `STLExporter.parse(mesh, { binary: true })` → `Blob` → programmatic `<a>` click download.

## Key conventions

- All geometry coordinates are in **millimetres** matching the UI parameters.
- Triangles are wound for outward-facing normals; `computeVertexNormals()` smooths lighting but the winding still matters for STL correctness.
- `MeshPhongMaterial` (not `MeshPhysicalMaterial`) is used — r134's physical material requires an env map for transmission to be visible. Phong with high shininess gives a gem-like specular appearance without that dependency.
- `THREE.DoubleSide` is used so inside faces are visible during orbit but the exported STL relies on correct winding for slicers.
- Adding a new cut style requires: a new shape function, an entry in `getShapeFn()`, and an `<option>` in the `#cut` select. Elongated shapes (aspect ratio ≠ 1) set `aspectY` in `buildGemGeometry`.
