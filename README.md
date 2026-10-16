# Arch TOGAF

A single-file, serverless web app for enterprise architecture work with **TOGAF** and **ArchiMate 3.2**.
Open `index.html` in Google Chrome (or Edge). Nothing to install, no build step and no server.

It is a fork of [arch-diagram](https://github.com/avchaykin/arch-diagram) and keeps its diagram engine: orthogonal routing around blocks, connectors, flows, rich-text notes and in-place file editing.
What it adds is a **model**: elements and relationships that exist once and appear in many views.
See [ROADMAP.md](ROADMAP.md) for the plan of the next versions.

## Features (v0.1)

- **Model and views**: a workspace holds one model (typed elements and relationships) and any number of views, shown as tabs above the canvas.
  Renaming an element, or changing its type, updates every view that shows it.
- **ArchiMate elements** of all layers: Strategy, Business, Application, Technology, Physical, Motivation, Implementation & Migration, plus Location and Grouping.
  Each type has its layer color, its icon in the top-right corner and its shape (rounded for behavior, cut corners for motivation, a tab for grouping).
- **ArchiMate relationships** with their standard notation: composition, aggregation, assignment, realization, serving, access (read / write / read-write), influence, triggering, flow, specialization and association (optionally directed).
- **Relationship picker**: Shift + drag from one element to another, then choose the relationship. Only the types valid between the two element types are offered (simplified ArchiMate rules; a setting allows any type).
  Dragging the end of a relationship onto another element reconnects it in the model.
- **Palette** filtered by the view's **viewpoint** (Motivation, Stakeholder, Goal realization, Strategy, Capability map, Business process cooperation, Application cooperation / usage, Technology, Layered, Project, Migration…). Click a type, or drag it onto the canvas.
- **Model browser**: search, elements by layer, relationships and views. Drag an element onto the canvas to reuse it; its existing relationships with elements already in the view are drawn.
  The inspector shows an element's documentation, properties (key / value), relationships and the views that use it.
- **Delete** removes from the view; **Ctrl/⌘ + Delete** deletes from the model and every view.
- **Nesting**: blocks inside a grouping, node, location… move with it, and relationships shown by nesting are not drawn as lines.
- **Copy / paste** like Archi: into a view that does not show the element yet, a reference to the same element; otherwise a new copy.
- **ADM**: the cycle as a wheel (Preliminary, A–H, Requirements Management). For each phase: status, objectives, notes, the checklist of its typical TOGAF artifacts and deliverables, and its views. A new view for a phase gets the phase's usual viewpoint.
- **Catalogs & matrices** (toolbar): element and relationship catalogs with TOGAF presets (Application Portfolio, Interface, Principles, Requirements, Stakeholders…), and matrices between two element types with presets (Actor/Role, Application/Function, Application/Data, Role/Application…). All export to CSV.
- **From arch-diagram**: blocks, links, flows, rich-text notes, routing settings, SVG export, undo/redo. Opening an arch-diagram file imports it as one view of notes.
- **Files**: the workspace is one JSON file. In Chrome the File System Access API reads and writes it in place; other browsers fall back to upload/download. Work is also auto-saved in browser storage.

## JSON format

```json
{
  "app": { "name": "arch-togaf", "version": "0.1.0", "github": "https://github.com/avchaykin/arch-togaf" },
  "format": 1,
  "savedAt": "…",
  "settings": { "canvas": {}, "routing": {}, "block": {}, "link": {}, "model": {} },
  "model": {
    "name": "Online ordering",
    "elements": [ { "id": "e1", "type": "applicationComponent", "name": "Web shop", "documentation": "…", "properties": [ { "key": "Owner", "value": "…" } ] } ],
    "relationships": [ { "id": "r1", "type": "serving", "source": "e2", "target": "e1", "name": "" } ]
  },
  "views": [ {
    "id": "v1", "name": "Order system", "viewpoint": "applicationUsage", "phase": "C", "description": "…",
    "blocks": [ { "id": "b1", "element": "e1", "x": 0, "y": 0, "w": 160, "h": 72, "fill": "#b5ffff", "shape": "rect" } ],
    "links":  [ { "id": "l1", "rel": "r1", "from": { "block": "b2", "side": "auto" }, "to": { "block": "b1", "side": "auto" }, "route": "poly" } ],
    "flows":  [],
    "vp": { "x": 0, "y": 0, "k": 1 }
  } ],
  "activeView": "v1",
  "adm": { "phases": { "A": { "status": "done", "notes": "…", "checked": { "Architecture Vision": true } } } }
}
```

- A block with `element` shows a model element; a block without it is a note with a rich-text `title`.
- A link with `rel` shows a model relationship and must join blocks of the relationship's source and target. Its line style and ends come from the relationship type. A link without `rel` is a plain connection.
- Element `type` and relationship `type` use the ids of ArchiMate 3.2 concepts in camelCase (`businessActor`, `applicationComponent`, `systemSoftware`, `workPackage`…).
- `phase` is one of `prelim`, `A`…`H`, `RM`. Phase `status` is `none`, `progress`, `done` or `skip`.
- Link ends, waypoints and flows are as in arch-diagram.

`sample.json` is the example workspace shown on first start.

## Shortcuts

| Action | Keys |
|---|---|
| New element (last used type) | double-click canvas |
| Rename element / edit note | double-click it / Enter |
| New relationship | Shift + drag from an element to another |
| Remove from view / delete from model | Del / Ctrl/⌘ + Del |
| Move a polyline segment | drag the segment |
| Reset an adjusted polyline | double-click a segment |
| Undo / redo | Ctrl/⌘+Z, Ctrl/⌘+Shift+Z |
| Copy / paste / duplicate | Ctrl/⌘+C / V / D |
| Save / save as / open | Ctrl/⌘+S, Ctrl/⌘+Shift+S, Ctrl/⌘+O |
| Zoom / pan / box select | wheel / drag empty canvas / Shift + drag |
| Fit | F |

## Upstream

The diagram engine comes from arch-diagram. To bring in its later fixes:

```sh
git remote add upstream https://github.com/avchaykin/arch-diagram.git   # once
git fetch upstream && git merge upstream/main
```
