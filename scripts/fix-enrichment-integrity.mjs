import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = file => {
  const p = path.join(root, 'data', 'lineages', file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  return { p, data };
};
const save = ({p,data}) => fs.writeFileSync(p, JSON.stringify(data,null,2)+'\n');
const addSource = (data, source) => {
  data.sources ||= [];
  if(!data.sources.some(x => x.id === source.id)) data.sources.push(source);
};

const game = load('game-design-concepts.json');
for(const source of [
  {id:'valorant-agents',label:'VALORANT: Agents',url:'https://playvalorant.com/en-gb/agents/',note:'Official role and ability reference for VALORANT agents.'},
  {id:'valorant-maps',label:'VALORANT: Maps',url:'https://playvalorant.com/en-gb/maps/',note:'Official VALORANT map reference.'},
  {id:'valorant-news',label:'VALORANT News',url:'https://playvalorant.com/en-gb/news/',note:'Official patch and developer updates.'},
  {id:'lol-patch',label:'League of Legends Patch Notes',url:'https://www.leagueoflegends.com/en-gb/news/tags/patch-notes/',note:'Official live balance and systems changes.'},
  {id:'overwatch-news',label:'Overwatch News',url:'https://overwatch.blizzard.com/en-gb/news/',note:'Official hero, systems and balance updates.'},
  {id:'algs',label:'Apex Legends Global Series',url:'https://algs.ea.com/',note:'Official Apex Legends competitive circuit.'}
]) addSource(game.data, source);
save(game);

const dev = load('software-development.json');
for(const source of [
  {id:'mdn-http',label:'MDN HTTP overview',url:'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview',note:'Reference for HTTP request/response behaviour used by web APIs.'},
  {id:'owasp2025',label:'OWASP Top 10: 2025',url:'https://owasp.org/Top10/2025/',note:'Current OWASP application-security risk categories.'}
]) addSource(dev.data, source);
dev.data.edges = (dev.data.edges || []).filter(edge => !(edge.source === 'dev-rest' && edge.target === 'http'));
save(dev);

console.log('enrichment integrity patches applied');
