const MANIFEST_PATH = './data/manifest.json';

// Selectable colour schemes. `link` values are "r,g,b" strings so link opacity
// can be applied. The colour-blind scheme uses the Okabe-Ito palette, which
// stays distinguishable for the common forms of colour vision deficiency.
const PALETTES = {
  default: {
    label: 'Aurora',
    // Numerous games sit on a calm indigo so the amber families and cyan engines
    // read as the structure; esports stay a hot-pink highlight.
    root: '#f8fafc', family: '#fbbf24', engine: '#38bdf8', game: '#8893d6',
    portmod: '#4ade80', tool: '#c084fc', esports: '#ff2d9b',
    link: { successor: '56,189,248', branch: '251,191,36', license: '192,132,252', other: '110,124,150' }
  },
  colorblind: {
    label: 'Colour-blind safe',
    root: '#ffffff', family: '#e69f00', engine: '#56b4e9', game: '#f0e442',
    portmod: '#009e73', tool: '#cc79a7', esports: '#ff6ec7',
    link: { successor: '86,180,233', branch: '230,159,0', license: '204,121,167', other: '173,184,199' }
  },
  highcontrast: {
    label: 'High contrast',
    root: '#ffffff', family: '#ffb020', engine: '#22d3ee', game: '#9fb2ff',
    portmod: '#00ff95', tool: '#e0a3ff', esports: '#ff14c6',
    link: { successor: '34,211,238', branch: '255,176,32', license: '224,163,255', other: '203,213,225' }
  }
};
const ESPORTS_RE = /esports/i;
const isEsports = node => (node.tags || []).some(tag => ESPORTS_RE.test(tag));
let activePalette = 'default';
const palette = () => PALETTES[activePalette] || PALETTES.default;
const TYPE_COLORS = PALETTES.default; // legacy alias; live colours come from palette()
const DEFAULT_TYPE_LABELS = {
  root: 'Root',
  family: 'Company / engine family',
  engine: 'Engine / successor',
  game: 'Game',
  sourcePort: 'Source port / reimplementation',
  mod: 'Mod',
  tool: 'Tool / update'
};
const DEFAULT_GROUP_LABELS = {
  family: 'Families', engine: 'Engines', game: 'Games', portmod: 'Ports & mods', tool: 'Tools', esports: 'Esports'
};
let typeLabels = { ...DEFAULT_TYPE_LABELS };
let groupLabels = { ...DEFAULT_GROUP_LABELS };
const typeLabel = type => typeLabels[type] || type;
const STORAGE_KEY = 'lineage-atlas-platform:v1';

const els = {
  datasetSelect: document.getElementById('datasetSelect'),
  datasetDescription: document.getElementById('datasetDescription'),
  stats: document.getElementById('stats'),
  graphHost: document.getElementById('graphHost'),
  hud: document.getElementById('hud'),
  detail: document.getElementById('detail'),
  sourceList: document.getElementById('sourceList'),
  nodeList: document.getElementById('nodeList'),
  curriculumSelect: document.getElementById('curriculumSelect'),
  curriculumDescription: document.getElementById('curriculumDescription'),
  search: document.getElementById('search'),
  lineageSelect: document.getElementById('lineageSelect'),
  tagSelect: document.getElementById('tagSelect'),
  fileFallback: document.getElementById('fileFallback'),
  datasetFile: document.getElementById('datasetFile'),
  fitBtn: document.getElementById('fitBtn'),
  resetBtn: document.getElementById('resetBtn'),
  nodeScale: document.getElementById('nodeScale'),
  nodeScaleOut: document.getElementById('nodeScaleOut'),
  labelDensity: document.getElementById('labelDensity'),
  labelDensityOut: document.getElementById('labelDensityOut'),
  physRepel: document.getElementById('physRepel'),
  physRepelOut: document.getElementById('physRepelOut'),
  physLink: document.getElementById('physLink'),
  physLinkOut: document.getElementById('physLinkOut'),
  physSpace: document.getElementById('physSpace'),
  physSpaceOut: document.getElementById('physSpaceOut'),
  physGravity: document.getElementById('physGravity'),
  physGravityOut: document.getElementById('physGravityOut'),
  physReset: document.getElementById('physReset'),
  paletteSelect: document.getElementById('paletteSelect'),
  bgSelect: document.getElementById('bgSelect'),
  sizeReset: document.getElementById('sizeReset'),
  clearFocus: document.getElementById('clearFocus'),
  legend: document.getElementById('legend')
};

const PHYSICS_DEFAULTS = { physRepel: 260, physLink: 1, physSpace: 7, physGravity: 0.045 };

const visibilityIds = ['showFamily','showEngine','showGames','showPorts','showTools','showCrossLinks','showLabels'];
const controls = Object.fromEntries(visibilityIds.map(id => [id, document.getElementById(id)]));

let manifest = null;
let dataset = null;
let graph = null;
let graphData = { nodes: [], links: [] };
let selectedId = null;
let hoveredId = null;
let currentView = 'force';
let renderMode = '2d';
let searchText = '';
let activeLineage = 'all';
let activeTag = 'all';
let activeCurriculumPreset = 'all';
let resizeObserver = null;
const sphereGeometries = new Map();
const labelTextureCache = new Map();
const FREE_VIEWS = new Set(['force']);
let highlightNodes = new Set();
let highlightLinks = new Set();
let frameLabelRects = [];
let timelineLayout = null;
let layoutTween = null;
let fitTimer = null;
let scaleTween = null;
const positionMemory = new Map();
const LAYOUT_MS = 720;
const VIEWPORT_MS = 850;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
// Node scale is eased toward its target each frame so the slider feels smooth
// instead of snapping (lerp). 2D animates via the render loop; 3D snaps.
let targetNodeScale = 1;
let displayNodeScale = 1;
// Per-type size multipliers, customisable from the Node sizes panel. esports is
// treated as its own size group (default larger so titles stand out).
const SIZE_DEFAULTS = { esports: 1.5, family: 1, engine: 1, game: 1, portmod: 1, tool: 1 };
let sizeMul = { ...SIZE_DEFAULTS };
// [slider id, size key, label] — drives both the UI and the bindings.
const SIZE_SLIDERS = [
  ['sizeEsports', 'esports', 'Esports'],
  ['sizeFamily', 'family', 'Families'],
  ['sizeEngine', 'engine', 'Engines'],
  ['sizeGame', 'game', 'Games'],
  ['sizePortmod', 'portmod', 'Ports & mods'],
  ['sizeTool', 'tool', 'Tools']
];
// Map a node type to its size-multiplier key (ports and mods share one).
const sizeKey = type => (type === 'sourcePort' || type === 'mod') ? 'portmod' : type;

function linkEndId(end){ return end && typeof end === 'object' ? end.id : end; }

