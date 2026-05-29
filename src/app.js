import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

// ─── Scene setup ──────────────────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(0, 15, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 200;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight1.position.set(30, 40, 20);
dirLight1.castShadow = true;
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0x88ccff, 0.6);
dirLight2.position.set(-20, -10, -20);
scene.add(dirLight2);

const pointLight = new THREE.PointLight(0xff8844, 0.8, 200);
pointLight.position.set(0, -20, 10);
scene.add(pointLight);

scene.add(new THREE.GridHelper(100, 20, 0x333355, 0x222244));

let gemMesh = null;
let wireframeMesh = null;
let showWireframe = false;
let firstBuild = true;
const exporter = new STLExporter();

// ─── Geometry builders ────────────────────────────────────────────────────

function ringPoints(n, rx, ry, shapeFn) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(shapeFn(i / n, rx, ry));
  return pts;
}

function circleShape(t, rx, ry) {
  const a = t * Math.PI * 2;
  return [Math.cos(a) * rx, Math.sin(a) * ry];
}

function marquiseShape(t, rx, ry) {
  const a = t * Math.PI * 2;
  return [Math.cos(a) * rx * Math.pow(Math.abs(Math.sin(a)), 0.5), Math.sin(a) * ry];
}

function pearShape(t, rx, ry) {
  const a = t * Math.PI * 2 - Math.PI / 2;
  const squeeze = 0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(a + Math.PI / 2)), 0.5);
  return [Math.cos(a) * rx * squeeze, Math.sin(a) * ry];
}

function squareShape(t, rx, ry) {
  const a = t * Math.PI * 2;
  const cos = Math.cos(a), sin = Math.sin(a);
  const s = Math.max(Math.abs(cos), Math.abs(sin));
  return [cos / s * rx, sin / s * ry];
}

function cushionShape(t, rx, ry) {
  const a = t * Math.PI * 2;
  const cos = Math.cos(a), sin = Math.sin(a);
  const s = Math.pow(Math.pow(Math.abs(cos), 4) + Math.pow(Math.abs(sin), 4), 0.25);
  return [cos / s * rx, sin / s * ry];
}

function emeraldShape(t, rx, ry) {
  const a = t * Math.PI * 2;
  const cos = Math.cos(a), sin = Math.sin(a);
  const s = Math.max(Math.abs(cos), Math.abs(sin));
  const blend = 0.85;
  return [cos * (blend / s + (1 - blend)) * rx, sin * (blend / s + (1 - blend)) * ry];
}

function getShapeFn(cut) {
  switch (cut) {
    case 'emerald':  return emeraldShape;
    case 'marquise': return marquiseShape;
    case 'oval':     return circleShape;
    case 'pear':     return pearShape;
    case 'princess': return squareShape;
    case 'cushion':  return cushionShape;
    default:         return circleShape;
  }
}

function buildCap(pts, y, facingUp) {
  const tris = [];
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    if (facingUp) {
      tris.push([cx, y, cy], [pts[j][0], y, pts[j][1]], [pts[i][0], y, pts[i][1]]);
    } else {
      tris.push([cx, y, cy], [pts[i][0], y, pts[i][1]], [pts[j][0], y, pts[j][1]]);
    }
  }
  return tris;
}

