# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the author, working as an enterprise architect. They model enterprise architectures with ArchiMate 3.2 and organize the work along the TOGAF ADM, for their own work or for clients. Most sessions happen at a desk in Chrome. The phone and tablet layout covers looking at a model and making quick edits away from the desk.
Outputs reach other people as files: the workspace JSON, SVG exports of views, and CSV exports of catalogs and matrices.

## Product Purpose

Arch TOGAF is a fast, zero-install workbench for one architect. It gives an architecture a **model**: typed elements and relationships that exist once and appear in many views. It also tracks progress through the ADM phases, and generates TOGAF catalogs and matrices from the model.
Success means modeling and ADM tracking are quicker than opening a full EA tool, and the result is still correct ArchiMate and usable in architecture documents.

## Positioning

A lightweight companion, not a replacement for a full EA repository (Archi, Sparx, BiZZdesign, LeanIX). It is one HTML file: open it, and the whole workspace is one JSON file you own, read and written in place. There is no server, no account and no install.

## Operating Context

- Runs in Google Chrome (File System Access API for in-place save). Other browsers fall back to upload and download.
- Online preview on GitHub Pages: https://avchaykin.github.io/arch-togaf/
- Source: https://github.com/avchaykin/arch-togaf (public). It is a fork of arch-diagram (https://github.com/avchaykin/arch-diagram) and keeps its diagram engine: routing, connectors, flows, rich-text notes.
- Workspaces are shared by passing the JSON file around (a shared folder or Git); there is no multi-user editing.
- TOGAF vocabulary is used as is: ADM phases (Preliminary, A–H, Requirements Management), viewpoints, catalogs, matrices, artifacts, deliverables.

## Capabilities and Constraints

- Hard constraints: a single HTML/JS file, no server and no build step. All data is stored in JSON. Local files are read and written in Chrome. The saved JSON records the application name, its version and the GitHub link.
- Every change is committed to git. Pushes to GitHub happen only on request.
- Current version (0.1):
  - model and views, ArchiMate element and relationship types with standard notation, and a relationship picker limited to valid types;
  - viewpoints that filter the palette, a model browser, and nesting;
  - an ADM panel with phase status and deliverable checklists, catalogs and matrices with CSV export, and SVG export;
  - an adaptive layout for phones and tablets.
- Planned work is in ROADMAP.md: the full ArchiMate relationship table, junctions, properties schemas, TOGAF artifacts and requirements, plateaus, gaps and roadmaps, document generation, and Open Exchange Format import/export.
- User-facing docs: README.md and DOCUMENTATION.md.

## Evidence on Hand

- The example workspace "Online ordering" is built into the app and also saved in `sample.json`. It has 4 views, for ADM phases A–D.
- Screenshot: `docs/screenshot.png`.
- There are no testimonials, user numbers, customers or benchmarks. Do not invent any.

## Product Principles

1. **The file is the product.** Everything lives in one portable JSON file that the user owns. Never require a server, an account or a build step.
2. **Model first, pictures second.** An element or relationship exists once. Views, catalogs and matrices are projections of the model, and they must stay consistent with it.
3. **Correct notation over decoration.** ArchiMate shapes, colors and line styles follow the standard, so the diagrams can go straight into architecture documents.
4. **Fast for one expert.** Optimize for a practitioner who knows TOGAF: keyboard shortcuts, dense panels, few dialogs. Guidance is there when needed and never in the way.
5. **Stay a companion.** Prefer depth in the core flows over breadth that imitates a full EA suite.

## Accessibility & Inclusion

Target WCAG 2.2 AA for the application UI: contrast, keyboard operation, focus visibility and target sizes. The ArchiMate layer colors are part of the notation; where they carry meaning, back them up with type glyphs and labels rather than relying on color alone.