function lerp(a, b, t){ return a + (b - a) * t; }
function easeInOutCubic(t){ return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function stableUnit(key){
  let hash = 2166136261;
  for(let i = 0; i < key.length; i++){
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function rememberedPosition(node, fallback){
  const prev = positionMemory.get(node.id);
  if(prev) return prev;
  return fallback;
}

function rememberPositions(nodes = graphData.nodes){
  nodes.forEach(node => {
    if(Number.isFinite(node.x) && Number.isFinite(node.y)){
      positionMemory.set(node.id, {
        x: node.x,
        y: node.y,
        z: Number.isFinite(node.z) ? node.z : 0,
        arc: node._arc ? { ...node._arc } : null
      });
    }
  });
}

// Build the set of nodes/links to keep bright when something is focused.
function computeHighlight(){
  highlightNodes = new Set();
  highlightLinks = new Set();
  const focusId = hoveredId || selectedId;
  if(!focusId) return;
  highlightNodes.add(focusId);
  graphData.links.forEach(link => {
    const s = linkEndId(link.source), t = linkEndId(link.target);
    if(s === focusId || t === focusId){
      highlightLinks.add(link);
      highlightNodes.add(s);
      highlightNodes.add(t);
    }
  });
}

function isDimmed(id){
  return highlightNodes.size > 0 && !highlightNodes.has(id);
}

// d3-force tuning shared by 2D/3D. Stronger repulsion + collision so nodes
// never overlap and spread into readable clusters, then settle calmly.
function physValue(id){
  const value = Number(els[id]?.value);
  return Number.isFinite(value) ? value : PHYSICS_DEFAULTS[id];
}

function configurePhysics(){
  if(!graph || !graph.d3Force) return;
  const is3D = renderMode === '3d';
  const repel = physValue('physRepel');      // 40..700, magnitude of charge
  const linkMul = physValue('physLink');      // 0.4..2.6, link distance multiplier
  const space = physValue('physSpace');       // 0..26, collision padding
  const gravity = physValue('physGravity');   // 0..0.2, centering strength
  const endType = end => (end && typeof end === 'object') ? end.type : dataset?.nodesById.get(end)?.type;
  const charge = graph.d3Force('charge');
  // Hub types (root, families, engines) repel harder so their many children
  // fan out instead of piling on top of each other.
  if(charge) charge.strength(node => {
    const hub = node.type === 'root' ? 2.6 : node.type === 'family' ? 2 : node.type === 'engine' ? 1.25 : 1;
    return -repel * (is3D ? 0.73 : 1) * hub;
  }).distanceMax(is3D ? 2400 : 1200);
  const link = graph.d3Force('link');
  if(link){
    link.distance(l => {
      const a = endType(l.source), b = endType(l.target);
      const pair = new Set([a, b]);
      // Backbone links get a longer rest length so the hierarchy spreads out.
      if(pair.has('root') && pair.has('family')) return (is3D ? 230 : 200) * linkMul;
      if(pair.has('family') && pair.has('engine')) return (is3D ? 165 : 145) * linkMul;
      const base = l.type === 'successor' ? (is3D ? 70 : 58)
        : (l.type === 'game uses' || l.type === 'uses') ? (is3D ? 50 : 36)
        : (l.type === 'source port' || l.type === 'mod') ? (is3D ? 56 : 44)
        : (is3D ? 110 : 90); // cross-links / comparisons sit looser
      return base * linkMul;
    });
    // Looser in 3D so the depth axis is used instead of clumping into a ball.
    // Backbone links stay weak so the strong charge can space the children out.
    link.strength(l => {
      const pair = new Set([endType(l.source), endType(l.target)]);
      if(pair.has('family') || pair.has('root')) return is3D ? 0.12 : 0.18;
      return (l.type === 'game uses' || l.type === 'uses') ? (is3D ? 0.5 : 0.9) : (is3D ? 0.2 : 0.35);
    });
  }
  // 2D-only refinements: collide stops overlap, x/y pulls keep the graph framed.
  // In 3D these are skipped (collide is 2D-only and the pulls would flatten the
  // layout into a column); charge + the built-in center force handle 3D spacing.
  if(!is3D && window.d3){
    if(window.d3.forceCollide){
      graph.d3Force('collide', window.d3.forceCollide(node => nodeSize(node) + space).strength(0.9).iterations(2));
    }
    if(window.d3.forceX) graph.d3Force('x', window.d3.forceX(0).strength(gravity));
    if(window.d3.forceY) graph.d3Force('y', window.d3.forceY(0).strength(gravity));
  }
  if(graph.d3VelocityDecay) graph.d3VelocityDecay(is3D ? 0.35 : 0.32);
}

// Re-tune forces from the sliders and gently restart the simulation. The reheat
// is throttled to one per frame so dragging a slider does not fire dozens of
// restarts (the main source of the jitter).
let physicsReheatQueued = false;
function applyPhysics(){
  configurePhysics();
  if(physicsReheatQueued || !graph?.d3ReheatSimulation) return;
  physicsReheatQueued = true;
  requestAnimationFrame(() => { physicsReheatQueued = false; graph?.d3ReheatSimulation?.(); });
}

// Lightweight repaint after a visual-only change (scale, labels, palette) that
// must NOT re-seed or re-simulate the layout. The 2D canvas redraws every frame
// on its own; the 3D scene needs its accessors re-applied.
function lightRefresh(){
  startScaleTween();
  if(renderMode === '3d' && graph) graph.nodeVal(nodeSize).nodeColor(nodeColorDisplay).linkColor(linkColorDisplay);
}

function startScaleTween(){
  if(scaleTween) return;
  const tick = () => {
    const delta = targetNodeScale - displayNodeScale;
    if(Math.abs(delta) <= 0.001){
      displayNodeScale = targetNodeScale;
      scaleTween = null;
    } else {
      displayNodeScale += delta * 0.18;
      scaleTween = requestAnimationFrame(tick);
    }
    if(graph){
      graph.nodeVal(nodeSize);
      if(renderMode === '3d') graph.nodeThreeObject(controls.showLabels.checked ? makeNodeLabel : null);
      else graph.refresh?.();
    }
  };
  scaleTween = requestAnimationFrame(tick);
}

const BACKGROUNDS = {
  space: 'radial-gradient(circle at top left,#16223b 0,#060914 42%,#03050b 100%)',
  black: '#000205',
  charcoal: '#0c0f16'
};

function applyPalette(){
  const p = palette();
  const root = document.documentElement.style;
  // Drive the CSS legend swatches from the same palette the canvas uses.
  root.setProperty('--family', p.family);
  root.setProperty('--engine', p.engine);
  root.setProperty('--game', p.game);
  root.setProperty('--portmod', p.portmod);
  root.setProperty('--tool', p.tool);
  root.setProperty('--esports', p.esports);
  labelTextureCache.clear();
  lightRefresh();
}

function applyBackground(){
  const value = BACKGROUNDS[els.bgSelect?.value] || BACKGROUNDS.space;
  document.documentElement.style.background = value;
  document.body.style.background = value;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function nodeColor(node){
  const p = palette();
  // esports titles get a bright distinct colour regardless of node type
  if(isEsports(node)) return p.esports;
  if(node.type === 'sourcePort' || node.type === 'mod') return p.portmod;
  return p[node.type] || '#cbd5e1';
}

function nodeSize(node){
  let base = node.type === 'root' ? 10 : node.type === 'family' ? 8 : node.type === 'engine' ? 6 : node.type === 'game' ? 3.8 : 4.5;
  if(node.branch) base += 1.5;
  // esports titles form their own size group so they stand out from games
  let mult;
  if(isEsports(node)){ base = Math.max(base, 6); mult = sizeMul.esports; }
  else mult = sizeMul[sizeKey(node.type)] ?? 1;
  return base * mult * displayNodeScale;
}

function linkColor(link, alpha = 1){
  const L = palette().link;
  if(link.type === 'successor') return `rgba(${L.successor},${0.72 * alpha})`;
  if(link.type === 'fork' || link.type === 'derived') return `rgba(${L.branch},${0.76 * alpha})`;
  if(link.type === 'license' || link.type === 'collaboration') return `rgba(${L.license},${0.68 * alpha})`;
  return `rgba(${L.other},${0.34 * alpha})`;
}

// Display colour for links, dimmed when something else is focused, brightened
// when the link touches the focused node.
function linkColorDisplay(link){
  if(highlightNodes.size === 0) return linkColor(link, 1);
  if(highlightLinks.has(link)) return linkColor(link, 1);
  return linkColor(link, 0.12);
}

// Non-tree relationships (cross-links, comparisons) bow outward so they read
// separately from the straight inheritance lines.
function linkCurvature(link){
  return isTreeLink(link) ? 0 : 0.28;
}

function nodeColorDisplay(node){
  const color = nodeColor(node);
  if(!isDimmed(node.id)) return color;
  return hexToRgba(color, 0.18);
}

function includeByType(node){
  if(node.type === 'root') return true;
  if(node.type === 'family') return controls.showFamily.checked;
  if(node.type === 'engine') return controls.showEngine.checked;
  if(node.type === 'game') return controls.showGames.checked;
  if(node.type === 'sourcePort' || node.type === 'mod') return controls.showPorts.checked;
  if(node.type === 'tool') return controls.showTools.checked;
  return true;
}

function applyDatasetChrome(){
  typeLabels = { ...DEFAULT_TYPE_LABELS, ...(dataset.ui?.typeLabels || {}) };
  groupLabels = { ...DEFAULT_GROUP_LABELS, ...(dataset.ui?.groupLabels || {}) };
  document.querySelectorAll('[data-group-label]').forEach(element => {
    element.textContent = groupLabels[element.dataset.groupLabel] || element.dataset.groupLabel;
  });
  document.querySelectorAll('[data-size-label]').forEach(element => {
    element.textContent = groupLabels[element.dataset.sizeLabel] || element.dataset.sizeLabel;
  });

  const counts = new Map();
  dataset.nodes.forEach(node => counts.set(sizeKey(node.type), (counts.get(sizeKey(node.type)) || 0) + 1));
  const groupRows = {family:'showFamilyRow', engine:'showEngineRow', game:'showGamesRow', portmod:'showPortsRow', tool:'showToolsRow'};
  const sizeRows = {esports:'sizeEsportsRow', family:'sizeFamilyRow', engine:'sizeEngineRow', game:'sizeGameRow', portmod:'sizePortmodRow', tool:'sizeToolRow'};
  Object.entries(groupRows).forEach(([group, rowId]) => { document.getElementById(rowId).hidden = !counts.get(group); });
  Object.entries(sizeRows).forEach(([group, rowId]) => {
    const present = group === 'esports' ? dataset.nodes.some(isEsports) : Boolean(counts.get(group));
    document.getElementById(rowId).hidden = !present;
  });

  const legendGroups = [
    ['family', 'family'], ['engine', 'engine'], ['game', 'game'], ['portmod', 'portmod'], ['tool', 'tool']
  ].filter(([group]) => counts.get(group));
  if(dataset.nodes.some(isEsports)) legendGroups.push(['esports', 'esports']);
  els.legend.innerHTML = legendGroups.map(([group, colour]) =>
    `<span class="legendItem"><i style="background:var(--${colour})"></i>${escapeHtml(groupLabels[group])}</span>`
  ).join('');
}

function nodeSearchText(node){
  return [node.name,node.year,node.type,node.lineage,node.note,node.hook,(node.tags||[]).join(' ')].join(' ').toLowerCase();
}

function isTreeLink(link){
  const sourceId = linkEndId(link.source);
  const target = dataset.nodesById.get(linkEndId(link.target));
  return target?.parent === sourceId;
}

function hasVisibleEndpointContext(id, visibleIds){
  let node = dataset.nodesById.get(id);
  while(node?.parent){
    if(visibleIds.has(node.parent)) return true;
    node = dataset.nodesById.get(node.parent);
  }
  return false;
}

function filteredData(){
  if(!dataset) return { nodes: [], links: [] };
  const q = searchText.trim().toLowerCase();
  let nodes = dataset.nodes.filter(node => includeByType(node));
  if(activeLineage !== 'all') nodes = nodes.filter(node => node.lineage === activeLineage || node.type === 'root' || node.type === 'family');
  if(activeTag !== 'all') nodes = nodes.filter(node => node.type === 'root' || (node.tags || []).includes(activeTag));
  if(q) nodes = nodes.filter(node => nodeSearchText(node).includes(q));

  const visibleIds = new Set(nodes.map(node => node.id));
  if(q || activeLineage !== 'all' || activeTag !== 'all') {
    [...visibleIds].forEach(id => {
      let node = dataset.nodesById.get(id);
      while(node?.parent){ visibleIds.add(node.parent); node = dataset.nodesById.get(node.parent); }
    });
    nodes = dataset.nodes.filter(node => visibleIds.has(node.id) && includeByType(node));
  }

  const nodeIds = new Set(nodes.map(node => node.id));
  const links = dataset.edges.filter(edge => {
    if(!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false;
    if(!controls.showCrossLinks.checked && !isTreeLink(edge)) return false;
    return true;
  });
  return { nodes: nodes.map(node => ({...node})), links: links.map(edge => ({...edge})) };
}

function buildHierarchyPositions(nodes){
  const ids = new Set(nodes.map(n => n.id));
  const children = new Map(nodes.map(n => [n.id, []]));
  nodes.forEach(node => {
    if(!node.parent || !ids.has(node.parent)) return;
    children.get(node.parent)?.push(node.id);
  });
  children.forEach(list => list.sort((a,b) => (dataset.nodesById.get(a)?.name || '').localeCompare(dataset.nodesById.get(b)?.name || '')));
  return { ids, children };
}

function depthForNode(node, depth = 0, lane = 0){
  if(renderMode !== '3d') return 0;
  const lineageSpread = (stableUnit(`${node.lineage || 'root'}:depth`) - 0.5) * 360;
  const nodeSpread = (stableUnit(`${node.id}:depth`) - 0.5) * 90;
  const typeDepth = node.type === 'root' ? 0
    : node.type === 'family' ? -180
    : node.type === 'engine' ? 0
    : node.type === 'game' ? 170
    : node.type === 'tool' ? 230
    : 120;
  return typeDepth + lineageSpread + nodeSpread + depth * 22 + lane * 18;
}

function applyPresetPositions(data){
  const nodes = data.nodes;
  if(!nodes.length) return;
  timelineLayout = null;
  if(currentView === 'force') {
    nodes.forEach(node => {
      const angle = (dataset.lineages.indexOf(node.lineage) / Math.max(1, dataset.lineages.length)) * Math.PI * 2;
      const radius = node.type === 'root' ? 0 : node.type === 'family' ? 170 : 470;
      const jitterA = stableUnit(`${node.id}:a`) * Math.PI * 2;
      const jitterR = stableUnit(`${node.id}:r`) * 80;
      const fallback = {
        x: Math.cos(angle) * radius + Math.cos(jitterA) * jitterR,
        y: Math.sin(angle) * radius + Math.sin(jitterA) * jitterR,
        z: renderMode === '3d' ? depthForNode(node) + (stableUnit(`${node.id}:z`) - 0.5) * 260 : 0
      };
      const prev = rememberedPosition(node, fallback);
      node.x = prev.x;
      node.y = prev.y;
      node.z = prev.z;
      node._arc = prev.arc || null;
      node.fx = undefined; node.fy = undefined; node.fz = undefined;
    });
    return;
  }

  if(currentView === 'radial') {
    const { children } = buildHierarchyPositions(nodes);
    const rootId = nodes.some(n => n.id === 'root') ? 'root' : nodes[0].id;
    const leaves = [];
    function collect(id){
      const kids = children.get(id) || [];
      if(!kids.length) leaves.push(id);
      else kids.forEach(collect);
    }
    collect(rootId);
    const leafIndex = new Map(leaves.map((id,i) => [id,i]));
    const raw = new Map();
    function place(id, depth){
      const kids = children.get(id) || [];
      const idx = kids.length ? kids.map(k => place(k, depth + 1)).reduce((a,b)=>a+b,0) / kids.length : leafIndex.get(id) || 0;
      raw.set(id, { idx, depth });
      return idx;
    }
    place(rootId, 0);
    const denom = Math.max(1, leaves.length - 1);
    nodes.forEach(node => {
      const p = raw.get(node.id) || {idx: 0, depth: 1};
      const angle = (p.idx / denom) * Math.PI * 2 - Math.PI / 2;
      const radius = p.depth * 130;
      setFixedTarget(node, Math.cos(angle) * radius, Math.sin(angle) * radius, depthForNode(node, p.depth), null);
    });
    return;
  }

  if(currentView === 'sunburst') {
    // True sunburst: each node is a filled ring-arc whose angular span is
    // proportional to its number of leaf descendants, banded by depth.
    const { children } = buildHierarchyPositions(nodes);
    const rootId = nodes.some(n => n.id === 'root') ? 'root' : nodes[0].id;
    const leafCount = new Map();
    function countLeaves(id){
      const kids = children.get(id) || [];
      if(!kids.length){ leafCount.set(id, 1); return 1; }
      let sum = 0; kids.forEach(k => { sum += countLeaves(k); });
      leafCount.set(id, sum); return sum;
    }
    countLeaves(rootId);
    const RING = 78;
    const arcs = new Map();
    function assign(id, a0, a1, depth){
      arcs.set(id, { a0, a1, depth });
      const kids = children.get(id) || [];
      const total = leafCount.get(id) || 1;
      let cursor = a0;
      kids.forEach(k => {
        const span = (a1 - a0) * ((leafCount.get(k) || 1) / total);
        assign(k, cursor, cursor + span, depth + 1);
        cursor += span;
      });
    }
    assign(rootId, -Math.PI / 2, Math.PI * 1.5, 0);
    nodes.forEach(node => {
      const a = arcs.get(node.id) || { a0: 0, a1: 0.05, depth: 1 };
      const r0 = a.depth * RING;
      const r1 = (a.depth + 1) * RING;
      const mid = (a.a0 + a.a1) / 2;
      const rmid = (r0 + r1) / 2;
      setFixedTarget(node, Math.cos(mid) * rmid, Math.sin(mid) * rmid, renderMode === '3d' ? a.depth * 76 - 170 : 0, { a0: a.a0, a1: a.a1, r0, r1, depth: a.depth });
    });
    return;
  }

  if(currentView === 'layered' || currentView === 'timeline') {
    const lineages = [...new Set(nodes.map(n => n.lineage || 'Other'))].sort();
    const parsedYear = node => {
      const match = String(node.year || '').match(/\d{4}/);
      return match ? Number(match[0]) : null;
    };
    const datedYears = nodes.map(parsedYear).filter(Boolean);
    const currentYear = new Date().getUTCFullYear();
    // Use the actual dated range. A hard 1990 floor left newer subjects such
    // as AI models compressed into the far-right edge of a mostly empty axis.
    const minYear = datedYears.length ? Math.min(...datedYears) : 1990;
    const maxYear = datedYears.length ? Math.max(...datedYears, currentYear) : currentYear;
    const yearOf = node => parsedYear(node) ?? (/ongoing|present|current/i.test(String(node.year || '')) ? maxYear : minYear);
    const levels = new Map();
    function depth(id){
      if(levels.has(id)) return levels.get(id);
      const node = dataset.nodesById.get(id);
      const value = node?.parent ? depth(node.parent) + 1 : 0;
      levels.set(id, value);
      return value;
    }
    if(currentView === 'timeline'){
      const span = Math.max(1, maxYear - minYear);
      // Give dense modern datasets enough horizontal space without turning a
      // century-scale map into an unusably wide strip.
      const xSpan = Math.max(1180, Math.min(2800, span * 54));
      const xForYear = year => ((year - minYear) / span - 0.5) * xSpan;
      const laneMeta = [];
      let cursorY = 0;

      lineages.forEach((lineage, laneIndex) => {
        const members = nodes
          .filter(node => (node.lineage || 'Other') === lineage)
          .sort((a, b) => yearOf(a) - yearOf(b) || a.name.localeCompare(b.name));
        const trackEnds = [];
        const placements = [];
        members.forEach(node => {
          const x = xForYear(yearOf(node));
          // Approximate the label footprint in graph units. Packing intervals,
          // rather than only counting identical years, also separates long
          // adjacent labels such as several point releases in one year.
          const halfWidth = Math.min(150, 28 + Math.min(34, node.name.length) * 3.25);
          const start = x - halfWidth;
          const end = x + halfWidth;
          let track = trackEnds.findIndex(trackEnd => start > trackEnd + 16);
          if(track < 0){ track = trackEnds.length; trackEnds.push(end); }
          else trackEnds[track] = end;
          placements.push({node, x, track});
        });
        const trackCount = Math.max(1, trackEnds.length);
        const laneHeight = Math.max(72, trackCount * 46 + 30);
        const laneTop = cursorY;
        const centreY = laneTop + laneHeight / 2;
        placements.forEach(({node, x, track}) => {
          const y = centreY + (track - (trackCount - 1) / 2) * 46;
          setFixedTarget(node, x, y, depthForNode(node, depth(node.id), laneIndex), null);
        });
        laneMeta.push({name: lineage, top: laneTop, bottom: laneTop + laneHeight, centre: centreY, tracks: trackCount});
        cursorY += laneHeight + 22;
      });

      const totalHeight = Math.max(1, cursorY - 22);
      const yOffset = -totalHeight / 2;
      nodes.forEach(node => {
        if(node._target) node._target.y += yOffset;
      });
      laneMeta.forEach(lane => {
        lane.top += yOffset;
        lane.bottom += yOffset;
        lane.centre += yOffset;
      });
      // zoomToFit scales the whole graph to the viewport, so tick density must
      // follow the visible axis rather than its graph-unit width.
      const targetTickCount = 7;
      const rawStep = span / targetTickCount;
      const stepChoices = [1, 2, 5, 10, 20, 25, 50, 100];
      const yearStep = stepChoices.find(step => step >= rawStep) || 100;
      const minTickGap = span / targetTickCount;
      const years = [minYear];
      for(let year = Math.ceil(minYear / yearStep) * yearStep; year <= maxYear; year += yearStep) {
        if(year - minYear >= minTickGap && maxYear - year >= minTickGap) years.push(year);
      }
      if(maxYear !== minYear) years.push(maxYear);
      timelineLayout = {
        minYear, maxYear, xMin: -xSpan / 2, xMax: xSpan / 2,
        yMin: -totalHeight / 2, yMax: totalHeight / 2,
        years: [...new Set(years)].sort((a,b) => a-b), lanes: laneMeta, xForYear
      };
      return;
    }

    nodes.forEach(node => {
      const lane = lineages.indexOf(node.lineage || 'Other');
      const y = (lane - (lineages.length - 1) / 2) * 72;
      const x = (depth(node.id) - 4) * 145;
      const z = renderMode === '3d' ? (lane - (lineages.length - 1) / 2) * 95 + (stableUnit(`${node.id}:layer`) - 0.5) * 70 : 0;
      setFixedTarget(node, x, y, z, null);
    });
  }
}

function drawTimelineBackdrop(ctx, globalScale){
  if(currentView !== 'timeline' || !timelineLayout || renderMode !== '2d') return;
  const {xMin, xMax, yMin, yMax, years, lanes, xForYear} = timelineLayout;
  ctx.save();
  ctx.lineWidth = 1 / globalScale;
  years.forEach(year => {
    const x = xForYear(year);
    ctx.beginPath();
    ctx.moveTo(x, yMin - 28 / globalScale);
    ctx.lineTo(x, yMax + 12 / globalScale);
    ctx.strokeStyle = year === new Date().getUTCFullYear() ? 'rgba(56,189,248,.32)' : 'rgba(148,163,184,.13)';
    ctx.stroke();
    ctx.font = `${11 / globalScale}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = year === new Date().getUTCFullYear() ? '#7dd3fc' : '#9fb0c8';
    ctx.fillText(String(year), x, yMin - 8 / globalScale);
  });
  lanes.forEach((lane, index) => {
    if(index % 2 === 0){
      ctx.fillStyle = 'rgba(148,163,184,.035)';
      ctx.fillRect(xMin - 18 / globalScale, lane.top, xMax - xMin + 36 / globalScale, lane.bottom - lane.top);
    }
    ctx.beginPath();
    ctx.moveTo(xMin, lane.bottom);
    ctx.lineTo(xMax, lane.bottom);
    ctx.strokeStyle = 'rgba(148,163,184,.12)';
    ctx.stroke();
    ctx.font = `700 ${11 / globalScale}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c7d2fe';
    const laneLabel = lane.name.length > 28 ? `${lane.name.slice(0, 27)}…` : lane.name;
    ctx.fillText(laneLabel, xMin - 12 / globalScale, lane.centre, 96 / globalScale);
  });
  ctx.restore();
}

function setFixedTarget(node, tx, ty, tz = 0, arc = null){
  const prev = rememberedPosition(node, { x: tx, y: ty, z: tz, arc });
  node.x = prev.x;
  node.y = prev.y;
  node.z = prev.z;
  node.fx = prev.x;
  node.fy = prev.y;
  node.fz = prev.z;
  node._arc = arc && prev.arc ? { ...prev.arc } : arc;
  node._target = { x: tx, y: ty, z: tz, arc };
}

async function fetchJson(path){
  const response = await fetch(path, {cache: 'no-store'});
  if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadManifest(){
  manifest = await fetchJson(MANIFEST_PATH);
  els.datasetSelect.innerHTML = '';
  manifest.datasets.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.title;
    els.datasetSelect.appendChild(option);
  });
  const first = manifest.datasets[0];
  if(first) await loadDataset(first.id);
}

function normalizeDataset(raw){
  const nodesById = new Map(raw.nodes.map(node => [node.id, node]));
  const edges = raw.edges.filter(edge => nodesById.has(edge.source) && nodesById.has(edge.target));
  const children = new Map(raw.nodes.map(node => [node.id, []]));
  raw.nodes.forEach(node => { if(node.parent && children.has(node.parent)) children.get(node.parent).push(node.id); });
  // Tally tags so the filter can list them most-common-first with counts.
  const tagCounts = new Map();
  raw.nodes.forEach(node => (node.tags || []).forEach(tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
  const tags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
  return {
    ...raw,
    nodesById,
    children,
    edges,
    lineages: [...new Set(raw.nodes.map(node => node.lineage).filter(Boolean))].sort(),
    tags
  };
}

async function loadDataset(id){
  const item = manifest.datasets.find(entry => entry.id === id) || manifest.datasets[0];
  const raw = await fetchJson(item.path);
  dataset = normalizeDataset(raw);
  applyDatasetChrome();
  currentView = dataset.defaultView || item.defaultView || 'force';
  selectedId = null;
  activeLineage = 'all';
  activeTag = 'all';
  activeCurriculumPreset = 'all';
  els.datasetDescription.textContent = dataset.description || item.description || '';
  populateCurriculumPresets();
  populateLineages();
  populateTags();
  renderSources();
  setActiveView(currentView, false);
  render();
}

function populateCurriculumPresets(){
  const presets = dataset.curriculumPresets || [{id:'all', title:'Full atlas', description:'Explore the complete dataset.'}];
  els.curriculumSelect.replaceChildren(...presets.map(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.title;
    return option;
  }));
  els.curriculumSelect.value = activeCurriculumPreset;
  applyCurriculumPreset(activeCurriculumPreset, false);
}

function applyCurriculumPreset(id, shouldRender=true){
  const preset = (dataset.curriculumPresets || []).find(item => item.id === id) || {id:'all', description:'Explore the complete dataset.', tag:'all', view:dataset.defaultView || 'force'};
  activeCurriculumPreset = preset.id;
  activeTag = preset.tag || 'all';
  if(els.tagSelect.options.length) els.tagSelect.value = activeTag;
  els.curriculumDescription.textContent = preset.description || '';
  Object.entries(preset.visibility || {}).forEach(([controlId, checked]) => {
    if(controls[controlId]) controls[controlId].checked = Boolean(checked);
  });
  if(!preset.visibility){
    Object.values(controls).forEach(control => { control.checked = true; });
  }
  setActiveView(preset.view || dataset.defaultView || 'force', false);
  if(shouldRender) render();
}

function populateLineages(){
  els.lineageSelect.innerHTML = '<option value="all">All lineages</option>';
  dataset.lineages.forEach(lineage => {
    const option = document.createElement('option');
    option.value = lineage;
    option.textContent = lineage;
    els.lineageSelect.appendChild(option);
  });
}

function populateTags(){
  els.tagSelect.innerHTML = '<option value="all">All tags</option>';
  (dataset.tags || []).forEach(({ tag, count }) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = `${tag} (${count})`;
    els.tagSelect.appendChild(option);
  });
  els.tagSelect.value = activeTag;
}

function renderSources(){
  els.sourceList.innerHTML = (dataset.sources || []).map(source => `
    <div class="source">
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>
      <small>${escapeHtml(source.note || '')}</small>
    </div>
  `).join('');
}

function initGraph(){
  if(renderMode === '2d') initGraph2D();
  else initGraph3D();
  resizeGraph();
}

function destroyGraph(){
  if(layoutTween){ cancelAnimationFrame(layoutTween); layoutTween = null; }
  if(scaleTween){ cancelAnimationFrame(scaleTween); scaleTween = null; }
  if(graph?._destructor) graph._destructor();
  graph = null;
  els.graphHost.replaceChildren();
}

function initGraph2D(){
  if(!window.ForceGraph) {
    els.hud.textContent = 'force-graph did not load. Check your internet connection or vendor the library locally.';
    return;
  }
  graph = ForceGraph()(els.graphHost)
    .backgroundColor('rgba(0,0,0,0)')
    .nodeId('id')
    .nodeLabel(node => `${node.name} (${node.year || 'n/a'})`)
    .nodeVal(node => Math.max(2, nodeSize(node)))
    .linkSource('source')
    .linkTarget('target')
    .linkColor(linkColorDisplay)
    .linkVisibility(() => currentView !== 'sunburst')
    .linkWidth(link => (highlightLinks.has(link) ? 2.4 : link.type === 'successor' ? 1.4 : 0.7))
    .linkCurvature(linkCurvature)
    .linkDirectionalParticles(link => link.type === 'successor' ? 1 : 0)
    .linkDirectionalParticleWidth(1.8)
    .linkDirectionalParticleSpeed(0.006)
    .onRenderFramePre((ctx, globalScale) => {
      frameLabelRects = [];
      drawTimelineBackdrop(ctx, globalScale);
      if(FREE_VIEWS.has(currentView)) rememberPositions(graphData.nodes);
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject(drawNode2D)
    .nodePointerAreaPaint(drawNodePointerArea)
    .onNodeClick(node => selectNode(node.id))
    .onNodeHover(node => {
      els.graphHost.style.cursor = node ? 'pointer' : 'grab';
      hoveredId = node ? node.id : null;
      computeHighlight();
    })
    .onNodeDragEnd(node => { node.fx = node.x; node.fy = node.y; })
    .onBackgroundClick(clearSelection)
    .enableNodeDrag(true)
    .warmupTicks(40)
    .cooldownTicks(200);
  configurePhysics();
}

function initGraph3D(){
  if(!window.ForceGraph3D) {
    els.hud.textContent = '3d-force-graph did not load. Check your internet connection or vendor the library locally.';
    return;
  }
  graph = ForceGraph3D()(els.graphHost)
    .backgroundColor('rgba(0,0,0,0)')
    .numDimensions(3)
    .nodeId('id')
    .nodeLabel(node => `${node.name} (${node.year || 'n/a'})`)
    .nodeColor(nodeColorDisplay)
    .nodeVal(nodeSize)
    .nodeOpacity(0.95)
    .linkSource('source')
    .linkTarget('target')
    .linkColor(linkColorDisplay)
    .linkVisibility(() => currentView !== 'sunburst')
    .linkWidth(link => (highlightLinks.has(link) ? 2 : link.type === 'successor' ? 1.5 : 0.65))
    .linkCurvature(linkCurvature)
    .linkOpacity(0.6)
    .linkDirectionalParticles(link => link.type === 'successor' ? 1 : 0)
    .linkDirectionalParticleWidth(1.2)
    .linkDirectionalParticleSpeed(0.004)
    .onNodeClick(node => selectNode(node.id))
    .onNodeHover(node => {
      els.graphHost.style.cursor = node ? 'pointer' : 'grab';
      hoveredId = node ? node.id : null;
      computeHighlight();
    })
    .onNodeDragEnd(node => { node.fx = node.x; node.fy = node.y; node.fz = node.z; })
    .onBackgroundClick(clearSelection)
    .onEngineTick(() => { if(FREE_VIEWS.has(currentView)) rememberPositions(graphData.nodes); })
    .enableNodeDrag(true)
    .warmupTicks(40)
    .cooldownTicks(200);
  if(graph.showNavInfo) graph.showNavInfo(false);
  setup3DScene();
  configurePhysics();
}

// Add tinted lights to the 3D scene without distance fog, so distant nodes do
// not fade out while exploring large lineage maps.
function setup3DScene(){
  const THREE = window.THREE;
  const scene = graph?.scene?.();
  if(!scene || !THREE) return;
  scene.fog = null;
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.PointLight(0x8fbcff, 0.9); key.position.set(520, 380, 720); scene.add(key);
  const rim = new THREE.PointLight(0xff5fc4, 0.65); rim.position.set(-520, -300, -620); scene.add(rim);
  const fill = new THREE.PointLight(0xffffff, 0.35); fill.position.set(0, 0, 900); scene.add(fill);
  const camera = graph?.camera?.();
  if(camera){
    camera.near = 1;
    camera.far = 12000;
    camera.updateProjectionMatrix();
  }
}

function setRenderMode(mode){
  if(renderMode === mode && graph) return;
  renderMode = mode;
  document.querySelectorAll('[data-render-mode]').forEach(button => {
    const active = button.dataset.renderMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  destroyGraph();
  initGraph();
  render();
}

function resizeGraph(){
  if(!graph) return;
  const rect = els.graphHost.getBoundingClientRect();
  graph.width(Math.max(320, rect.width)).height(Math.max(320, rect.height));
}

function refreshGraphFrame(){
  if(!graph) return;
  if(graph.refresh) graph.refresh();
  else if(renderMode === '3d') graph.nodeThreeObject?.(controls.showLabels.checked ? makeNodeLabel : null);
}

function animateLayoutTargets(){
  if(layoutTween) cancelAnimationFrame(layoutTween);
  const targets = graphData.nodes.filter(node => node._target);
  if(!targets.length) {
    rememberPositions(graphData.nodes);
    return;
  }
  const starts = new Map(targets.map(node => [node.id, {
    x: node.x || 0,
    y: node.y || 0,
    z: node.z || 0,
    arc: node._arc ? { ...node._arc } : null
  }]));
  const startTime = performance.now();
  const duration = reducedMotion ? 1 : LAYOUT_MS;
  const tick = now => {
    const t = easeInOutCubic(Math.min(1, (now - startTime) / duration));
    targets.forEach(node => {
      const start = starts.get(node.id);
      const target = node._target;
      node.x = node.fx = lerp(start.x, target.x, t);
      node.y = node.fy = lerp(start.y, target.y, t);
      node.z = node.fz = lerp(start.z, target.z, t);
      if(target.arc){
        const a = start.arc || target.arc;
        node._arc = {
          a0: lerp(a.a0, target.arc.a0, t),
          a1: lerp(a.a1, target.arc.a1, t),
          r0: lerp(a.r0, target.arc.r0, t),
          r1: lerp(a.r1, target.arc.r1, t),
          depth: target.arc.depth
        };
      } else {
        node._arc = null;
      }
    });
    refreshGraphFrame();
    rememberPositions(targets);
    if(t < 1) layoutTween = requestAnimationFrame(tick);
    else {
      targets.forEach(node => { delete node._target; });
      layoutTween = null;
    }
  };
  layoutTween = requestAnimationFrame(tick);
}

function fitGraph(duration = VIEWPORT_MS, padding = 70){
  // Timeline lane names sit outside the earliest-year bound. The graph
  // library measures padding in graph units, so reserve a real label gutter.
  const resolvedPadding = currentView === 'timeline' ? Math.max(360, padding) : padding;
  graph?.zoomToFit?.(reducedMotion ? 0 : duration, resolvedPadding);
}

function resetViewport(){
  const duration = reducedMotion ? 0 : VIEWPORT_MS;
  if(renderMode === '3d') graph?.cameraPosition?.({ x: 480, y: 360, z: 1250 }, { x: 0, y: 0, z: 0 }, duration);
  else {
    graph?.centerAt?.(0, 0, duration);
    graph?.zoom?.(1, duration);
  }
}

function focusViewport(node){
  if(!node || !graph) return;
  const duration = reducedMotion ? 0 : VIEWPORT_MS;
  if(renderMode === '3d') {
    const dist = 360;
    const x = node.x || 0, y = node.y || 0, z = node.z || 0;
    const len = Math.hypot(x, y, z) || 1;
    graph.cameraPosition?.({
      x: x + dist * (x || 120) / len + 120,
      y: y + dist * (y || 80) / len + 80,
      z: z + dist * (z || 180) / len + 220
    }, node, duration);
    return;
  }
  graph.centerAt?.(node.x || 0, node.y || 0, duration);
  graph.zoom?.(2.3, duration);
}

const LABEL_PRIORITY = { root: 0, family: 1, engine: 2, tool: 3, sourcePort: 4, mod: 5, game: 6 };

function render(){
  if(!dataset || !graph) return;
  graphData = filteredData();
  // Draw important nodes first so their labels claim space before declutter.
  // esports titles rank just below families so their labels survive decluttering.
  const labelRank = node => isEsports(node) ? 1.5 : (LABEL_PRIORITY[node.type] ?? 9);
  graphData.nodes.sort((a, b) => labelRank(a) - labelRank(b));
  applyPresetPositions(graphData);
  computeHighlight();
  const free = FREE_VIEWS.has(currentView);
  if(graph.warmupTicks) graph.warmupTicks(free ? 40 : 0);
  if(graph.cooldownTicks) graph.cooldownTicks(free ? 200 : 0);
  graph.nodeVal(nodeSize);
  if(renderMode === '3d') {
    graph
      .nodeColor(nodeColorDisplay)
      .nodeThreeObject(controls.showLabels.checked ? makeNodeLabel : null);
  } else {
    graph.nodeCanvasObject(drawNode2D);
  }
  graph.graphData(graphData);
  els.stats.textContent = `${graphData.nodes.length} nodes | ${graphData.links.length} links`;
  els.hud.textContent = `${renderMode.toUpperCase()} · ${viewLabel(currentView)} · ${activeLineage === 'all' ? 'all lineages' : activeLineage}`;
  renderDetail(selectedId || graphData.nodes[0]?.id);
  renderNodeList();
  animateLayoutTargets();
  // Fixed layouts animate into their targets. Fit after that transition so
  // the camera measures final positions rather than an off-centre midpoint.
  if(fitTimer) clearTimeout(fitTimer);
  const fitDelay = reducedMotion ? 0 : (free ? 900 : LAYOUT_MS + 60);
  const fitDuration = reducedMotion ? 0 : (free ? 900 : 420);
  fitTimer = setTimeout(() => {
    fitGraph(fitDuration);
    fitTimer = null;
  }, fitDelay);
}

function renderNodeList(){
  if(!els.nodeList) return;
  const nodes = [...graphData.nodes]
    .filter(node => node.type !== 'root')
    .sort((a,b) => a.name.localeCompare(b.name));
  els.nodeList.replaceChildren(...nodes.map(node => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-current', node.id === selectedId ? 'true' : 'false');
    button.textContent = `${node.name} · ${typeLabel(node.type)}`;
    button.addEventListener('click', () => selectNode(node.id));
    return button;
  }));
}

function drawNode2D(node, ctx, globalScale){
  if(currentView === 'sunburst' && node._arc){ drawArc2D(node, ctx, globalScale); return; }
  const radius = nodeSize(node);
  const selected = node.id === selectedId;
  const focused = node.id === hoveredId;
  const dimmed = isDimmed(node.id);
  const color = nodeColor(node);
  const label = node.name.length > 34 ? `${node.name.slice(0, 32)}...` : node.name;
  const showText = controls.showLabels.checked && shouldShow2DLabel(node, globalScale);

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.22 : 1;
  ctx.beginPath();
  const emphasized = selected || focused;
  const haloR = radius + (emphasized ? 10 : 5);
  ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
  const halo = ctx.createRadialGradient(node.x, node.y, radius * 0.15, node.x, node.y, haloR);
  halo.addColorStop(0, hexToRgba(color, emphasized ? 0.5 : 0.26));
  halo.addColorStop(1, 'rgba(3,7,18,0)');
  ctx.fillStyle = halo;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = (emphasized ? 2.6 : 1.1) / globalScale;
  ctx.strokeStyle = emphasized ? '#f8fafc' : 'rgba(248,250,252,.68)';
  ctx.stroke();

  if(node.branch) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 3.5, 0, Math.PI * 2);
    ctx.lineWidth = 1.4 / globalScale;
    ctx.strokeStyle = hexToRgba(color, 0.68);
    ctx.stroke();
  }

  // bright double ring marks esports titles so they read as a distinct group
  if(isEsports(node)) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 4.5, 0, Math.PI * 2);
    ctx.lineWidth = 2.2 / globalScale;
    ctx.strokeStyle = palette().esports;
    ctx.stroke();
  }

  const forced = selected || focused;
  if(showText && !dimmed) drawLabel2D(node, ctx, globalScale, label, radius, forced);
  ctx.restore();
}

// Sunburst: draw the node as a filled ring-arc segment centred on the origin.
function drawArc2D(node, ctx, globalScale){
  const { a0, a1, r0, r1 } = node._arc;
  const color = nodeColor(node);
  const selected = node.id === selectedId;
  const focused = node.id === hoveredId;
  const dimmed = isDimmed(node.id);
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.2 : 1;
  ctx.beginPath();
  if(r0 <= 0.001){
    ctx.arc(0, 0, r1, a0, a1); // root is a full inner disk
  } else {
    ctx.arc(0, 0, r1, a0, a1);
    ctx.arc(0, 0, r0, a1, a0, true);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = ((selected || focused) ? 2.4 : 1) / globalScale;
  ctx.strokeStyle = (selected || focused) ? '#f8fafc' : 'rgba(4,8,18,.6)';
  ctx.stroke();

  if(controls.showLabels.checked && !dimmed) drawArcLabel(node, ctx, globalScale, color);
  ctx.restore();
}

function drawArcLabel(node, ctx, globalScale, fillColor){
  const { a0, a1, r0, r1 } = node._arc;
  const span = a1 - a0;
  const rmid = (r0 + r1) / 2;
  const fontSize = 11 / globalScale;
  const isCenter = r0 <= 0.001;
  // Skip arcs too thin to fit a readable label (keeps the wheel uncluttered).
  if(!isCenter && span * rmid < fontSize * 2.2) return;
  const density = Number(els.labelDensity.value || 0.72);
  if(node.type === 'game' && !isEsports(node) && density < 0.6) return;
  const label = node.name.length > 22 ? `${node.name.slice(0, 20)}...` : node.name;
  ctx.save();
  ctx.font = `${node.type === 'family' || node.type === 'engine' ? 700 : 600} ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3 / globalScale;
  ctx.strokeStyle = 'rgba(3,7,18,.92)';
  ctx.fillStyle = '#f8fbff';
  if(isCenter){
    ctx.strokeText(label, 0, 0);
    ctx.fillText(label, 0, 0);
  } else {
    let mid = (a0 + a1) / 2;
    // normalise to [-PI, PI] then flip text on the left half so it stays upright
    mid = Math.atan2(Math.sin(mid), Math.cos(mid));
    const flip = mid > Math.PI / 2 || mid < -Math.PI / 2;
    ctx.translate(Math.cos(mid) * rmid, Math.sin(mid) * rmid);
    ctx.rotate(mid + (flip ? Math.PI : 0));
    const maxW = (r1 - r0) * 0.92;
    ctx.strokeText(label, 0, 0, maxW);
    ctx.fillText(label, 0, 0, maxW);
  }
  ctx.restore();
}

function shouldShow2DLabel(node, globalScale){
  const density = Number(els.labelDensity.value || 0.72);
  if(node.type === 'root' || node.type === 'family' || node.type === 'engine') return true;
  if(isEsports(node)) return true;
  if(selectedId === node.id || hoveredId === node.id) return true;
  if(globalScale > 1.15 && density > 0.42) return true;
  return density > 0.78 && node.type !== 'game';
}

function rectsOverlap(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawLabel2D(node, ctx, globalScale, label, radius, forced){
  const fontSize = (node.type === 'family' || node.type === 'engine' ? 12 : 10.5) / globalScale;
  const padX = 6 / globalScale;
  const padY = 4 / globalScale;
  const y = node.y + radius + 13 / globalScale;
  ctx.font = `${node.type === 'game' ? 600 : 750} ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = Math.min(ctx.measureText(label).width + padX * 2, 180 / globalScale);
  const height = fontSize + padY * 2;
  const rect = { x: node.x - width / 2, y: y - height / 2, w: width, h: height };
  // Auto-declutter: skip labels that would collide with one already placed
  // this frame. Forced labels (selected/hovered) always win and still reserve
  // their space so others move out of the way.
  if(!forced && frameLabelRects.some(r => rectsOverlap(rect, r))) return;
  frameLabelRects.push(rect);
  roundRect(ctx, rect.x, rect.y, width, height, 5 / globalScale);
  ctx.fillStyle = 'rgba(6,9,20,.82)';
  ctx.fill();
  ctx.lineWidth = 0.8 / globalScale;
  ctx.strokeStyle = hexToRgba(nodeColor(node), 0.56);
  ctx.stroke();
  ctx.fillStyle = '#f8fbff';
  ctx.fillText(label, node.x, y + 0.4 / globalScale, width - padX * 2);
}

function drawNodePointerArea(node, color, ctx){
  const radius = Math.max(10, nodeSize(node) + 8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius){
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hexToRgba(hex, alpha){
  const value = hex.replace('#','');
  const bigint = Number.parseInt(value.length === 3 ? value.split('').map(ch => ch + ch).join('') : value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Soft radial sprite used as an additive glow halo behind each 3D node.
let glowTextureCache = null;
function glowTexture(){
  if(glowTextureCache) return glowTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.28, 'rgba(255,255,255,0.34)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  glowTextureCache = new window.THREE.CanvasTexture(canvas);
  return glowTextureCache;
}

// 3D labels are limited to the structural nodes (+ esports / focused) so the
// scene does not drown in text.
function show3DLabel(node){
  if(node.id === selectedId || node.id === hoveredId) return true;
  if(isEsports(node)) return true;
  return node.type === 'root' || node.type === 'family' || node.type === 'engine';
}

function makeNodeLabel(node){
  const THREE = window.THREE;
  const group = new THREE.Group();
  const color = nodeColor(node);
  const r = nodeSize(node);
  const dimmed = isDimmed(node.id);
  const sphere = new THREE.Mesh(
    sphereGeometry(r),
    new THREE.MeshStandardMaterial({
      color, emissive: color,
      emissiveIntensity: dimmed ? 0.12 : 0.6,
      roughness: 0.4, metalness: 0.0,
      transparent: true, opacity: dimmed ? 0.22 : 0.97
    })
  );
  group.add(sphere);
  // additive glow halo gives the nodes a lit, bloom-like feel on the dark scene
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
    opacity: dimmed ? 0.05 : (isEsports(node) ? 0.95 : 0.6)
  }));
  const gs = r * (isEsports(node) ? 6 : 4.5);
  glow.scale.set(gs, gs, 1);
  group.add(glow);
  if(!dimmed && show3DLabel(node)){
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(node), transparent: true, depthWrite: false }));
    const size = node.type === 'family' || node.type === 'engine' ? 42 : 30;
    sprite.scale.set(size * 5.8, size, 1);
    sprite.position.set(0, r + size * 0.9, 0);
    group.add(sprite);
  }
  return group;
}

function sphereGeometry(size){
  const key = Math.round(size * 10);
  if(!sphereGeometries.has(key)) sphereGeometries.set(key, new window.THREE.SphereGeometry(size, 22, 16));
  return sphereGeometries.get(key);
}

function textTexture(node){
  const density = Number(els.labelDensity.value || 0.72);
  if(node.type === 'game' && density < 0.65 && !isEsports(node)) return blankTexture();
  const cacheKey = `${node.id}:${node.name}:${node.type}:${density}`;
  if(labelTextureCache.has(cacheKey)) return labelTextureCache.get(cacheKey);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const text = node.name.length > 38 ? `${node.name.slice(0, 36)}...` : node.name;
  canvas.width = 512;
  canvas.height = 96;
  ctx.font = node.type === 'family' || node.type === 'engine' ? '700 36px Inter, Arial' : '650 30px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(3,7,18,.95)';
  ctx.fillStyle = '#f8fafc';
  ctx.strokeText(text, 256, 48);
  ctx.fillText(text, 256, 48);
  const texture = new window.THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  labelTextureCache.set(cacheKey, texture);
  return texture;
}

let emptyTexture = null;
function blankTexture(){
  if(emptyTexture) return emptyTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  emptyTexture = new window.THREE.CanvasTexture(canvas);
  return emptyTexture;
}

function viewLabel(view){
  return ({force:'Force-directed network', radial:'Radial dendrogram', sunburst:'Sunburst partition', layered:'Layered dendrogram', timeline:'Timeline swimlanes'})[view] || view;
}

function setActiveView(view, shouldRender=true){
  currentView = view;
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if(shouldRender) render();
}

function selectNode(id){
  selectedId = id;
  computeHighlight();
  if(els.clearFocus) els.clearFocus.hidden = false;
  // 3D bakes colour into custom objects, so rebuild them to apply the dimming.
  if(renderMode === '3d') graph?.linkColor(linkColorDisplay).nodeThreeObject(makeNodeLabel);
  renderDetail(id);
  renderNodeList();
  const node = graphData.nodes.find(item => item.id === id);
  focusViewport(node);
}

// Escape a focused branch: drop the selection/highlight and re-frame the graph.
function clearSelection(){
  selectedId = null;
  hoveredId = null;
  computeHighlight();
  if(els.clearFocus) els.clearFocus.hidden = true;
  if(renderMode === '3d') graph?.linkColor(linkColorDisplay).nodeThreeObject(makeNodeLabel);
  renderDetail(graphData.nodes[0]?.id);
  fitGraph(VIEWPORT_MS, 70);
}

function renderDetail(id){
  if(!dataset || !id) {
    els.detail.innerHTML = '<h2>No node selected</h2><p>Load a dataset and select a node.</p>';
    return;
  }
  const node = dataset.nodesById.get(id) || graphData.nodes[0];
  if(!node) return;
  const childNodes = (dataset.children.get(node.id) || []).map(childId => dataset.nodesById.get(childId)).filter(Boolean).slice(0, 20);
  const relationships = dataset.edges.filter(edge => edge.source === node.id || edge.target === node.id).slice(0, 18);
  const sourceMap = new Map((dataset.sources || []).filter(source => source.id).map(source => [source.id, source]));
  const nodeSources = (node.sourceIds || []).map(sourceId => sourceMap.get(sourceId)).filter(Boolean);
  els.detail.innerHTML = `
    <h2>${escapeHtml(node.name)}</h2>
    <div class="chips">
      <span class="chip">${escapeHtml(typeLabel(node.type))}</span>
      ${node.year ? `<span class="chip">${escapeHtml(node.year)}</span>` : ''}
      ${node.lineage ? `<span class="chip">${escapeHtml(node.lineage)}</span>` : ''}
      ${node.branch ? '<span class="chip">Branch root</span>' : ''}
      ${node.status ? `<span class="chip">${escapeHtml(node.status)}</span>` : ''}
    </div>
    <h3>Why it matters</h3>
    <p>${escapeHtml(node.note || 'No note yet.')}</p>
    <h3>Teaching angle</h3>
    <p>${escapeHtml(node.hook || 'Use this node to discuss how lineage, constraints and adoption shape later developments.')}</p>
    ${node.verifiedOn ? `<p class="verification">Verified against current sources: ${escapeHtml(node.verifiedOn)}</p>` : ''}
    ${nodeSources.length ? `<h3>Evidence</h3><div class="sourceList">${nodeSources.map(source => `<div class="source"><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a><small>${escapeHtml(source.note || '')}</small></div>`).join('')}</div>` : ''}
    ${node.tags?.length ? `<h3>Tags <span class="hintInline">(select to filter)</span></h3><div class="chips">${node.tags.map(tag => `<button type="button" class="chip tagChip${tag === activeTag ? ' active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('')}</div>` : ''}
    ${childNodes.length ? `<h3>Children</h3><div class="relList">${childNodes.map(child => `<button type="button" class="mini" data-jump="${child.id}">${escapeHtml(child.name)}</button>`).join('')}</div>` : ''}
    ${relationships.length ? `<h3>Relationships</h3><div class="relList">${relationships.map(edge => `<button type="button" class="mini" data-jump="${edge.source === node.id ? edge.target : edge.source}">${escapeHtml(edge.type)}: ${escapeHtml(dataset.nodesById.get(edge.source)?.name || edge.source)} -&gt; ${escapeHtml(dataset.nodesById.get(edge.target)?.name || edge.target)}</button>`).join('')}</div>` : ''}
  `;
  els.detail.querySelectorAll('[data-jump]').forEach(item => item.addEventListener('click', () => selectNode(item.dataset.jump)));
  // Clicking a tag chip toggles it as the active tag filter.
  els.detail.querySelectorAll('[data-tag]').forEach(item => item.addEventListener('click', () => {
    activeTag = (item.dataset.tag === activeTag) ? 'all' : item.dataset.tag;
    els.tagSelect.value = activeTag;
    render();
  }));
}

function updateOutputs(){
  els.nodeScaleOut.textContent = `${Number(els.nodeScale.value).toFixed(2)}x`;
  els.labelDensityOut.textContent = Number(els.labelDensity.value).toFixed(2);
  els.physRepelOut.textContent = String(Math.round(physValue('physRepel')));
  els.physLinkOut.textContent = `${physValue('physLink').toFixed(2)}x`;
  els.physSpaceOut.textContent = String(Math.round(physValue('physSpace')));
  els.physGravityOut.textContent = physValue('physGravity').toFixed(3);
  SIZE_SLIDERS.forEach(([id, type]) => {
    const out = document.getElementById(`${id}Out`);
    if(out) out.textContent = `${(sizeMul[type] ?? 1).toFixed(2)}x`;
  });
}

function bindControls(){
  document.querySelectorAll('[data-render-mode]').forEach(button => button.addEventListener('click', () => setRenderMode(button.dataset.renderMode)));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setActiveView(button.dataset.view)));
  els.datasetSelect.addEventListener('change', () => loadDataset(els.datasetSelect.value).catch(showLoadFailure));
  els.curriculumSelect.addEventListener('change', () => applyCurriculumPreset(els.curriculumSelect.value));
  els.search.addEventListener('input', () => { searchText = els.search.value; render(); });
  els.lineageSelect.addEventListener('change', () => { activeLineage = els.lineageSelect.value; render(); });
  els.tagSelect.addEventListener('change', () => { activeTag = els.tagSelect.value; render(); });
  Object.values(controls).forEach(control => control.addEventListener('change', render));
  // Visual-only sliders: ease/redraw without re-seeding the layout (no render()).
  els.nodeScale.addEventListener('input', () => { targetNodeScale = Number(els.nodeScale.value) || 1; updateOutputs(); lightRefresh(); });
  els.labelDensity.addEventListener('input', () => { updateOutputs(); lightRefresh(); });
  [els.physRepel, els.physLink, els.physSpace, els.physGravity].forEach(slider =>
    slider.addEventListener('input', () => { updateOutputs(); applyPhysics(); }));
  els.physReset.addEventListener('click', () => {
    Object.entries(PHYSICS_DEFAULTS).forEach(([id, value]) => { els[id].value = value; });
    updateOutputs(); applyPhysics();
  });
  els.paletteSelect.addEventListener('change', () => { activePalette = els.paletteSelect.value; applyPalette(); });
  els.bgSelect.addEventListener('change', applyBackground);
  // Per-type size sliders: update the multiplier and repaint without re-seeding.
  SIZE_SLIDERS.forEach(([id, type]) => {
    const slider = document.getElementById(id);
    if(slider) slider.addEventListener('input', () => { sizeMul[type] = Number(slider.value) || 1; updateOutputs(); lightRefresh(); });
  });
  els.sizeReset.addEventListener('click', () => {
    sizeMul = { ...SIZE_DEFAULTS };
    SIZE_SLIDERS.forEach(([id, type]) => { const s = document.getElementById(id); if(s) s.value = sizeMul[type]; });
    updateOutputs(); lightRefresh();
  });
  els.clearFocus.addEventListener('click', clearSelection);
  document.addEventListener('keydown', event => { if(event.key === 'Escape') clearSelection(); });
  els.fitBtn.addEventListener('click', () => fitGraph(VIEWPORT_MS, 80));
  els.resetBtn.addEventListener('click', resetViewport);
  els.datasetFile.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if(!file) return;
    const raw = JSON.parse(await file.text());
    dataset = normalizeDataset(raw);
    applyDatasetChrome();
    currentView = dataset.defaultView || 'force';
    selectedId = null;
    activeLineage = 'all';
    activeTag = 'all';
    activeCurriculumPreset = 'all';
    els.datasetDescription.textContent = dataset.description || '';
    populateCurriculumPresets(); populateLineages(); populateTags(); renderSources(); setActiveView(currentView, false); render();
  });
}

function showLoadFailure(error){
  console.warn(error);
  els.fileFallback.hidden = false;
  els.hud.textContent = 'Could not fetch JSON. Run a local server or use the file picker.';
}

async function init(){
  bindControls();
  updateOutputs();
  targetNodeScale = Number(els.nodeScale.value) || 1;
  displayNodeScale = targetNodeScale;
  applyPalette();
  applyBackground();
  initGraph();
  window.addEventListener('resize', resizeGraph);
  try {
    await loadManifest();
  } catch(error) {
    showLoadFailure(error);
  }
}

init();
