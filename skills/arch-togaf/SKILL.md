---
name: arch-togaf
description: Read, analyse and change Arch TOGAF workspaces, the JSON files of the Arch TOGAF app that hold an ArchiMate 3.2 model, its views and the TOGAF ADM state. Use when the user asks about an enterprise architecture model or a TOGAF/ArchiMate workspace file (what is in it, what depends on what, what is wrong with it, catalogs and matrices), or to add, change, relate or remove elements, relationships, views or ADM phase progress in one. Not for software-project diagrams in arch-diagram format; those use the arch-diagram skill.
---

# Arch TOGAF workspaces

A workspace is one `.json` file opened in the Arch TOGAF app (https://avchaykin.github.io/arch-togaf/ or `index.html` of the repo). It holds:
- one **model**: typed ArchiMate elements and relationships;
- **views** that show parts of the model;
- the **ADM** progress.

The user names the file. There is no default workspace; ask when it is not clear which file is meant.

Never edit the JSON by hand. Always go through the command-line tool. It uses the app's own element types and relationship rules, keeps the user's layout and styles, writes atomically and keeps a hidden backup `.<file>.bak`:

```
node ~/avc/Projekcts/arch-togaf/tools/togaf.mjs <command> …
```

Below, `togaf` stands for that command. Add `--json` to any read command for machine-readable output.

## Read

| Command | Gives |
|---|---|
| `togaf info FILE` | model name, counts by layer, views, ADM status |
| `togaf views FILE` | views with viewpoint, phase, size |
| `togaf show FILE VIEW` | the elements and relationships drawn in one view |
| `togaf elements FILE [--type T,..] [--layer L] [--search S] [--unused]` | elements |
| `togaf element FILE REF` | one element: documentation, properties, relationships, views |
| `togaf relations FILE [--type T,..] [--of REF]` | relationships |
| `togaf adm FILE` | ADM phases: status, checklist progress, views |

## Analyse

| Command | Gives |
|---|---|
| `togaf check FILE` | Errors: things the app would drop silently on load, and invalid relationships. Warnings: viewpoint violations and duplicate names. Notes: unused elements, undrawn relationships, missing documentation. Exits 1 on errors. |
| `togaf impact FILE REF [--depth N] [--dir in\|out\|both] [--rel T,..]` | what an element reaches through relationships, and what reaches it |
| `togaf catalog FILE TYPE,.. [--csv]` | an element catalog (Markdown table) |
| `togaf matrix FILE ROWTYPES COLTYPES [--csv]` | a relationship matrix |
| `togaf rules SOURCE_TYPE TARGET_TYPE` | valid relationships between two types, and the suggested one |
| `togaf types [LAYER]`, `togaf viewpoints` | the metamodel |

Run `togaf check` before reporting on a workspace, and again after changing it.

## Change

Changes go through one batch of operations, applied all or nothing:

```
togaf apply FILE OPS.json [--dry-run]       # or: … apply FILE - <<'EOF' … EOF
```

```json
[
  {"op": "addElement", "type": "applicationComponent", "name": "CRM", "documentation": "Customer master data", "properties": {"Owner": "Sales"}},
  {"op": "addElement", "type": "applicationService", "name": "Customer lookup"},
  {"op": "addRelationship", "type": "realization", "source": "CRM", "target": "Customer lookup"},
  {"op": "addRelationship", "type": "serving", "source": "Customer lookup", "target": "Web shop"},
  {"op": "show", "view": "Order system", "elements": ["CRM", "Customer lookup"]},
  {"op": "addView", "name": "CRM landscape", "viewpoint": "applicationCooperation", "phase": "C", "elements": ["CRM", "Customer lookup", "Web shop"]},
  {"op": "setPhase", "phase": "C", "status": "progress", "check": ["Application Portfolio catalog"]}
]
```

All operations:

| Group | Operations |
|---|---|
| Elements | `addElement`, `updateElement` (`ref`, plus fields; `properties` merges, `null` deletes a key), `removeElement` (also removes its relationships and its blocks in every view) |
| Relationships | `addRelationship` (`type`, `source`, `target`, optional `name`, `accessType`, `directed`, `force`, `draw`), `updateRelationship`, `removeRelationship` |
| Views | `addView` (optional `elements` lays them out), `updateView`, `removeView` |
| Placement | `show` (put elements in a view; their relationships with elements already there are drawn), `hide` (remove from the view only), `layout` (lay a view out again) |
| ADM | `setPhase` (`phase`: prelim, A…H, RM; `status`: none, progress, done, skip; `notes`; `check` / `uncheck` checklist items by name) |

References:
- `ref`, `source` and `target` are an element **id or its exact name** (not case-sensitive). When a name is shared, use `"Type:Name"` or the id.
- A relationship ref can also be `{"source": …, "target": …, "type": …}`.
- An element created earlier in the same batch can be referenced by its name, or by an `id` you give it.

Rules:
- **Reuse before you create.** Run `togaf elements FILE --search …` first. Duplicate elements make catalogs and matrices wrong.
- **Relationships must be valid ArchiMate.** The tool refuses an invalid one and lists the valid types; check with `togaf rules A B`. Pass `"force": true` only when the user asks for it.
- **The direction matters.** For example, an application component *realizes* an application service, and a service *serves* a process. When unsure, `togaf rules` gives the suggested type for each direction.
- **Drawing is automatic.** A new relationship is drawn in every view that shows both of its elements.
- **Layout:** new blocks are placed next to elements of the same layer. `layout` arranges a whole view in rows: motivation and strategy, business, application, technology, implementation. It replaces the user's arrangement, so only use it on views you created or when asked.
- Nesting a block inside a container (grouping, location, node) is not supported by the tool yet. Tell the user to do it in the app.
- Use `--dry-run` to preview a large change, and show the user the summary before writing.

## The app picks up changes live

The app reloads the file automatically when the user has it open in Chrome or Edge through Open (or Save as), with no unsaved changes. The user sees the change appear, and **Undo** in the app reverts it.

If the user has unsaved changes, the app asks: load the version on disk, or keep theirs. If they keep theirs and save, your change is overwritten. So after writing, tell the user what changed, and ask them to save their own work first if they were editing.

If the tool says the file changed on disk while it ran, the app saved in between. Run the command again.

## Reporting

- **After a change:** say what was added, changed or removed, list any warnings from the tool, and give the result of `togaf check`.
- **After analysis:** use the element names, not the ids, and quote the relationship types.