function buildBelt(ringA, yA, ringB, yB) {
  const tris = [];
  const nA = ringA.length, nB = ringB.length;
  if (nA === nB) {
    for (let i = 0; i < nA; i++) {
      const j = (i + 1) % nA;
      tris.push(
        [ringA[i][0], yA, ringA[i][1]], [ringB[i][0], yB, ringB[i][1]], [ringA[j][0], yA, ringA[j][1]],
        [ringB[i][0], yB, ringB[i][1]], [ringB[j][0], yB, ringB[j][1]], [ringA[j][0], yA, ringA[j][1]]
      );
    }
  } else if (nB === 2 * nA) {
    for (let i = 0; i < nA; i++) {
      const j = (i + 1) % nA;
      const a0 = [ringA[i][0], yA, ringA[i][1]];
      const a1 = [ringA[j][0], yA, ringA[j][1]];
      const b0 = [ringB[2*i][0], yB, ringB[2*i][1]];
      const bm = [ringB[2*i+1][0], yB, ringB[2*i+1][1]];
      const b1 = [ringB[(2*i+2)%nB][0], yB, ringB[(2*i+2)%nB][1]];
      tris.push(a0, b0, bm, a0, bm, a1, a1, bm, b1);
    }
  } else if (nA === 2 * nB) {
    for (let i = 0; i < nB; i++) {
      const j = (i + 1) % nB;
      const a0 = [ringA[2*i][0], yA, ringA[2*i][1]];
      const am = [ringA[2*i+1][0], yA, ringA[2*i+1][1]];
      const a1 = [ringA[(2*i+2)%nA][0], yA, ringA[(2*i+2)%nA][1]];
      const b0 = [ringB[i][0], yB, ringB[i][1]];
      const b1 = [ringB[j][0], yB, ringB[j][1]];
      // Reversed winding vs nB===2*nA to keep outward-facing normals when ring roles are swapped
      tris.push(a0, am, b0, am, b1, b0, am, a1, b1);
    }
  } else {
    // Zipper: advance through both rings by normalised angle, one triangle per step.
    // Emits exactly nA+nB triangles and references every vertex on both rings.
    let ai = 0, bi = 0;
    for (let step = 0; step < nA + nB; step++) {
      const aFrac = ai < nA ? (ai + 1) / nA : Infinity;
      const bFrac = bi < nB ? (bi + 1) / nB : Infinity;
      if (aFrac <= bFrac) {
        tris.push(
          [ringA[ai % nA][0], yA, ringA[ai % nA][1]],
          [ringB[bi % nB][0], yB, ringB[bi % nB][1]],
          [ringA[(ai + 1) % nA][0], yA, ringA[(ai + 1) % nA][1]]
        );
        ai++;
      } else {
        tris.push(
          [ringB[bi % nB][0], yB, ringB[bi % nB][1]],
          [ringB[(bi + 1) % nB][0], yB, ringB[(bi + 1) % nB][1]],
          [ringA[ai % nA][0], yA, ringA[ai % nA][1]]
        );
        bi++;
      }
    }
  }
  return tris;
}

function buildCone(tip, tipY, ring, ringY) {
  const tris = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    tris.push(
      [ring[j][0], ringY, ring[j][1]],
      [ring[i][0], ringY, ring[i][1]],
      [tip[0], tipY, tip[1]]
    );
  }
  return tris;
}

function buildGemGeometry(p) {
  const { cut, diameter, depthPct, tablePct, crownHPct, pavDepthPct, crownFacets, pavFacets, girdlePct, culet, mirrorCrown, crownOnly } = p;
  const shapeFn = getShapeFn(cut);
  const aspectY = (cut === 'marquise' || cut === 'pear' || cut === 'oval') ? 1.4 : 1;
  const R = diameter / 2;
  const totalDepth = diameter * (depthPct / 100);
  const girdleH = diameter * (girdlePct / 100);
  const crownH = (totalDepth - girdleH) * (crownHPct / 100);
  const pavH = Math.max(1, diameter * (pavDepthPct / 100));
  const tableR = R * (tablePct / 100);

  const yTable = crownH, yGT = 0, yGB = -girdleH;
  const yPavMid = -girdleH - pavH * 0.6;
  const yPavTip = -girdleH - pavH;

  let culetR = 0;
  if (culet === 'small')       culetR = R * 0.03;
  else if (culet === 'medium') culetR = R * 0.07;
  else if (culet === 'large')  culetR = R * 0.13;

  const n = crownFacets, pn = pavFacets;
  const tableRing  = ringPoints(n,     tableR,   tableR * aspectY,   shapeFn);
  const girdleRing = ringPoints(n * 2, R,        R * aspectY,        shapeFn);

  const tris = [
    ...buildCap(tableRing, yTable, true),
    ...buildBelt(tableRing, yTable, girdleRing, yGT),
    ...(girdleH > 0 ? buildBelt(girdleRing, yGT, girdleRing, yGB) : []),
  ];

  if (crownOnly) {
    // Flat base at the girdle level — closes the mesh as a cabochon/inlay piece
    tris.push(...buildCap(girdleRing, yGB, false));
  } else if (mirrorCrown) {
    // Mirror the crown below the girdle: girdle → second table, cap facing down
    const yTable2 = yGB - crownH;
    tris.push(...buildBelt(girdleRing, yGB, tableRing, yTable2));
    tris.push(...buildCap(tableRing, yTable2, false));
  } else {
    const pavMidRing = ringPoints(pn, R * 0.35, R * 0.35 * aspectY, shapeFn);
    tris.push(...buildBelt(girdleRing, yGB, pavMidRing, yPavMid));
    if (culetR > 0) {
      const culetRing = ringPoints(pn, culetR, culetR * aspectY, shapeFn);
      tris.push(...buildBelt(pavMidRing, yPavMid, culetRing, yPavTip));
      tris.push(...buildCap(culetRing, yPavTip, false));
    } else {
      tris.push(...buildCone([cut === 'pear' ? R * 0.05 : 0, 0], yPavTip, pavMidRing, yPavMid));
    }
  }

  const flat = tris.flat();
  const pos = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i++) pos[i] = flat[i];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// ─── UI helpers ───────────────────────────────────────────────────────────

