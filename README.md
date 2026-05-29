# Gem Generator

A browser-based 3D gemstone modeller that exports print-ready STL files. Open `index.html` in any browser — no server, no install required. The pre-built bundle is committed.

![Gem Generator](favicon.svg)

## Features

- **7 cut styles** — Brilliant, Emerald, Marquise, Oval, Pear, Cushion, Princess
- **Full parametric control** — diameter, depth, table size, crown height, crown/pavilion facets, girdle thickness, culet size
- **Bottom geometry modes** — Normal pavilion, Mirror Crown (double-sided crown), Crown Only (cabochon/inlay flat back)
- **Binary STL export** — ready for any slicer
- **Wireframe overlay** and **dark/light theme** toggle
- Works via `file://` or any static host — no server, no account required

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

## Building (maintainers only)

End users do not need to build — `app.bundle.js` is committed to the repo.

To rebuild after upgrading three.js:

```bash
npm install
npm run build
```

To watch for source changes during development:

```bash
npm run dev
```

Requires Node.js 18+.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `app.html` | The gem generator app |
| `src/app.js` | ES module source: scene, geometry, UI, STL export |
| `app.bundle.js` | Webpack production bundle (committed) |
| `webpack.config.js` | Build configuration |
| `package.json` | npm dependencies and scripts |
| `style.css` | All styles with CSS custom-property theming |
| `favicon.svg` | Gem icon |

## Tech

- [three.js](https://threejs.org/) bundled via webpack (npm, tree-shaken, minified)
- ES module source in `src/app.js`, bundled to a classic script for `file://` compatibility
- No frameworks, no runtime dependencies beyond three.js

## License

MIT
