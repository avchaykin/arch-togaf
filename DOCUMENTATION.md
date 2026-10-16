# Arch TOGAF: user guide

Arch TOGAF is a tool for describing an enterprise architecture with **ArchiMate 3.2** diagrams, and for organizing the work along the **TOGAF ADM**.
It is one HTML file that runs in the browser, with no installation and no server.

- [1. Getting started](#1-getting-started)
- [2. Key ideas: model, views, notes](#2-key-ideas-model-views-notes)
- [3. The screen](#3-the-screen)
- [4. Elements](#4-elements)
- [5. Relationships](#5-relationships)
- [6. Views and viewpoints](#6-views-and-viewpoints)
- [7. The model browser](#7-the-model-browser)
- [8. Layout: moving, nesting, routing, styling](#8-layout-moving-nesting-routing-styling)
- [9. Flows](#9-flows)
- [10. The ADM panel](#10-the-adm-panel)
- [11. Catalogs and matrices](#11-catalogs-and-matrices)
- [12. A TOGAF walkthrough](#12-a-togaf-walkthrough)
- [13. Files, saving and export](#13-files-saving-and-export)
- [14. Settings](#14-settings)
- [15. Keyboard and mouse reference](#15-keyboard-and-mouse-reference)
- [16. Tips and limitations](#16-tips-and-limitations)

---

## 1. Getting started

1. Open `index.html` in **Google Chrome** or **Microsoft Edge**.
   Other browsers work too, but they cannot save a file in place: saving downloads a copy instead.
2. The first time, an **example workspace** opens: "Online ordering", with one view for each ADM phase from A to D. Look around in it, then use **New** for an empty workspace.
3. Save with **Ctrl/⌘ + S**. The first save asks where to put the `.json` file; later saves write to the same file.

Your work is also auto-saved in the browser. If you close the tab without saving, the workspace comes back the next time you open the tool. Treat this as a safety net, not as storage: save to a file.

---

## 2. Key ideas: model, views, notes

**Workspace.** Everything you save in one `.json` file: the model, the views, the ADM state and the settings.

**Model.** The list of architecture **elements** (a Business Actor "Customer", an Application Component "ERP"…) and **relationships** between them ("ERP serves Handle order"). Each element exists **once** in the model.

**View.** A diagram that shows part of the model. A view shows elements as boxes and relationships as lines. The same element can appear in many views. If you rename it in one view, the name changes in all of them. Views are the tabs above the canvas.

**Note.** A box with free rich text that is **not** part of the model: comments, titles, legends. Lines between notes, or between a note and an element, are plain connections and are not part of the model either.

Two kinds of delete follow from this:

| Action | What it does |
|---|---|
| **Del** | Removes the selection from the **current view** only. The elements stay in the model and in other views. |
| **Ctrl/⌘ + Del** (or "Delete from model") | Deletes the selected elements and relationships from the **model**, and so from **every view**. |

Both can be undone with Ctrl/⌘ + Z.

---

## 3. The screen

```
┌──────────────────────────── toolbar ─────────────────────────────┐
├─────────────┬─────────── view tabs ───────────────┬──────────────┤
│ Palette     │                                     │ Properties   │
│ Model       │              canvas                 │ Flows        │
│ ADM         │                                     │              │
└─────────────┴─────────────────────────────────────┴──────────────┘
```

- **Toolbar**: New, Open, Save, Save as, Export SVG, **Catalogs**, Undo, Redo, Delete, zoom, Fit, Settings, Help, and a link to the source code. The file name is on the right; a dot (●) means unsaved changes.
- **View tabs**: one tab per view. A colored badge shows the view's ADM phase; its color is the phase status. Click to switch, double-click to rename, **+** to add a view.
- **Left panel**:
  - **Palette**: the element types you can add to the current view.
  - **Model**: browse and search the whole model.
  - **ADM**: the ADM cycle with the status, checklist and views of each phase.
- **Right panel**:
  - **Properties**: what is selected. With nothing selected, it shows the view and the model, with quick help.
  - **Flows**: numbered step sequences drawn over the current view.

---

## 4. Elements

### Adding elements

- **Click a type in the Palette**: the element is added in the middle of the canvas.
- **Drag a type from the Palette** onto the canvas: the element is added where you drop it.
- **Double-click empty canvas**: adds an element of the **last used type**. The hint at the bottom of the canvas shows which type that is.

New elements get the type name as their name ("Business Actor"). Rename them right away (see below).

Hover a palette button to see the type name. The palette is grouped by layer, in the ArchiMate colors:

| Layer | Color | Types |
|---|---|---|
| Strategy | beige | Resource, Capability, Value Stream, Course of Action |
| Business | yellow | Business Actor, Role, Collaboration, Interface, Process, Function, Interaction, Event, Service, Business Object, Contract, Representation, Product |
| Application | light blue | Application Component, Collaboration, Interface, Function, Interaction, Process, Event, Service, Data Object |
| Technology | green | Node, Device, System Software, Technology Collaboration, Interface, Path, Communication Network, Technology Function, Process, Interaction, Event, Service, Artifact |
| Physical | green | Equipment, Facility, Distribution Network, Material |
| Motivation | lilac | Stakeholder, Driver, Assessment, Goal, Outcome, Principle, Requirement, Constraint, Meaning, Value |
| Implementation & Migration | pink / light green | Work Package, Deliverable, Implementation Event, Plateau, Gap |
| Other | | Location, Grouping, and **Note** (not a model element) |

The palette only shows the types allowed by the view's **viewpoint** (see [section 6](#6-views-and-viewpoints)). Location, Grouping and Note are always available.

### How elements look

An element's look follows ArchiMate:
- its fill is the layer color;
- its type icon is in the top-right corner;
- behavior elements (processes, functions, services, events) have rounded corners;
- motivation elements have cut corners;
- a Grouping is a dashed box with a tab.

Two settings change this (see [section 14](#14-settings)): one hides the icon, the other shows the type name under the element name.

### Renaming

- **Double-click** the element, type the name, press **Enter** (or Esc, or click elsewhere).
- Or select it and edit **Name** in the Properties panel.

The new name shows in every view.

### Element properties (right panel)

Selecting an element shows:

- **Type tag and layer**.
- **Name**, **Type**, **Documentation**: the documentation is free text: a description, rationale, implications…
- **Properties**: any number of key/value pairs, for example `Owner = E-commerce team` or `Lifecycle = Target`. Use **+ Property** to add one and ✕ to remove it. Properties appear in catalogs and their CSV exports.
- **Model relations**: every relationship of this element, in the model and not only in this view. → means outgoing and ← incoming. Faded entries are not drawn in the current view. Click one to go to the other element.
- **Used in views**: the views that show the element. Click one to open that view with the element selected.
- **Buttons**:
  - **Show in model tree**.
  - **Delete from model**.
  - **+ Add to this view**: shown when the element isn't in the current view.

**Changing the type** (Type dropdown) keeps the name, documentation and relationships. In every view, boxes that still have the old type's default color and shape get the new type's look.
Some of the element's relationships may no longer be valid for the new type. They are kept, and a warning appears when you select one of them.

### Style

Under the element's model fields come view-level styles: fill, shape, border, corner radius, text color, size, alignment, badge and highlight ring.
These only change how **this box in this view** looks; the element itself is not affected. **Reset type style** goes back to the type's default colors and shape.

### Notes

Pick **Note** in the palette (last button of the "Other" group). Double-click a note to edit its text with formatting: bold, italic, underline, strike, size, color and alignment.
In the editor, Enter starts a new line; Esc or Ctrl/⌘ + Enter finishes. Notes can also have an icon from a built-in set, or any emoji.

---

## 5. Relationships

### Creating a relationship

1. Hold **Shift** and drag from one element (the **source**) to another (the **target**).
2. Release on the target. A small menu lists the relationship types that are **valid** between these two element types. The suggested type is highlighted.
3. Click a type, or press **Enter** to take the suggested one. **Esc** cancels.

The direction matters: drag from the element that serves, realizes, is assigned, accesses, triggers… to the one it acts on.

Shift + drag from an element onto **empty canvas** makes a plain line with a free end. Shift + drag to or from a **note** makes a plain connection. Neither is part of the model.

### Relationship types and notation

| Type | Line | Typical use |
|---|---|---|
| Composition | solid, filled diamond at the source | a whole made of parts that do not exist alone |
| Aggregation | solid, hollow diamond at the source | a whole that groups parts |
| Assignment | solid, dot at the source, arrow at the target | who or what performs a behavior (actor → role, role → process, node → artifact) |
| Realization | dotted, hollow triangle at the target | a process realizes a service; a component realizes a requirement |
| Serving | solid, open arrow at the target | a service or component serves its users |
| Access | dotted, small arrow(s) | a behavior reads or writes a passive object |
| Influence | dashed, open arrow | motivation elements influence each other |
| Triggering | solid, filled arrow | one behavior or event starts the next |
| Flow | dashed, filled arrow | something passes from one behavior to another |
| Specialization | solid, hollow triangle | an element is a kind of another (same type) |
| Association | solid line, no arrow (optional half arrow) | any other link |

### Relationship properties (right panel)

Select a relationship line to see:
- its **source** and **target** (click either to go to it);
- **Name**: an optional label shown on the line;
- **Type**: types that are not valid for these two elements are marked "(not valid)";
- **Access**: read, write, read/write or unspecified. This only appears for access relationships and sets the arrows: *read* points from the object to the behavior, *write* from the behavior to the object;
- **Directed**: only for associations; adds a half arrow at the target;
- **Documentation**, **Properties**, **Used in views**, **Delete from model**.

The line style and arrowheads follow from the type and cannot be changed by hand. You can still change the line color, width, routing and connectors.

### Valid relationships

The menu only offers relationships that ArchiMate allows between the two types. Arch TOGAF uses a **simplified** version of the ArchiMate rules that covers the usual cases. For example:
- an active structure element is assigned to behavior;
- behavior realizes services;
- services serve behavior and active structure in the same or a higher layer;
- behavior accesses passive objects;
- core elements realize requirements, goals and capabilities;
- motivation elements influence each other.

If you need a relationship the rules do not offer, turn off **Only allow valid ArchiMate relationships** in Settings. The menu then also lists the other types, under "Not valid in ArchiMate".

### Reconnecting

Select a relationship line and drag one of its end handles onto another element. This changes the relationship's source or target **in the model**:
- Other views that showed the old relationship no longer show it there, because their boxes no longer match.
- If the new pair of elements does not allow this type, or you drop the end on empty canvas, the change is refused and the line goes back.

### Automatic relationships

When you add an element that is already in the model to a view, its existing relationships with the elements already in the view are drawn automatically. This happens whether you drag it from the model browser, use "Add to this view", or paste it. Turn this off in Settings with "Draw existing relationships when adding an element to a view".

---

## 6. Views and viewpoints

### Managing views

- **New view**: the **+** at the end of the view tabs, or **+ New view** in the Properties panel when nothing is selected.
- **Rename**: double-click the tab, or edit the name in the Properties panel.
- **Duplicate**: copies the view (it shows the same model elements; nothing is copied in the model).
- **Delete view**: removes the view only. The model keeps all its elements.

With nothing selected, the Properties panel shows the current view:
- **Name** and **Description** (purpose, stakeholders, concerns);
- **Viewpoint**;
- **ADM phase**: the phase the view belongs to. It sets the badge on the tab and lists the view in the ADM panel.

### Viewpoints

A viewpoint limits a view to what matters for some stakeholders and concerns. In Arch TOGAF, it decides which element types the **palette** offers.
Elements already in a view stay when you change its viewpoint. If some are outside the new viewpoint, a warning shows how many.

| Viewpoint | Offers | Typical ADM phase |
|---|---|---|
| None (all elements) | everything | H, or anything |
| Motivation | all motivation elements | Preliminary, A |
| Stakeholder | stakeholder, driver, assessment, goal, outcome | A |
| Goal realization | goal, outcome, principle, requirement, constraint | A, RM |
| Requirements realization | requirements and goals + core layers + strategy | Requirements Management |
| Strategy | resource, capability, value stream, course of action, outcome, goal, driver | A |
| Capability map | capability, resource, outcome, goal | A, B |
| Value stream | value stream, capability, stakeholder, actor, role, outcome, value | A, B |
| Organization | business actor, role, collaboration, interface | B |
| Business process cooperation | business layer + application service and component | B |
| Product | product, services, contract, value, actor, role… | B |
| Information structure | business object, contract, representation, data object, artifact | C (data) |
| Application cooperation | application layer | C |
| Application usage | business + application layers | C |
| Technology | technology + physical layers | D |
| Technology usage | application + technology layers | D |
| Physical | physical layer + node, device, path, network | D |
| Layered | business, application, technology, physical | B–D overview |
| Implementation and migration | implementation & migration + some core and motivation elements | E |
| Migration | plateau, gap | E, F |
| Project | work package, deliverable, implementation event, actor, role, goal, outcome | F, G |

---

## 7. The model browser

Open the **Model** tab in the left panel.

- **Search** filters by name, type and documentation.
- Elements are listed by **layer** (click a layer header to fold it), then the **relationships**, then the **views**.
- The number on the right of an element is how many views show it. Elements in no view are in grey italics; consider deleting them, or adding them to a view.
- **Click** an element: it is selected. If the current view shows it, its box is selected and outlined in orange; otherwise the Properties panel shows the element.
- **Double-click** an element that is not in the current view: opens the first view that shows it. If no view shows it, it is added to the current view.
- **Drag** an element onto the canvas: it is added to the view, with its relationships to the elements already there.
- **Click a view** in the list to open it.

---

## 8. Layout: moving, nesting, routing, styling

### Selecting and moving

- **Click** selects; **Ctrl/⌘ + click** adds to or removes from the selection.
- **Shift (or Ctrl/⌘) + drag on empty canvas** selects everything inside a box. **Ctrl/⌘ + A** selects all.
- **Drag** to move; use the 8 handles to resize. Positions and sizes snap to the grid; hold **Alt** to place freely.
- **Arrow keys** nudge by 1 px; Shift + arrow nudges by one grid step.
- **Bring to front / Send to back** change the stacking order.

### Nesting

Put boxes **inside** a larger box (a Grouping, a Node, a Location, a Capability…): when you move the outer box, everything inside it moves too.
A box counts as nested when it lies completely inside the outer one and is drawn above it. If a container hides the boxes you put in it, use **Send to back** on the container.

Nesting already shows composition, aggregation, assignment, realization and specialization relationships. So these are not drawn as lines between a container and the boxes inside it.

### Link routing

Choose a link's **Routing** in its Properties: orthogonal **polyline** (default), **curve** or **straight line**.

Polylines:
- avoid boxes, keeping a set distance;
- spread overlapping parallel segments apart;
- round their corners.

On top of that, two features make links simpler. Both are on by default, and both only apply when no box is in the way and no new crossings with other links are added.

- **Straight when possible**: when two boxes face each other, the link attaches straight across, with no bends. Several links between the same two sides run straight side by side.
  It also handles a polyline that arrives at a box with a small step at the end: the connector moves onto the line instead, so the link enters straight.
- **Minimize bends**: a polyline with two or more bends becomes a single L-shaped bend when other sides or connector spots allow it. Sides you set by hand are kept.

You can switch both features per link in the link's Properties, set their default for new links, or turn them off for all links in Settings → Link routing.

**Shaping a route by hand.** Drag any segment of a polyline to move it. Near the line of its neighbors it snaps into line with them, which removes a step. A route shaped by hand keeps its bends when boxes move.
To go back to automatic routing, double-click a segment or use **Reset route**.

### Connectors

A link end attaches to a side of a box automatically. When several ends share a side, they are spread evenly.

- To move an end to another side or another box, select the link and drag its end handle. Dropping near the center of a box makes the side automatic again.
- You can also set each end's side in the link's Properties.
- An end can be drawn as a simple end, a circle or a square, in any color and size.
- With a single box selected, its Properties list all its connectors: the box at the other end, the side, and an optional **name** with a **show** toggle. A name such as "REST /orders" shows the port or protocol.

### Plain connections

Lines that are not relationships (between notes, or with a free end) can have:
- any line style: solid, dashed or dotted;
- any ends: arrows, triangles, circles, squares, diamonds;
- a label.

---

## 9. Flows

A flow is a named sequence of **numbered steps** over the boxes and lines of a view, such as a scenario, a request path or a process walk-through. Flows belong to their view. Open the **Flows** tab in the right panel.

- **+ Empty flow**, **+ Record a sequence** (click elements on the canvas in order; Enter or Esc stops), or **+ From selection** (Ctrl/⌘-click the elements in order first).
- Each step can have a description. Drag the ⋮⋮ grip to reorder steps; ✕ removes a step. The same element can appear in several steps.
- Hover a flow in the list to preview its numbers on the canvas. While a flow is open, its numbers stay visible; click a number to jump to its step.
- The example's "Order handling" view has a flow called "Order to delivery".

---

## 10. The ADM panel

Open the **ADM** tab in the left panel.

### The wheel

It shows Preliminary (**P**), phases **A** to **H** around the circle, and Requirements Management (**Req.**) in the center. The color of each phase is its status:

| Status | Color |
|---|---|
| Not started | light grey |
| In progress | orange |
| Completed | green |
| Not applicable | slate grey |

Click a phase to see its details below the wheel.

### Phase details

- **Objectives**: what the phase is for, in one or two sentences.
- **Status** and **Notes**: decisions, open points, dates…
- **Views**: the views assigned to this phase; click one to open it.
  - **+ New view for this phase** creates a view with the phase set and the usual viewpoint for the phase (for example Phase B gives "Business process cooperation").
  - **Assign current view** sets the phase of the view you are on.
- **Artifacts & deliverables**: the typical TOGAF catalogs, matrices, diagrams and deliverables of the phase, as a checklist (for example Phase C lists the Application Portfolio catalog, the Application/Function matrix and the Application Communication diagram). Tick items as you produce them; the counter shows progress.

Everything in the ADM panel is saved in the workspace and can be undone.

---

## 11. Catalogs and matrices

Click **Catalogs** in the toolbar. The dialog has three tabs.

**Elements.** A table of model elements with these columns:
- name, type, layer;
- documentation and properties;
- number of relationships, and the views that show the element.

Filter it by layer and type, by free text, or with a **TOGAF catalog preset**:
- Application Portfolio, Interface, Organization/Actor, Role, Stakeholder;
- Business Service/Function, Process/Event/Control/Product, Driver/Goal/Objective;
- Principles, Requirements, Capability, Data Entity/Data Component, Technology Portfolio, Location and Work Package.

**Relationships.** A table of all relationships with these columns:
- source and its type, relationship type (with the access mode), target and its type;
- name, documentation, and the views that show it.

**Matrix.** Choose a **row type** and a **column type**, or a **TOGAF matrix preset**:
- Actor/Role, Application/Function, Application/Organization, Role/Application;
- Application/Data, Data Entity/Business Function, Application Interaction, Application/Technology;
- Business Interaction, Process/Application, Stakeholder/Goal, Capability/Application.

Each cell lists the relationships between the row element and the column element. **←** means the column element is the source.

In every tab:
- **Export CSV** saves the current table, which opens in Excel, Numbers or Google Sheets;
- **clicking a row** selects that element in the model.

Matrices only count **direct** relationships. If a component is linked to a function through a service, the cell stays empty.

---

## 12. A TOGAF walkthrough

A suggested way to use the tool through one ADM cycle. Adapt it to your scale; you don't need every view or artifact.

1. **Preliminary.** Create a view with the *Motivation* viewpoint. Add **Principles** and document their rationale and implications in each principle's Documentation. Set the phase status and tick "Architecture Principles".
2. **Phase A – Architecture Vision.** Create a *Stakeholder* view: stakeholders, drivers, assessments, goals and outcomes, linked with associations, influences and realizations.
   Add the main **Requirements** that realize the outcomes. Optionally add a *Strategy* or *Capability map* view.
   Use the Stakeholder catalog and the Driver/Goal/Objective catalog as your stakeholder map and goal list.
3. **Phase B – Business.** Create *Organization* and *Business process cooperation* views: actors, roles, processes, services, events, business objects.
   The Actor/Role matrix and the Business Service/Function catalog come from the model.
4. **Phase C – Information Systems.** In *Application cooperation* or *Application usage* views, show the application components, interfaces and services, and which business processes they serve.
   In an *Information structure* view, show how data objects realize business objects.
   Reuse the Phase B processes by dragging them from the Model tab: their relationships come with them.
   Check the Application Portfolio catalog, the Interface catalog and the Application/Function matrix.
5. **Phase D – Technology.** In *Technology* or *Technology usage* views, nest system software and artifacts inside nodes, and show which technology services serve which applications.
6. **Phases E and F.** Use *Implementation and migration* and *Migration* views: plateaus (baseline, transitions, target), gaps, work packages and deliverables.
   You can mark baseline and target with element properties such as `Lifecycle = Baseline / Target`. Dedicated gap analysis is planned (see ROADMAP.md).
7. **Phases G and H.** Track contracts and compliance with the checklist and notes. Use *Project* views for work packages and the people assigned to them.
8. **Requirements Management.** Keep a *Requirements realization* view that shows which elements realize which requirements. The Requirements catalog lists them all.

Throughout the cycle:
- keep the phase **status** up to date in the ADM panel;
- **save** often;
- export **SVG** images of views and **CSV** catalogs for your documents.

---

## 13. Files, saving and export

| Command | What it does |
|---|---|
| **New** | Starts an empty workspace with one view. Undo brings the previous one back. |
| **Open** (Ctrl/⌘ + O) | Opens a workspace `.json`. You can also drop a `.json` file onto the window. |
| **Save** (Ctrl/⌘ + S) | Chrome / Edge: writes to the open file in place, after asking where the first time. Other browsers: downloads the file. |
| **Save as…** (Ctrl/⌘ + Shift + S) | Saves to a new file. |
| **Export SVG** | Saves the **current view** as an SVG image, without selection marks. It opens in browsers, Inkscape and Illustrator, and can be inserted in Word, PowerPoint and Confluence. |
| **Catalogs → Export CSV** | Saves the current catalog or matrix as CSV. |

- **Auto-save**: the workspace is also kept in the browser's storage, in case the tab closes. It is per browser and per computer, so save to a file to keep or share your work.
- **arch-diagram files** can be opened. Their boxes and lines become notes and plain connections in a single view, and the result is saved under a new name ending in `-togaf.json`.
- **File format**: plain, readable JSON, which works well with Git. The format is described in README.md.

---

## 14. Settings

Open **Settings** in the toolbar. Changes apply to the current workspace and are saved with it.
**Save as my defaults** makes them the starting settings of new workspaces in this browser. **Reset to factory** restores the original values.

- **Canvas**: background, grid color and size, show grid, snap to grid.
- **Link routing**:
  - distance from boxes, spacing between links, corner radius;
  - bend penalty (higher means fewer bends but longer routes);
  - curve tension;
  - **Straight links when possible** and **Minimize bends**, for all links.
- **Modeling**:
  - **Show type icon on elements**;
  - **Show type name on elements**: adds the type name in small italics under the element name;
  - **Draw existing relationships when adding an element to a view**;
  - **Only allow valid ArchiMate relationships**.
- **New notes**: default size, colors, border, font and icon for new notes. Element boxes take their colors from their type instead.
- **New links**: default routing, color, width, line style, ends, connectors and the straight / minimize-bends defaults.

---

## 15. Keyboard and mouse reference

| Action | How |
|---|---|
| Add element of the last used type | double-click empty canvas |
| Add element of a given type | click or drag it from the Palette |
| Rename element / edit note | double-click it, or select it and press Enter |
| Finish renaming | Enter / Esc |
| Create relationship | Shift + drag from an element to another, then choose the type (Enter = suggested, Esc = cancel) |
| Edit a relationship name | double-click the line |
| Remove from view | Del / Backspace |
| Delete from model | Ctrl/⌘ + Del |
| Undo / redo | Ctrl/⌘ + Z / Ctrl/⌘ + Shift + Z (or Ctrl + Y) |
| Copy / cut / paste / duplicate | Ctrl/⌘ + C / X / V / D |
| Select all | Ctrl/⌘ + A |
| Add to / remove from selection | Ctrl/⌘ + click |
| Box select | Shift or Ctrl/⌘ + drag on empty canvas |
| Move / nudge | drag / arrow keys (Shift = grid step) |
| Ignore the grid while dragging | hold Alt |
| Move a polyline segment | drag it |
| Reset a hand-shaped route | double-click one of its segments |
| Pan | drag empty canvas, or Space + drag, or middle mouse button |
| Zoom | mouse wheel or pinch; + / − keys |
| Fit / 100 % | F / Ctrl/⌘ + 0 (or click the zoom percentage) |
| Save / save as / open | Ctrl/⌘ + S / Ctrl/⌘ + Shift + S / Ctrl/⌘ + O |
| Clear selection | Esc |

**Copy and paste with elements.** When you paste into a view that does **not** show an element yet, the pasted box refers to the **same** model element. When the view already shows it (for example Ctrl/⌘ + D in the same view), a **copy** of the element is made, named "… (copy)", and the relationships between copied elements are copied too.
To show an existing element in another view, either copy and paste it there, or drag it from the Model tab.

---

## 16. Tips and limitations

- **Name things once and reuse them.** Drag existing elements from the Model tab instead of creating new ones with the same name. Duplicates make catalogs and matrices wrong.
- **Look for unused elements.** Grey italic entries in the Model tab are in no view. Delete them or put them in a view.
- **Use Documentation and Properties.** They show up in the catalogs and in the CSV exports, which is how you build tables for the architecture documents.
- **One view, one question.** Small views with a clear viewpoint and description are easier to read than one large diagram.
- **Relationship rules are simplified.** The valid-relationship check covers the usual ArchiMate cases, not the full specification table. Derived relationships are not computed yet, which is also why matrices only show direct relationships.
- **No import or export to Archi yet.** The ArchiMate exchange format is planned. See ROADMAP.md for this and the other planned features: gap analysis, roadmaps, document generation.
- **Single user.** The workspace is a file. To work as a team, keep it in a shared folder or in Git and avoid editing the same file at the same time.