function getParams() {
  return {
    cut:         document.getElementById('cut').value,
    diameter:    +document.getElementById('diameter').value,
    depthPct:    +document.getElementById('depth').value,
    tablePct:    +document.getElementById('table').value,
    crownHPct:   +document.getElementById('crownH').value,
    pavDepthPct: +document.getElementById('pavDepth').value,
    crownFacets: +document.getElementById('crownFacets').value,
    pavFacets:   +document.getElementById('pavFacets').value,
    girdlePct:   +document.getElementById('girdle').value,
    culet:       document.getElementById('culet').value,
    mirrorCrown: document.getElementById('mirrorCrown').checked,
    crownOnly:   document.getElementById('crownOnly').checked,
  };
}

function updateValueLabels(p) {
  document.getElementById('v-diameter').textContent = p.diameter + ' mm';
  document.getElementById('v-depth').textContent    = p.depthPct + '%';
  document.getElementById('v-table').textContent    = p.tablePct + '%';
  document.getElementById('v-crownH').textContent   = p.crownHPct + '%';
  document.getElementById('v-crownFacets').textContent = p.crownFacets;
  document.getElementById('v-pavDepth').textContent = p.pavDepthPct + '%';
  document.getElementById('v-pavFacets').textContent = p.pavFacets;
  document.getElementById('v-girdle').textContent   = p.girdlePct + '%';

  const girdleH    = p.diameter * (p.girdlePct / 100);
  const crownHmm   = (p.diameter * p.depthPct / 100 - girdleH) * (p.crownHPct / 100);
  const totalDepth = p.crownOnly
    ? (crownHmm + girdleH).toFixed(1)
    : (p.diameter * p.depthPct / 100).toFixed(1);
  const crownH     = crownHmm.toFixed(1);
  const pavH       = p.mirrorCrown ? crownHmm.toFixed(1) : Math.max(1, p.diameter * (p.pavDepthPct / 100)).toFixed(1);
  const pavLabel   = p.crownOnly ? '— (crown only)' : p.mirrorCrown ? `${pavH} mm (mirrored)` : `${pavH} mm`;
  const tableD     = (p.diameter * p.tablePct / 100).toFixed(1);
  document.getElementById('dimensions').innerHTML =
    `Diameter: <span>${p.diameter} mm</span><br>` +
    `Total depth: <span>${totalDepth} mm</span><br>` +
    `Table: <span>${tableD} mm (${p.tablePct}%)</span><br>` +
    `Crown height: <span>${crownH} mm</span><br>` +
    `Pavilion depth: <span>${pavLabel}</span>`;
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getGemMaterial(wire) {
  if (wire) return new THREE.MeshBasicMaterial({ color: 0x44ffcc, wireframe: true });
  return new THREE.MeshPhongMaterial({
    color: isDark() ? 0x4fc3f7 : 0x0984e3,
    specular: 0xffffff,
    shininess: 180,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    reflectivity: 1.0,
  });
}

// ─── Rebuild mesh ─────────────────────────────────────────────────────────

function rebuildGem() {
  const p = getParams();
  updateValueLabels(p);
  const geo = buildGemGeometry(p);

  if (gemMesh) { scene.remove(gemMesh); gemMesh.geometry.dispose(); gemMesh.material.dispose(); }
  if (wireframeMesh) { scene.remove(wireframeMesh); wireframeMesh.material.dispose(); wireframeMesh = null; }

  gemMesh = new THREE.Mesh(geo, getGemMaterial(false));
  gemMesh.castShadow = true;
  scene.add(gemMesh);

  if (showWireframe) {
    wireframeMesh = new THREE.Mesh(geo, getGemMaterial(true));
    scene.add(wireframeMesh);
  }

  if (firstBuild) {
    firstBuild = false;
    const box = new THREE.Box3().setFromObject(gemMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    const d = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y + d * 1.4, center.z + d * 1.8);
    controls.update();
  }
}

// ─── Render loop ──────────────────────────────────────────────────────────

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

new ResizeObserver(resize).observe(container);
resize();

// ─── UI wiring ────────────────────────────────────────────────────────────

let debounceTimer;
document.querySelectorAll('#controls input, #controls select').forEach(el => {
  el.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildGem, 80);
  });
});

