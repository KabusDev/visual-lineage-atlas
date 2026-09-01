# Visual Lineage Atlas

An extensible 2D and 3D visualisation platform for exploring lineages, relationships and curriculum case studies. It currently includes six datasets spanning game engines, web standards, programming-language releases, AI model families, the esports ecosystem and live-broadcast technology. Additional datasets can be added without changing the renderer.

The platform is designed for classroom exploration and research prompts. It is not a substitute for learner analysis or independently verified assessment evidence.

## Run locally

Browsers restrict `fetch()` from raw `file://` pages, so run a local static server from this folder:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Data layout

- `data/manifest.json` lists available datasets.
- `data/lineages/game-engines.json` contains the current game engine lineage dataset.
- `data/lineages/web-platform.json` maps HTML, CSS, ECMAScript, HTTP, browser APIs and WebAssembly.
- `data/lineages/programming-languages.json` compares selected language releases, editions, standards and runtimes.
- `data/lineages/ai-models.json` maps selected AI model families, variants, open-weight branches and distillation links.
- `data/lineages/esports-ecosystem.json` connects rights holders, operators, competition, education, careers, media and commerce.
- `data/lineages/live-broadcast.json` follows sources through production, encoding, transport, distribution and audience assurance.
- To add another lineage, create another JSON file under `data/lineages/` and register it in `data/manifest.json`.

Datasets can include `curriculumPresets` to provide focused views and teaching prompts without coupling the visualisation code to one qualification.

## Current curriculum uses

The Game Engine Lineage dataset includes presets for:

- Pearson BTEC Level 3 Esports Unit 9 learning aims A, B and C.
- Pearson BTEC Level 2 Esports Unit 6.
- Full exploratory use outside assessed activity.

The Web Platform dataset adds focused views for web foundations, HTTP and networking, modern browser applications, and standards literacy.

The four expanded datasets add presets for:

- Software-development choices, language standards, web programming and systems programming.
- Current AI releases, open-weight ecosystems, reasoning models and responsible-AI investigation.
- Pearson BTEC Level 2 Esports Units 1 and 5, and Level 3 Units 1, 3, 5, 7, 10 and 11 through linked esports ecosystem views.
- Pearson BTEC Level 2 Esports Unit 3 and Level 3 Units 6 and 20 through live-production and networking views.

Future atlas candidates include computing hardware generations, operating systems, storage and networking standards, cybersecurity attack-and-defence relationships, data structures and software-development lifecycles.

## Evidence and freshness

High-risk or time-sensitive claims should include:

- `sourceIds`: references to primary sources in the dataset-level `sources` array.
- `verifiedOn`: the ISO date on which the claim was checked.
- `status`: for example `released`, `migration`, `roadmap` or `historical`.

The validator checks structure and reference integrity. Editorial review is still required because an internally consistent relationship can remain factually wrong.

## Visualisation stack

The atlas has two render modes:

- `force-graph` for high-legibility 2D canvas views.
- `3d-force-graph` on top of Three.js/WebGL for spatial 3D exploration.

The app code handles dataset loading, filtering, view presets, and the details panel.

The HTML currently loads pinned CDN builds of `d3` for collision, charge, centering and drag physics, plus Three.js, `force-graph`, and `3d-force-graph`. Vendor those libraries locally if the atlas needs to run fully offline.

## Deprecated files

`engine_lineage_visual_atlas.data.js` and `engine_lineage_visual_atlas.expansion.js` are retained only as compatibility notes. Active data now lives in JSON. The domain-neutral application entry points are `atlas.html`, `atlas.css` and `atlas.js`.

## Validate

```bash
node scripts/validate-data.mjs
```

All six datasets can be regenerated or expanded reproducibly from their reviewed definitions and expansion catalogue:

```bash
node scripts/generate-expanded-datasets.mjs
```

`scripts/atlas-expansions.mjs` holds the second-pass catalogue used to extend the generated datasets and the established Game Engine and Web Platform maps. Additions are idempotent, so regeneration does not duplicate nodes, sources or links.

Validation also runs automatically for pushes and pull requests.

## Publish with GitHub Pages

The `Deploy Pages` workflow validates and publishes the atlas after each push to `main`. It can also be run manually from the Actions tab. GitHub Pages must use **GitHub Actions** as its build source.

## Licence

Code is released under the MIT License. Dataset facts and citations remain subject to their original sources; third-party names and trademarks belong to their respective owners.
