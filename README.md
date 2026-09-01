# Visual Lineage Atlas

An extensible 2D and 3D visualisation platform for exploring lineages, relationships and curriculum case studies. Game Engine Lineage is the first dataset. Additional datasets can be added without changing the renderer.

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
- To add another lineage, create another JSON file under `data/lineages/` and register it in `data/manifest.json`.

Datasets can include `curriculumPresets` to provide focused views and teaching prompts without coupling the visualisation code to one qualification.

## Current curriculum uses

The Game Engine Lineage dataset includes presets for:

- Pearson BTEC Level 3 Esports Unit 9 learning aims A, B and C.
- Pearson BTEC Level 2 Esports Unit 6.
- Full exploratory use outside assessed activity.

Future atlas candidates include software and programming-language lineages, esports organisations and competition ecosystems, computing hardware generations, web technology stacks, and production-tool pipelines.

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

The HTML currently loads pinned CDN builds of `d3` (for the force tuning — collision/charge/centering forces and drag physics), Three.js, `force-graph`, and `3d-force-graph`. Vendor those libraries locally if the atlas needs to run fully offline.

## Deprecated files

`engine_lineage_visual_atlas.data.js` and `engine_lineage_visual_atlas.expansion.js` are retained only as compatibility notes. Active data now lives in JSON. The domain-neutral application entry points are `atlas.html`, `atlas.css` and `atlas.js`.

## Validate

```bash
node scripts/validate-data.mjs
```

Validation also runs automatically for pushes and pull requests.

## Licence

Code is released under the MIT License. Dataset facts and citations remain subject to their original sources; third-party names and trademarks belong to their respective owners.
