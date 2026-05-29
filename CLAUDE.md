# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

| File | Purpose |
|------|---------|
| `index.html` | Landing page — features overview, links to `app.html` |
| `app.html` | The gem generator application |

Open either file directly in a browser — no server required. `app.bundle.js` is committed so users can open `app.html` without running a build.

For automated testing use Playwright:
```powershell
npm install
npx playwright install chromium
node test-app.mjs   # write a test script as needed
```

### Build system (for maintainers)

npm and webpack bundle three.js locally. To rebuild after upgrading three.js:

```bash
npm install
npm run build      # produces app.bundle.js in the project root
npm run dev        # webpack --watch for development
```

Commit `package.json`, `package-lock.json`, and `app.bundle.js`. Do not commit `node_modules/`.

## Architecture

The app is split across four files:

| File | Contents |
|------|----------|
| `app.html` | HTML structure only — layout, controls markup, `<link>` to CSS, `<script>` to bundle |
| `style.css` | All styles — CSS custom-property theming (`[data-theme="dark"\|"light"]`), responsive grid |
| `src/app.js` | ES module source — three.js scene, geometry builders, UI wiring, STL export |
| `app.bundle.js` | Webpack production bundle (committed — users don't need npm) |
| `webpack.config.js` | Build config: entry `src/app.js`, output `app.bundle.js` in project root |
| `favicon.svg` | Inline SVG gem icon (flat-top diamond, accent red) |

three.js is installed via npm and bundled by webpack into `app.bundle.js` — a single self-executing script compatible with `file://`. `src/app.js` is an ES module; webpack handles scoping so no IIFE is needed.

### JavaScript structure (`src/app.js`)

`src/app.js` is an ES module. It imports `* as THREE from 'three'`, `{ OrbitControls } from 'three/addons/controls/OrbitControls.js'`, and `{ STLExporter } from 'three/addons/exporters/STLExporter.js'`. Webpack bundles these into `app.bundle.js` as a classic script.

**Geometry pipeline** — pure math, no three.js geometry helpers:
- `ringPoints(n, rx, ry, shapeFn)` — samples `n` 2D `[x, y]` points around a named outline
- Shape functions (`circleShape`, `ellipseShape`, `marquiseShape`, `pearShape`, `squareShape`, `cushionShape`, `emeraldShape`) — each takes `(t, rx, ry)` and returns `[x, y]` for parameter `t ∈ [0,1)`
- `buildCap` — triangulates a flat polygon ring into a fan (table top / culet flat)
- `buildBelt(ringA, yA, ringB, yB)` — zips two rings into a triangle strip; exact branches for same-count and 2× ratio; generic fallback uses a zipper (advance whichever ring is behind in normalised angle) so every vertex on both rings appears in at least one triangle
- `buildCone(tip, tipY, ring, ringY)` — collapses a ring to a single tip point (sharp culet)
- `buildGemGeometry(params)` — orchestrates the above into a `THREE.BufferGeometry` triangle soup, then calls `computeVertexNormals()`

**Ring stack** (Y axis: positive = up):
```
yTable      — table cap + top of crown belt
yGirdleTop  — top of girdle band  (= 0)
yGirdleBot  — bottom of girdle band (= -girdleH; equals yGirdleTop when girdleH=0)
yPavMid     — intermediate pavilion ring (60% of pavilion depth)
yPavTip     — culet tip or flat
```

When `girdleH === 0` (girdle slider at 0%), the girdle belt is skipped and crown and pavilion share a single ring at Y=0, producing a sharp edge.

**Bottom geometry modes** — three mutually exclusive options controlled by `mirrorCrown` and `crownOnly` in params:

| Mode | Geometry below girdle |
|------|-----------------------|
| Normal (default) | Pavilion belt → pavMid ring → culet tip/flat |
| Mirror Crown | Second crown belt → second table cap (facing down) |
| Crown Only | Single flat cap at `yGB` (facing down) — cabochon/inlay style |

Mirror Crown and Crown Only are mutually exclusive; checking one unchecks the other. Both dim the Pavilion Depth, Pavilion Facets, and Culet controls via `updateMirrorUI()`. Crown Only additionally dims the Mirror Crown row; Mirror Crown dims the Crown Only row.

**UI → geometry flow**: every `<input>`/`<select>`/`<checkbox>` fires `debouncedRebuild()` (80 ms debounce) → `rebuildGem()` → `buildGemGeometry(params)` → disposes old mesh, adds new `THREE.Mesh` to scene. Camera is positioned only on the first build (`firstBuild` flag). Mode checkboxes also call `updateMirrorUI()` to update control opacity/pointer-events.

**STL export**: `STLExporter.parse(mesh, { binary: true })` → `Blob` → programmatic `<a>` click download.

## Key conventions

- All geometry coordinates are in **millimetres** matching the UI parameters.
- Triangles are wound for outward-facing normals; `computeVertexNormals()` smooths lighting but the winding still matters for STL correctness.
- `MeshPhongMaterial` (not `MeshPhysicalMaterial`) is used — r134's physical material requires an env map for transmission to be visible. Phong with high shininess gives a gem-like specular appearance without that dependency.
- `THREE.DoubleSide` is used so inside faces are visible during orbit but the exported STL relies on correct winding for slicers.
- Adding a new cut style requires: a new shape function, an entry in `getShapeFn()`, and an `<option>` in the `#cut` select. Elongated shapes (aspect ratio ≠ 1) set `aspectY` in `buildGemGeometry`.
- `gemMesh` and `wireframeMesh` share the same `BufferGeometry` object. On rebuild, only `gemMesh.geometry.dispose()` is called; `wireframeMesh.material.dispose()` is called but geometry disposal is skipped to avoid a double-free.