// Cache stable .control-row references once — these DOM nodes never move.
const _mirrorUIRows = {
  culet:     document.getElementById('culet').closest('.control-row'),
  pavDepth:  document.getElementById('pavDepth').closest('.control-row'),
  pavFacets: document.getElementById('pavFacets').closest('.control-row'),
  mirror:    document.getElementById('mirrorCrown').closest('.control-row'),
  crownOnly: document.getElementById('crownOnly').closest('.control-row'),
};

function updateMirrorUI() {
  const mirrored  = document.getElementById('mirrorCrown').checked;
  const crownOnly = document.getElementById('crownOnly').checked;
  const dimBottom = mirrored || crownOnly;
  const { culet: culetRow, pavDepth: pavDepthRow, pavFacets: pavFacetsRow,
          mirror: mirrorRow, crownOnly: crownOnlyRow } = _mirrorUIRows;
  culetRow.style.opacity       = dimBottom ? '0.35' : '';
  culetRow.style.pointerEvents = dimBottom ? 'none' : '';
  pavDepthRow.style.opacity       = dimBottom ? '0.35' : '';
  pavDepthRow.style.pointerEvents = dimBottom ? 'none' : '';
  pavFacetsRow.style.opacity      = dimBottom ? '0.35' : '';
  pavFacetsRow.style.pointerEvents = dimBottom ? 'none' : '';
  mirrorRow.style.opacity       = crownOnly ? '0.35' : '';
  mirrorRow.style.pointerEvents = crownOnly ? 'none' : '';
  crownOnlyRow.style.opacity       = mirrored ? '0.35' : '';
  crownOnlyRow.style.pointerEvents = mirrored ? 'none' : '';
}

document.getElementById('mirrorCrown').addEventListener('change', () => {
  if (document.getElementById('mirrorCrown').checked)
    document.getElementById('crownOnly').checked = false;
  clearTimeout(debounceTimer);
  updateMirrorUI();
  rebuildGem();
});

document.getElementById('crownOnly').addEventListener('change', () => {
  if (document.getElementById('crownOnly').checked)
    document.getElementById('mirrorCrown').checked = false;
  clearTimeout(debounceTimer);
  updateMirrorUI();
  rebuildGem();
});

document.getElementById('btn-wireframe').addEventListener('click', () => {
  showWireframe = !showWireframe;
  document.getElementById('btn-wireframe').textContent = 'Wireframe: ' + (showWireframe ? 'ON' : 'OFF');
  rebuildGem();
});

document.getElementById('btn-theme').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('btn-theme').textContent = dark ? 'Dark Mode' : 'Light Mode';
  rebuildGem();
});

document.getElementById('btn-download').addEventListener('click', () => {
  if (!gemMesh) return;
  const result = exporter.parse(gemMesh, { binary: true });
  const blob = new Blob([result], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const p = getParams();
  a.download = `gem_${p.cut}_${p.diameter}mm.stl`;
  a.click();
  URL.revokeObjectURL(url);
});

updateMirrorUI();
rebuildGem();
