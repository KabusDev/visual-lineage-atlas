import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'data', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
const errors = [];

if(manifest.schemaVersion !== 1) errors.push(`Unsupported manifest schema: ${manifest.schemaVersion}`);
if(!Array.isArray(manifest.datasets) || manifest.datasets.length === 0) errors.push('Manifest must contain at least one dataset.');

for(const item of manifest.datasets || []){
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
  const sourceIds = new Set((data.sources || []).map(source => source.id).filter(Boolean));

  for(const node of nodes){
    if(!node.id || !node.name || !node.type) errors.push(`${item.id}: every node needs id, name and type.`);
    if(ids.has(node.id)) errors.push(`${item.id}: duplicate node id ${node.id}.`);
    ids.add(node.id);
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
  }

  for(const preset of data.curriculumPresets || []){
    if(!preset.id || !preset.title) errors.push(`${item.id}: curriculum presets need id and title.`);
  }

  console.log(`${item.id}: ${nodes.length} nodes, ${edges.length} edges, ${(data.sources || []).length} sources`);
}

if(errors.length){
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('All datasets are structurally valid.');
