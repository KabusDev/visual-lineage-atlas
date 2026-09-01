import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'data', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
const errors = [];
const warnings = [];

if(manifest.schemaVersion !== 1) errors.push(`Unsupported manifest schema: ${manifest.schemaVersion}`);
if(!Array.isArray(manifest.datasets) || manifest.datasets.length === 0) errors.push('Manifest must contain at least one dataset.');
const manifestIds = new Set();

for(const item of manifest.datasets || []){
  if(!item.id || !item.title || !item.path) errors.push('Each manifest entry needs id, title and path.');
  if(manifestIds.has(item.id)) errors.push(`Manifest contains duplicate dataset id ${item.id}.`);
  manifestIds.add(item.id);
  const datasetPath = path.resolve(root, item.path);
  if(!datasetPath.startsWith(path.join(root, 'data'))) {
    errors.push(`${item.id}: dataset path escapes the data directory.`);
    continue;
  }
  if(!fs.existsSync(datasetPath)){
    errors.push(`${item.id}: missing ${path.relative(root, datasetPath)}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8').replace(/^\uFEFF/, ''));
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];
  const ids = new Set();
  const sourceIds = new Set();
  const edgeIds = new Set();
  const reviewedCitations = data.citationMode === 'referenced';

  if(data.id !== item.id) errors.push(`${item.id}: dataset id is ${data.id || 'missing'}.`);
  if(!data.title || !data.description) errors.push(`${item.id}: dataset needs title and description.`);
  for(const citation of data.sources || []){
    if(!citation.id || !citation.label || !citation.url){
      if(reviewedCitations) warnings.push(`${item.id}: source entries should include id, label and url.`);
      continue;
    }
    if(sourceIds.has(citation.id)) errors.push(`${item.id}: duplicate source id ${citation.id}.`);
    sourceIds.add(citation.id);
    try {
      const url = new URL(citation.url);
      if(!['http:', 'https:'].includes(url.protocol)) errors.push(`${item.id}: source ${citation.id} is not an HTTP(S) URL.`);
    } catch {
      errors.push(`${item.id}: source ${citation.id} has an invalid URL.`);
    }
  }

  for(const node of nodes){
    if(!node.id || !node.name || !node.type) errors.push(`${item.id}: every node needs id, name and type.`);
    if(ids.has(node.id)) errors.push(`${item.id}: duplicate node id ${node.id}.`);
    ids.add(node.id);
    if(reviewedCitations && (!node.note || !node.hook)) warnings.push(`${item.id}: ${node.id} should include both note and learner hook.`);
    if(/current|preview|candidate|roadmap/i.test(node.status || '') && (!node.verifiedOn || !(node.sourceIds || []).length)){
      warnings.push(`${item.id}: time-sensitive node ${node.id} should include verifiedOn and sourceIds.`);
    }
  }

  for(const node of nodes){
    if(node.parent && !ids.has(node.parent)) errors.push(`${item.id}: ${node.id} has missing parent ${node.parent}.`);
    for(const sourceId of node.sourceIds || []){
      if(!sourceIds.has(sourceId)) errors.push(`${item.id}: ${node.id} references missing source ${sourceId}.`);
    }
  }

  for(const edge of edges){
    if(!ids.has(edge.source) || !ids.has(edge.target)) errors.push(`${item.id}: broken edge ${edge.source} -> ${edge.target}.`);
    if(edge.source === edge.target) errors.push(`${item.id}: self-link on ${edge.source}.`);
    const edgeId = `${edge.source}|${edge.target}|${edge.type || ''}`;
    if(edgeIds.has(edgeId)) errors.push(`${item.id}: duplicate edge ${edge.source} -> ${edge.target} (${edge.type || 'untyped'}).`);
    edgeIds.add(edgeId);
  }

  const roots = nodes.filter(node => !node.parent);
  if(roots.length !== 1) errors.push(`${item.id}: expected exactly one root node, found ${roots.length}.`);
  for(const start of nodes){
    const visited = new Set();
    let current = start;
    while(current?.parent){
      if(visited.has(current.id)){
        errors.push(`${item.id}: parent cycle detected from ${start.id}.`);
        break;
      }
      visited.add(current.id);
      current = nodes.find(candidate => candidate.id === current.parent);
    }
  }

  const presetIds = new Set();
  for(const preset of data.curriculumPresets || []){
    if(!preset.id || !preset.title) errors.push(`${item.id}: curriculum presets need id and title.`);
    if(presetIds.has(preset.id)) errors.push(`${item.id}: duplicate curriculum preset ${preset.id}.`);
    presetIds.add(preset.id);
    if(preset.tag && preset.tag !== 'all' && !nodes.some(node => (node.tags || []).includes(preset.tag))){
      warnings.push(`${item.id}: preset ${preset.id} uses tag ${preset.tag}, but no node has it.`);
    }
  }

  console.log(`${item.id}: ${nodes.length} nodes, ${edges.length} edges, ${(data.sources || []).length} sources`);
}

if(errors.length){
  console.error(errors.join('\n'));
  process.exit(1);
}

if(warnings.length) console.warn(`Warnings:\n${warnings.join('\n')}`);

console.log('All datasets are structurally valid.');
