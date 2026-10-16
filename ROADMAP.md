# Arch TOGAF — roadmap

Arch TOGAF is a fork of [arch-diagram](https://github.com/avchaykin/arch-diagram). The aim is a small suite for working on an enterprise architecture with TOGAF and ArchiMate.
It keeps the same constraints: one HTML file, no server, no build step, data in JSON, local files read and written in place in Chrome.

## Main idea: from drawings to a model

arch-diagram stores **pictures**: blocks and lines with styles.
TOGAF work needs a **repository**: typed elements and relationships that exist once and appear in many views. Catalogs, matrices, gap analysis and reports are then generated from it.

```
Workspace (.json)
├── model        elements (typed: ArchiMate 3.2 / TOGAF content metamodel) + relationships
├── views[]      diagrams; each block references an element, each link a relationship
├── adm          ADM cycle state: phase status, notes, deliverable checklist
└── settings
```

Everything built in arch-diagram (routing, connectors, flows, rich text, file handling) is kept and used by the views.

## Phases

### v0.1: Repository, ArchiMate notation, ADM navigator (this version)
- [x] Fork with history; new app id, GitHub link, storage keys
- [x] Model/view separation: elements and relationships live in the model, views reference them
- [x] ArchiMate 3.2 element types in 7 layers (Strategy, Business, Application, Technology, Physical, Motivation, Implementation & Migration, plus Location and Grouping), with layer colors, type icons and shapes
- [x] ArchiMate relationship types (composition, aggregation, assignment, realization, serving, access, influence, triggering, flow, specialization, association) with their standard notation
- [x] Relationship picker when connecting two elements, limited to valid types (simplified ArchiMate rules)
- [x] Multiple views per workspace (tabs), each with an ArchiMate/TOGAF viewpoint that filters the palette and an ADM phase
- [x] Palette (click or drag to add), model browser (search, drag an element into a view, find where it is used)
- [x] Reusing an element in another view, and adding its existing relationships automatically
- [x] Nesting: moving a container (grouping, node, location…) moves the blocks inside it
- [x] ADM panel: wheel of phases with status, objectives, notes, artifact and deliverable checklist, views per phase
- [x] Catalogs (elements, relationships) and generic matrices (rows type × columns type), with CSV export
- [x] Import of arch-diagram files (as notes in one view)

### v0.2: Better modeling
- Full ArchiMate 3.2 relationship table (instead of simplified rules) and derived relationships
- Junctions (and/or), nested relationships shown by nesting, optional "nesting creates a relationship"
- Element properties schema per type (owner, lifecycle, cost, criticality…) and property-based coloring/labels
- Specializations (profiles) and custom icons
- Multi-select editing in the model browser; merge duplicate elements; rename refactoring

### v0.3: TOGAF artifacts
- Predefined TOGAF catalogs, matrices and diagrams per phase (Application Portfolio, Interface catalog, Application/Function matrix, Actor/Role matrix…), linked from the ADM checklist
- Stakeholder map and concerns; architecture principles catalog with rationale and implications
- Requirements management: requirements catalog with status, priority, traceability to elements, impact assessment

### v0.4: Baseline, target, gaps and roadmap
- Plateaus (baseline, transitions, target) and element membership per plateau
- Gap analysis matrix generated from two plateaus (kept / changed / new / removed)
- Work packages, deliverables and a simple roadmap (Gantt) view
- Architecture Roadmap and Implementation & Migration Plan

### v0.5: Documents and governance
- Document generator (HTML/Markdown/print to PDF): Architecture Vision, Architecture Definition Document, Statement of Architecture Work, Architecture Requirements Specification, built from model, views and notes
- Architecture contracts, compliance reviews, dispensations, change requests (phases G and H)
- Architecture Repository structure (Architecture Landscape at Strategic / Segment / Capability levels, Standards Information Base, Reference Library)

### v0.6: Interoperability and collaboration
- Import/export of the ArchiMate Model Exchange File Format (XML), to and from Archi and other tools
- Export of views to PNG/PDF; image export of matrices
- A workspace split into several files in a folder (File System Access directory handle), easier to diff and merge in Git
- Model validation report (unused elements, invalid relationships, views without phase…)

## Out of scope for now
- Multi-user editing and a server
- Full TOGAF content metamodel extensions beyond ArchiMate (they can be approached with specializations in v0.2)
