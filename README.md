# Gem Generator

A browser-based 3D gemstone modeller that exports print-ready STL files. No install, no build step — open `index.html` and go.

![Gem Generator](favicon.svg)

## Features

- **7 cut styles** — Brilliant, Emerald, Marquise, Oval, Pear, Cushion, Princess
- **Full parametric control** — diameter, depth, table size, crown height, crown/pavilion facets, girdle thickness, culet size
- **Bottom geometry modes** — Normal pavilion, Mirror Crown (double-sided crown), Crown Only (cabochon/inlay flat back)
- **Binary STL export** — ready for any slicer
- **Wireframe overlay** and **dark/light theme** toggle
- Works entirely via `file://` — no server, no npm, no framework

## Usage

```
git clone https://github.com/Cracksoldier/gem-generator.git
# then open index.html in any browser
```

Or visit the [live demo on GitHub Pages](https://cracksoldier.github.io/gem-generator/).

### Controls

| Control | Description |
|---------|-------------|
| Cut | Outline shape of the gem |
| Diameter / Width | Overall width in mm |
| Total Depth % | Full height as a percentage of diameter |
| Table Size % | Flat top facet width relative to diameter |
| Crown Height % | Crown portion of total depth |
| Crown Facets | Number of facets around the crown belt |
| Pavilion Depth % | Pavilion portion of total depth |
| Pavilion Facets | Number of facets around the pavilion |
| Mirror Crown | Mirrors the crown geometry below the girdle |
| Crown Only | Flat bottom — cabochon or inlay style |
| Girdle Thickness | Height of the girdle band (0 = knife-edge) |
| Culet Size % | Flat bottom facet size (0 = sharp point) |

## Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `app.html` | The gem generator app |
| `app.js` | Geometry pipeline, three.js scene, UI wiring, STL export |
| `style.css` | All styles with CSS custom-property theming |
| `favicon.svg` | Gem icon |

## Tech

- [three.js r134](https://threejs.org/) via jsDelivr CDN (UMD globals — no module bundler needed)
- Vanilla JS IIFE, no frameworks, no dependencies
- Works on `file://` (avoids ES module CORS restrictions in Chrome/Edge)

## License

MIT
