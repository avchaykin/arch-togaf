#!/usr/bin/env node
/* Arch TOGAF command-line tool: read, analyse and change workspace files.

   Meant for agents and scripts. It works on the raw JSON and leaves everything it
   does not touch as it is (settings, view positions, styles, flows, routes).
   Element types, relationship rules and viewpoints are not copied here: they are
   read from the app's own metamodel region in ../index.html.

   node tools/togaf.mjs help */
import { readFileSync, writeFileSync, renameSync, statSync, existsSync, copyFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, basename, join } from 'node:path';
import vm from 'node:vm';

const APP_HTML = fileURLToPath(new URL('../index.html', import.meta.url));

/* ---------- metamodel, shared with the app ---------- */
export function loadMetamodel(html = readFileSync(APP_HTML, 'utf8')) {
  const m = html.match(/\/\* @metamodel-begin \*\/([\s\S]*?)\/\* @metamodel-end \*\//);
  if (!m) throw new Error('metamodel region not found in index.html');
  const mm = vm.runInNewContext(m[1] + `
;({ LAYERS, ELEMENT_TYPES, typeColor, typeName, typeShape, REL_TYPES, REL_ORDER, ACCESS_TYPES,
   relNotation, validRelations, suggestRelation, VIEWPOINTS, viewpointAllows, ADM_STATUS, ADM_PHASES, admPhase })`, {});
  const a = html.match(/const APP_INFO = \{\s*name: '([^']*)',\s*version: '([^']*)',\s*github: '([^']*)'/);
  mm.APP_INFO = a ? { name: a[1], version: a[2], github: a[3] } : { name: 'arch-togaf', version: '0', github: '' };
  return mm;
}
const MM = loadMetamodel();
const { ELEMENT_TYPES, REL_TYPES, LAYERS, VIEWPOINTS, ADM_PHASES, ADM_STATUS } = MM;

/* ---------- small helpers ---------- */
class UserError extends Error {}
const fail = msg => { throw new UserError(msg); };
const norm = s => String(s ?? '').trim().toLowerCase();
const snap10 = v => Math.round(v / 10) * 10;
const typeName = t => MM.typeName(t);
const relName = t => REL_TYPES[t]?.name || t;
const layerOf = t => ELEMENT_TYPES[t]?.layer || 'other';
const asList = v => (v == null ? [] : Array.isArray(v) ? v : String(v).split(',').map(s => s.trim()).filter(Boolean));

/* ---------- workspace ---------- */
export class Workspace {
  constructor(data, file) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.views)) fail(`${file || 'input'} is not an Arch TOGAF workspace (no "views" array)`);
    data.model = data.model && typeof data.model === 'object' ? data.model : {};
    data.model.elements = Array.isArray(data.model.elements) ? data.model.elements : [];
    data.model.relationships = Array.isArray(data.model.relationships) ? data.model.relationships : [];
    for (const v of data.views) { v.blocks = Array.isArray(v.blocks) ? v.blocks : []; v.links = Array.isArray(v.links) ? v.links : []; }
    this.d = data; this.file = file; this.changes = [];
  }
  static read(file) {
    if (!existsSync(file)) fail(`no such file: ${file}`);
    let data;
    try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`${file}: invalid JSON (${e.message})`); }
    const ws = new Workspace(data, file);
    ws.mtime = statSync(file).mtimeMs;
    return ws;
  }
  static empty(name) {
    return new Workspace({
      app: { ...MM.APP_INFO }, format: 1, savedAt: new Date().toISOString(),
      model: { name: name || 'Enterprise architecture', description: '', elements: [], relationships: [] },
      views: [{ id: 'v-main', name: 'Main view', viewpoint: 'none', phase: '', description: '', blocks: [], links: [], flows: [] }],
      activeView: 'v-main', adm: { phases: {} }
    });
  }
  /* write in place: atomic rename, a hidden backup of the previous version, and no
     silent overwrite when the file changed since it was read (the app may have saved) */
  write({ backup = true } = {}) {
    const file = this.file;
    if (existsSync(file) && this.mtime != null && statSync(file).mtimeMs !== this.mtime) fail(`${file} changed on disk while this command ran; nothing written. Run it again.`);
    if (!this.d.app) this.d.app = { ...MM.APP_INFO };
    this.d.savedAt = new Date().toISOString();
    const tmp = join(dirname(file), `.${basename(file)}.tmp-${process.pid}`);
    writeFileSync(tmp, JSON.stringify(this.d, null, 2) + '\n');
    if (backup && existsSync(file)) copyFileSync(file, join(dirname(file), `.${basename(file)}.bak`));
    renameSync(tmp, file);
    this.mtime = statSync(file).mtimeMs;
  }

  get model() { return this.d.model; }
  get elements() { return this.d.model.elements; }
  get relationships() { return this.d.model.relationships; }
  get views() { return this.d.views; }
  el(id) { return this.elements.find(e => e.id === id); }
  rel(id) { return this.relationships.find(r => r.id === id); }
  newId(prefix) {
    const used = this.allIds();
    let id;
    do id = prefix + Math.random().toString(36).slice(2, 10); while (used.has(id));
    return id;
  }
  allIds() {
    const s = new Set();
    for (const e of this.elements) s.add(e.id);
    for (const r of this.relationships) s.add(r.id);
    for (const v of this.views) { s.add(v.id); for (const b of v.blocks) s.add(b.id); for (const l of v.links) s.add(l.id); for (const f of v.flows || []) s.add(f.id); }
    return s;
  }
  takeId(id, prefix) {
    if (id == null || id === '') return this.newId(prefix);
    id = String(id);
    if (this.allIds().has(id)) fail(`id "${id}" is already used`);
    return id;
  }

  /* ---------- references: an id, or a unique name ---------- */
  findElement(ref) {
    if (ref && typeof ref === 'object') ref = ref.id ?? ref.name;
    const s = String(ref ?? '');
    const byId = this.el(s);
    if (byId) return byId;
    let m = this.elements.filter(e => norm(e.name) === norm(s));
    // "Type: Name" narrows a name shared by several types
    const tm = s.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
    if (!m.length && tm && ELEMENT_TYPES[tm[1]]) m = this.elements.filter(e => e.type === tm[1] && norm(e.name) === norm(tm[2]));
    if (m.length === 1) return m[0];
    if (!m.length) fail(`no element "${s}"`);
    fail(`"${s}" is ambiguous: ${m.map(e => `${e.id} (${typeName(e.type)})`).join(', ')}. Use the id.`);
  }
  findRelationship(ref) {
    if (ref && typeof ref === 'object') {
      const S = this.findElement(ref.source), T = this.findElement(ref.target);
      const m = this.relationships.filter(r => r.source === S.id && r.target === T.id && (!ref.type || r.type === ref.type));
      if (m.length === 1) return m[0];
      if (!m.length) fail(`no ${ref.type ? relName(ref.type) + ' ' : ''}relationship from "${S.name}" to "${T.name}"`);
      fail(`several relationships from "${S.name}" to "${T.name}": ${m.map(r => `${r.id} (${relName(r.type)})`).join(', ')}`);
    }
    const r = this.rel(String(ref ?? ''));
    if (!r) fail(`no relationship "${ref}"`);
    return r;
  }
  findView(ref) {
    const s = String(ref ?? '');
    const v = this.views.find(x => x.id === s) || this.views.filter(x => norm(x.name) === norm(s))[0];
    if (!v) fail(`no view "${s}". Views: ${this.views.map(x => `"${x.name}"`).join(', ')}`);
    const same = this.views.filter(x => norm(x.name) === norm(s));
    if (!this.views.find(x => x.id === s) && same.length > 1) fail(`several views named "${s}": ${same.map(x => x.id).join(', ')}`);
    return v;
  }

  /* ---------- derived facts ---------- */
  viewsShowing(elId) { return this.views.filter(v => v.blocks.some(b => b.element === elId)); }
  relsOf(elId) { return this.relationships.filter(r => r.source === elId || r.target === elId); }
  strict() { return this.d.settings?.model?.strictRelations !== false; }
  isValid(type, S, T) { return MM.validRelations(S.type, T.type).has(type); }
  elLabel(e) { return e ? `${e.name || '(unnamed)'} [${typeName(e.type)}]` : '(missing)'; }
  relLabel(r) { return `${this.el(r.source)?.name ?? '?'} —${relName(r.type)}${r.type === 'access' ? ' (' + (r.accessType || 'write') + ')' : ''}→ ${this.el(r.target)?.name ?? '?'}`; }

  /* ---------- changes ---------- */
  addElement(o) {
    if (!ELEMENT_TYPES[o.type]) fail(`unknown element type "${o.type}". See: togaf types`);
    const e = { id: this.takeId(o.id, 'e'), type: o.type, name: String(o.name ?? typeName(o.type)), documentation: String(o.documentation ?? ''), properties: propList(o.properties) };
    this.elements.push(e);
    this.log(`added element ${this.elLabel(e)} ${e.id}`);
    return e;
  }
  updateElement(o) {
    const e = this.findElement(o.ref ?? o.id);
    if (o.type != null && o.type !== e.type) {
      if (!ELEMENT_TYPES[o.type]) fail(`unknown element type "${o.type}"`);
      e.type = o.type;
      // blocks keep their manual styles, but the type colour and shape follow the new type
      for (const v of this.views) for (const b of v.blocks) if (b.element === e.id) Object.assign(b, elementStyle(e.type));
      const bad = this.relsOf(e.id).filter(r => !this.isValid(r.type, this.el(r.source), this.el(r.target)));
      if (bad.length) this.log(`warning: now invalid for the new type: ${bad.map(r => this.relLabel(r)).join('; ')}`);
    }
    if (o.name != null) e.name = String(o.name);
    if (o.documentation != null) e.documentation = String(o.documentation);
    if (o.properties != null) e.properties = mergeProps(e.properties, o.properties);
    this.log(`updated element ${this.elLabel(e)}`);
    return e;
  }
  removeElement(o) {
    const e = this.findElement(o.ref ?? o.id);
    const rels = new Set(this.relsOf(e.id).map(r => r.id));
    this.d.model.elements = this.elements.filter(x => x !== e);
    this.d.model.relationships = this.relationships.filter(r => !rels.has(r.id));
    for (const v of this.views) {
      const gone = new Set(v.blocks.filter(b => b.element === e.id).map(b => b.id));
      dropFromView(v, gone, rels);
    }
    this.log(`removed element ${this.elLabel(e)} and ${rels.size} relationship(s)`);
  }
  addRelationship(o) {
    if (!REL_TYPES[o.type]) fail(`unknown relationship type "${o.type}". Types: ${MM.REL_ORDER.join(', ')}`);
    const S = this.findElement(o.source), T = this.findElement(o.target);
    if (!this.isValid(o.type, S, T)) {
      const ok = [...MM.validRelations(S.type, T.type)].map(relName).join(', ');
      if (this.strict() && !o.force) fail(`${relName(o.type)} is not valid from ${typeName(S.type)} to ${typeName(T.type)} (valid: ${ok}). Pass "force": true to add it anyway.`);
      this.log(`warning: ${relName(o.type)} is not valid from ${typeName(S.type)} to ${typeName(T.type)} (valid: ${ok})`);
    }
    const r = { id: this.takeId(o.id, 'r'), type: o.type, source: S.id, target: T.id, name: String(o.name ?? ''), documentation: String(o.documentation ?? ''), properties: propList(o.properties) };
    if (r.type === 'access') r.accessType = ['write', 'read', 'readwrite', 'access'].includes(o.accessType) ? o.accessType : 'write';
    if (r.type === 'association') r.directed = !!o.directed;
    this.relationships.push(r);
    let drawn = 0;
    if (o.draw !== false) for (const v of this.views) drawn += this.drawRelationship(v, r) ? 1 : 0;
    this.log(`added relationship ${this.relLabel(r)} ${r.id}${drawn ? `, drawn in ${drawn} view(s)` : ''}`);
    return r;
  }
  updateRelationship(o) {
    const r = this.findRelationship(o.ref ?? o.id);
    if (o.type != null && o.type !== r.type) {
      if (!REL_TYPES[o.type]) fail(`unknown relationship type "${o.type}"`);
      const S = this.el(r.source), T = this.el(r.target);
      if (!this.isValid(o.type, S, T) && this.strict() && !o.force) fail(`${relName(o.type)} is not valid from ${typeName(S.type)} to ${typeName(T.type)}`);
      r.type = o.type;
      if (r.type === 'access' && !r.accessType) r.accessType = 'write';
    }
    for (const k of ['name', 'documentation']) if (o[k] != null) r[k] = String(o[k]);
    if (o.accessType != null) r.accessType = o.accessType;
    if (o.directed != null) r.directed = !!o.directed;
    if (o.properties != null) r.properties = mergeProps(r.properties, o.properties);
    this.log(`updated relationship ${this.relLabel(r)}`);
    return r;
  }
  removeRelationship(o) {
    const r = this.findRelationship(o.ref ?? o.id);
    this.d.model.relationships = this.relationships.filter(x => x !== r);
    for (const v of this.views) dropFromView(v, new Set(), new Set([r.id]));
    this.log(`removed relationship ${this.relLabel(r)}`);
  }
  addView(o) {
    if (o.viewpoint && !VIEWPOINTS[o.viewpoint]) fail(`unknown viewpoint "${o.viewpoint}". See: togaf viewpoints`);
    if (o.phase && !MM.admPhase(o.phase)) fail(`unknown ADM phase "${o.phase}" (prelim, A…H, RM)`);
    const ph = o.phase && MM.admPhase(o.phase);
    const v = { id: this.takeId(o.id, 'v'), name: String(o.name ?? 'View ' + (this.views.length + 1)), viewpoint: o.viewpoint || (ph && ph.vp) || 'none', phase: o.phase || '', description: String(o.description ?? ''), blocks: [], links: [], flows: [] };
    this.views.push(v);
    this.log(`added view "${v.name}" ${v.id}`);
    if (o.elements) { this.show({ view: v.id, elements: o.elements, quiet: true }); this.layout({ view: v.id, quiet: true }); }
    return v;
  }
  updateView(o) {
    const v = this.findView(o.view ?? o.ref ?? o.id);
    if (o.viewpoint != null) { if (!VIEWPOINTS[o.viewpoint]) fail(`unknown viewpoint "${o.viewpoint}"`); v.viewpoint = o.viewpoint; }
    if (o.phase != null) { if (o.phase && !MM.admPhase(o.phase)) fail(`unknown ADM phase "${o.phase}"`); v.phase = o.phase; }
    for (const k of ['name', 'description']) if (o[k] != null) v[k] = String(o[k]);
    this.log(`updated view "${v.name}"`);
    return v;
  }
  removeView(o) {
    const v = this.findView(o.view ?? o.ref ?? o.id);
    if (this.views.length === 1) fail('a workspace keeps at least one view');
    this.d.views = this.views.filter(x => x !== v);
    if (this.d.activeView === v.id) this.d.activeView = this.views[0].id;
    this.log(`removed view "${v.name}" (the model keeps its elements)`);
  }
  /* put elements in a view; their relationships with elements already there are drawn */
  show(o) {
    const v = this.findView(o.view);
    const els = asList(o.elements).map(r => this.findElement(r));
    const added = [];
    for (const e of els) {
      if (v.blocks.some(b => b.element === e.id)) continue;
      const b = { id: this.newId('b'), element: e.id, title: '', ...this.size(e.type), ...elementStyle(e.type) };
      placeInView(v, b, e.type, this);
      v.blocks.push(b);
      added.push(e);
    }
    let links = 0;
    if (o.relationships !== false) for (const r of this.relationships) links += this.drawRelationship(v, r) ? 1 : 0;
    if (v.viewpoint && v.viewpoint !== 'none') {
      const off = added.filter(e => !MM.viewpointAllows(v.viewpoint, e.type));
      if (off.length) this.log(`warning: outside the ${VIEWPOINTS[v.viewpoint].name} viewpoint of "${v.name}": ${off.map(e => this.elLabel(e)).join(', ')}`);
    }
    if (!o.quiet || added.length) this.log(`view "${v.name}": showed ${added.length} element(s)${links ? `, drew ${links} relationship(s)` : ''}`);
    return added;
  }
  hide(o) {
    const v = this.findView(o.view);
    const ids = new Set(asList(o.elements).map(r => this.findElement(r).id));
    const gone = new Set(v.blocks.filter(b => ids.has(b.element)).map(b => b.id));
    dropFromView(v, gone, new Set());
    this.log(`view "${v.name}": removed ${gone.size} element(s) from the view (the model keeps them)`);
  }
  /* draw relationship r in view v when both ends are shown, like the app does */
  drawRelationship(v, r) {
    if (v.links.some(l => l.rel === r.id)) return false;
    const fb = v.blocks.find(b => b.element === r.source), tb = v.blocks.find(b => b.element === r.target && b !== fb);
    if (!fb || !tb) return false;
    if (NESTABLE.has(r.type) && (inside(fb, tb) || inside(tb, fb))) return false; // shown by nesting
    v.links.push({ id: this.newId('l'), rel: r.id, from: { block: fb.id, side: 'auto' }, to: { block: tb.id, side: 'auto' }, route: 'poly' });
    return true;
  }
  layout(o) {
    const v = this.findView(o.view);
    layoutView(v, this);
    if (!o.quiet) this.log(`view "${v.name}": laid out ${v.blocks.length} block(s) again`);
  }
  setPhase(o) {
    const p = MM.admPhase(o.phase);
    if (!p) fail(`unknown ADM phase "${o.phase}" (prelim, A…H, RM)`);
    this.d.adm = this.d.adm && typeof this.d.adm === 'object' ? this.d.adm : { phases: {} };
    this.d.adm.phases = this.d.adm.phases || {};
    const s = this.d.adm.phases[p.id] = this.d.adm.phases[p.id] || { status: 'none', notes: '', checked: {} };
    s.checked = s.checked || {};
    if (o.status != null) { if (!ADM_STATUS[o.status]) fail(`unknown status "${o.status}" (${Object.keys(ADM_STATUS).join(', ')})`); s.status = o.status; }
    if (o.notes != null) s.notes = String(o.notes);
    const items = Object.values(p.items).flat();
    for (const [k, on] of [['check', true], ['uncheck', false]]) for (const it of asList(o[k])) {
      const name = items.find(x => norm(x) === norm(it));
      if (!name) fail(`"${it}" is not an item of phase ${p.code}. Items: ${items.join('; ')}`);
      if (on) s.checked[name] = true; else delete s.checked[name];
    }
    this.log(`phase ${p.code} ${p.name}: ${ADM_STATUS[s.status].name}`);
  }
  log(s) { this.changes.push(s); }

  size(type) {
    const D = this.d.settings?.block || {};
    const w = snap10(D.w || 160), h = snap10(D.h || 72);
    return type === 'grouping' ? { w: snap10(w * 2), h: snap10(h * 2.6) } : { w, h };
  }

  /* ---------- operations batch ---------- */
  apply(ops) {
    if (!Array.isArray(ops)) ops = ops && Array.isArray(ops.ops) ? ops.ops : [ops];
    const OPS = {
      addElement: 'addElement', updateElement: 'updateElement', removeElement: 'removeElement',
      addRelationship: 'addRelationship', updateRelationship: 'updateRelationship', removeRelationship: 'removeRelationship',
      addView: 'addView', updateView: 'updateView', removeView: 'removeView',
      show: 'show', hide: 'hide', layout: 'layout', setPhase: 'setPhase'
    };
    const results = [];
    ops.forEach((o, i) => {
      const fn = o && OPS[o.op];
      if (!fn) fail(`operation ${i + 1}: unknown op "${o && o.op}". Ops: ${Object.keys(OPS).join(', ')}`);
      try {
        const out = this[fn](o);
        results.push(out && out.id ? { op: o.op, id: out.id } : Array.isArray(out) ? { op: o.op, ids: out.map(x => x.id) } : { op: o.op });
      } catch (e) {
        if (e instanceof UserError) fail(`operation ${i + 1} (${o.op}): ${e.message}`);
        throw e;
      }
    });
    return results;
  }
}

/* ---------- view geometry ---------- */
const NESTABLE = new Set(['composition', 'aggregation', 'assignment', 'realization', 'specialization']);
const inside = (c, b) => c !== b && c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h;
const overlaps = (a, b, m = 20) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
/* rows from top to bottom: why (motivation, strategy), then the core layers, then change */
const BAND = { motivation: 0, strategy: 1, business: 2, application: 3, technology: 4, physical: 4, implementation: 5, other: 6 };
const GAP_X = 50, GAP_Y = 70, PER_ROW = 6;

/* the same type styling as the app's elementBlock() */
function elementStyle(type) {
  const s = MM.typeShape(type);
  const p = { fill: MM.typeColor(type), stroke: '#4a5568', shape: s.shape, radius: s.radius, icon: '' };
  if (type === 'grouping') Object.assign(p, { strokeStyle: 'dashed', align: 'left', valign: 'top' });
  if (type === 'location') Object.assign(p, { valign: 'top' });
  return p;
}
function bandOfBlock(b, ws) { return b.element ? BAND[layerOf(ws.el(b.element)?.type)] ?? 6 : 6; }
/* place a new block next to the blocks of its layer, or on a new row below the content */
function placeInView(v, b, type, ws) {
  const band = BAND[layerOf(type)] ?? 6;
  const same = v.blocks.filter(x => bandOfBlock(x, ws) === band && !v.blocks.some(c => c !== x && inside(x, c)));
  const all = v.blocks;
  if (!all.length) { b.x = 0; b.y = 0; return; }
  const minX = Math.min(...all.map(x => x.x)), maxBottom = Math.max(...all.map(x => x.y + x.h));
  if (same.length) { b.y = Math.min(...same.map(x => x.y)); b.x = snap10(Math.max(...same.map(x => x.x + x.w)) + GAP_X); }
  else { b.x = minX; b.y = snap10(maxBottom + GAP_Y); }
  // step right until the spot is free
  for (let i = 0; i < 200 && all.some(x => overlaps(b, x)); i++) b.x = snap10(b.x + 40);
}
/* lay a whole view out again: one row per layer band, ordered to follow the relationships */
function layoutView(v, ws) {
  const nested = new Set(v.blocks.filter(x => v.blocks.some(c => c !== x && inside(x, c))).map(x => x.id));
  const top = v.blocks.filter(b => !nested.has(b.id));
  const rows = new Map();
  for (const b of top) { const k = bandOfBlock(b, ws); if (!rows.has(k)) rows.set(k, []); rows.get(k).push(b); }
  const order = [...rows.keys()].sort((a, b) => a - b);
  // neighbours through relationships, to order each row under the row above (barycenter)
  const nb = new Map(top.map(b => [b.id, []]));
  for (const l of v.links) if (l.from?.block && l.to?.block && nb.has(l.from.block) && nb.has(l.to.block)) { nb.get(l.from.block).push(l.to.block); nb.get(l.to.block).push(l.from.block); }
  const pos = new Map();
  let y = 0, widest = 0;
  const lines = [];
  for (const k of order) {
    let row = rows.get(k);
    const bary = b => { const p = nb.get(b.id).filter(id => pos.has(id)).map(id => pos.get(id)); return p.length ? p.reduce((s, x) => s + x, 0) / p.length : Infinity; };
    row = row.map((b, i) => ({ b, k: bary(b), i })).sort((p, q) => (p.k - q.k) || (p.i - q.i)).map(p => p.b);
    for (let s = 0; s < row.length; s += PER_ROW) {
      const line = row.slice(s, s + PER_ROW);
      const h = Math.max(...line.map(b => b.h));
      let x = 0;
      for (const b of line) { pos.set(b.id, x + b.w / 2); x += b.w + GAP_X; }
      lines.push({ line, y, width: x - GAP_X });
      widest = Math.max(widest, x - GAP_X);
      y += h + GAP_Y;
    }
  }
  for (const { line, y: ly, width } of lines) {
    let x = snap10((widest - width) / 2);
    for (const b of line) {
      const dx = x - b.x, dy = ly - b.y;
      // nested blocks travel with their container
      for (const c of v.blocks) if (nested.has(c.id) && inside(c, b)) { c.x += dx; c.y += dy; }
      b.x = x; b.y = ly;
      x = snap10(x + b.w + GAP_X);
    }
  }
  for (const l of v.links) delete l.waypoints;
}
function dropFromView(v, blockIds, relIds) {
  v.blocks = v.blocks.filter(b => !blockIds.has(b.id));
  v.links = v.links.filter(l => !(l.rel && relIds.has(l.rel)) && !blockIds.has(l.from?.block) && !blockIds.has(l.to?.block));
  const ids = new Set([...v.blocks.map(b => b.id), ...v.links.map(l => l.id)]);
  for (const f of v.flows || []) f.steps = (f.steps || []).filter(s => ids.has(s.ref));
}
function propList(p) {
  if (!p) return [];
  if (Array.isArray(p)) return p.map(x => ({ key: String(x.key ?? ''), value: String(x.value ?? '') }));
  return Object.entries(p).map(([key, value]) => ({ key, value: String(value ?? '') }));
}
function mergeProps(list, p) {
  list = Array.isArray(list) ? list.map(x => ({ ...x })) : [];
  if (Array.isArray(p)) return propList(p);
  for (const [k, val] of Object.entries(p)) {
    const i = list.findIndex(x => x.key === k);
    if (val === null) { if (i >= 0) list.splice(i, 1); }
    else if (i >= 0) list[i].value = String(val);
    else list.push({ key: k, value: String(val) });
  }
  return list;
}

/* ---------- analysis ---------- */
export function check(ws) {
  const issues = [];
  const add = (level, code, msg, ref) => issues.push({ level, code, msg, ...(ref ? { ref } : {}) });
  const ids = new Map();
  for (const x of [...ws.elements, ...ws.relationships, ...ws.views]) { const n = (ids.get(x.id) || 0) + 1; ids.set(x.id, n); }
  for (const [id, n] of ids) if (n > 1) add('error', 'duplicate-id', `id "${id}" is used ${n} times (the app renames the copies on load)`, id);
  for (const e of ws.elements) if (!ELEMENT_TYPES[e.type]) add('error', 'unknown-type', `element "${e.name}" has unknown type "${e.type}" (loaded as a Grouping)`, e.id);
  for (const r of ws.relationships) {
    const S = ws.el(r.source), T = ws.el(r.target);
    if (!REL_TYPES[r.type]) add('error', 'unknown-rel-type', `relationship ${r.id} has unknown type "${r.type}"`, r.id);
    if (!S || !T) { add('error', 'dangling-relationship', `relationship ${r.id} points to a missing element (dropped on load)`, r.id); continue; }
    if (REL_TYPES[r.type] && ELEMENT_TYPES[S.type] && ELEMENT_TYPES[T.type] && !ws.isValid(r.type, S, T))
      add(ws.strict() ? 'error' : 'warning', 'invalid-relationship', `${ws.relLabel(r)}: not valid from ${typeName(S.type)} to ${typeName(T.type)}; valid: ${[...MM.validRelations(S.type, T.type)].map(relName).join(', ')}`, r.id);
  }
  const groups = new Map();
  for (const e of ws.elements) { const k = e.type + '|' + norm(e.name); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
  for (const g of groups.values()) if (g.length > 1) add('warning', 'duplicate-name', `${g.length} elements named "${g[0].name}" of type ${typeName(g[0].type)}: ${g.map(e => e.id).join(', ')}. Reuse one element instead`, g[0].id);
  for (const v of ws.views) {
    const bm = new Map(v.blocks.map(b => [b.id, b]));
    for (const b of v.blocks) if (b.element && !ws.el(b.element)) add('error', 'missing-element', `view "${v.name}": block ${b.id} shows a missing element (dropped on load)`, b.id);
    for (const l of v.links) {
      for (const w of ['from', 'to']) if (l[w]?.block && !bm.has(l[w].block)) add('error', 'dangling-link', `view "${v.name}": link ${l.id} ends on a missing block`, l.id);
      if (!l.rel) continue;
      const r = ws.rel(l.rel), fb = bm.get(l.from?.block), tb = bm.get(l.to?.block);
      if (!r) add('error', 'missing-relationship', `view "${v.name}": link ${l.id} shows a missing relationship (dropped on load)`, l.id);
      else if (!fb || !tb || fb.element !== r.source || tb.element !== r.target) add('error', 'link-mismatch', `view "${v.name}": link ${l.id} does not join the source and target of ${ws.relLabel(r)} (dropped on load)`, l.id);
    }
    if (v.viewpoint && v.viewpoint !== 'none' && VIEWPOINTS[v.viewpoint]) {
      const off = v.blocks.map(b => ws.el(b.element)).filter(e => e && !MM.viewpointAllows(v.viewpoint, e.type));
      if (off.length) add('warning', 'viewpoint', `view "${v.name}" (${VIEWPOINTS[v.viewpoint].name}) shows types outside its viewpoint: ${off.map(e => ws.elLabel(e)).join(', ')}`, v.id);
    }
    if (!v.blocks.length) add('info', 'empty-view', `view "${v.name}" is empty`, v.id);
    // relationships between shown elements that are not drawn
    const shown = new Set(v.blocks.map(b => b.element).filter(Boolean));
    const missing = ws.relationships.filter(r => shown.has(r.source) && shown.has(r.target) && !v.links.some(l => l.rel === r.id))
      .filter(r => { const fb = v.blocks.find(b => b.element === r.source), tb = v.blocks.find(b => b.element === r.target); return !(NESTABLE.has(r.type) && (inside(fb, tb) || inside(tb, fb))); });
    if (missing.length) add('info', 'undrawn', `view "${v.name}": ${missing.length} relationship(s) between its elements are not drawn: ${missing.map(r => ws.relLabel(r)).join('; ')}`, v.id);
  }
  const used = new Set(ws.views.flatMap(v => v.blocks.map(b => b.element)));
  const unused = ws.elements.filter(e => !used.has(e.id));
  if (unused.length) add('info', 'unused', `${unused.length} element(s) in no view: ${unused.map(e => ws.elLabel(e)).join(', ')}`);
  const drawn = new Set(ws.views.flatMap(v => v.links.map(l => l.rel)));
  // nesting shows a structural relationship without a line
  for (const v of ws.views) for (const r of ws.relationships) {
    if (!NESTABLE.has(r.type) || drawn.has(r.id)) continue;
    const fb = v.blocks.find(b => b.element === r.source), tb = v.blocks.find(b => b.element === r.target);
    if (fb && tb && (inside(fb, tb) || inside(tb, fb))) drawn.add(r.id);
  }
  const undrawn = ws.relationships.filter(r => !drawn.has(r.id));
  if (undrawn.length) add('info', 'rel-in-no-view', `${undrawn.length} relationship(s) in no view: ${undrawn.map(r => ws.relLabel(r)).join('; ')}`);
  const nodoc = ws.elements.filter(e => !String(e.documentation || '').trim());
  if (nodoc.length) add('info', 'no-documentation', `${nodoc.length} of ${ws.elements.length} elements have no documentation`);
  for (const p of ADM_PHASES) {
    const st = ws.d.adm?.phases?.[p.id]?.status;
    if ((st === 'progress' || st === 'done') && !ws.views.some(v => v.phase === p.id)) add('info', 'phase-without-view', `phase ${p.code} ${p.name} is ${ADM_STATUS[st].name.toLowerCase()} but has no view`);
  }
  return issues;
}
/* elements reached from `start` through relationships, breadth first */
export function impact(ws, start, { depth = 3, dir = 'both', types } = {}) {
  const want = types ? new Set(asList(types)) : null;
  const seen = new Map([[start.id, { el: start, depth: 0, via: null }]]);
  let frontier = [start.id];
  for (let d = 1; d <= depth && frontier.length; d++) {
    const next = [];
    for (const id of frontier) for (const r of ws.relsOf(id)) {
      if (want && !want.has(r.type)) continue;
      const out = r.source === id;
      if ((dir === 'out' && !out) || (dir === 'in' && out)) continue;
      const other = out ? r.target : r.source;
      if (seen.has(other) || !ws.el(other)) continue;
      seen.set(other, { el: ws.el(other), depth: d, via: { rel: r, from: id, out } });
      next.push(other);
    }
    frontier = next;
  }
  return [...seen.values()].filter(x => x.depth > 0);
}

/* ---------- command line ---------- */
const HELP = `Arch TOGAF command-line tool (app ${MM.APP_INFO.version})

Usage: node tools/togaf.mjs <command> [args] [--json]

Read
  info FILE                         model name, counts, views, ADM status
  views FILE                        views with viewpoint, phase and size
  show FILE VIEW                    elements and relationships drawn in a view
  elements FILE [--type T,..] [--layer L] [--search S] [--unused]
  element FILE REF                  one element: documentation, properties, relationships, views
  relations FILE [--type T,..] [--of REF]
  adm FILE                          ADM phases: status, checklist, views

Analyse
  check FILE                        problems the app would drop silently, invalid relationships,
                                    viewpoint violations, duplicates, unused elements (exit 1 on errors)
  impact FILE REF [--depth N] [--dir in|out|both] [--rel T,..]
                                    what depends on / is reached from an element
  catalog FILE TYPE,..              element catalog as a Markdown table (or --csv)
  matrix FILE ROWTYPES COLTYPES     relationship matrix as a Markdown table (or --csv)

Change
  apply FILE OPS.json|- [--dry-run] [--no-backup]
                                    run a batch of operations; all or nothing
  new FILE [--name NAME]            create an empty workspace
  layout FILE VIEW                  lay a view out again (rows by ArchiMate layer)

Metamodel
  types [LAYER]                     element types by layer
  rules SOURCE_TYPE TARGET_TYPE     valid relationships between two element types
  viewpoints                        viewpoints and the types they allow

REF is an element id or its exact name (case-insensitive); "Type:Name" picks one of
several elements sharing a name. VIEW is a view id or name.
Operations for apply (a JSON array):
  {"op":"addElement","type":"applicationComponent","name":"CRM","id":"e-crm","documentation":"…","properties":{"Owner":"Sales"}}
  {"op":"updateElement","ref":"CRM","name":"…","type":"…","documentation":"…","properties":{"Owner":"IT","Old":null}}
  {"op":"removeElement","ref":"CRM"}
  {"op":"addRelationship","type":"serving","source":"CRM","target":"Sales process","name":"","accessType":"read","directed":false,"draw":true,"force":false}
  {"op":"updateRelationship","ref":"r-…" | {"source":"A","target":"B","type":"serving"},"name":"…"}
  {"op":"removeRelationship","ref":…}
  {"op":"addView","name":"…","viewpoint":"applicationCooperation","phase":"C","description":"…","elements":["CRM","ERP"]}
  {"op":"updateView","view":"…","name":"…","viewpoint":"…","phase":"…","description":"…"}
  {"op":"removeView","view":"…"}
  {"op":"show","view":"…","elements":["CRM","ERP"]}     put elements in a view, draw their relationships
  {"op":"hide","view":"…","elements":["CRM"]}           remove from the view only
  {"op":"layout","view":"…"}
  {"op":"setPhase","phase":"B","status":"progress","notes":"…","check":["Business Footprint diagram"]}
New relationships are drawn in every view that shows both ends ("draw": false to skip).`;

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (['json', 'dry-run', 'no-backup', 'unused', 'csv'].includes(k)) opt[k] = true;
      else opt[k] = argv[++i];
    } else pos.push(a);
  }
  return { pos, opt };
}
const need = (v, what) => { if (v == null || v === '') fail(`missing ${what}. See: togaf help`); return v; };
function table(head, rows, csv) {
  if (csv) {
    const q = s => /[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
    return [head, ...rows].map(r => r.map(q).join(',')).join('\n');
  }
  const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');
  return [`| ${head.map(cell).join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');
}
function readStdin() { return readFileSync(0, 'utf8'); }

export function run(argv, out = s => process.stdout.write(s + '\n')) {
  const { pos, opt } = parseArgs(argv);
  const cmd = pos[0] || 'help';
  const J = v => out(JSON.stringify(v, null, 2));
  const ws = () => Workspace.read(need(pos[1], 'FILE'));
  switch (cmd) {
    case 'help': case '--help': case '-h': out(HELP); return 0;
    case 'types': {
      const L = pos[1];
      if (L && !LAYERS[L]) fail(`unknown layer "${L}" (${Object.keys(LAYERS).join(', ')})`);
      const list = Object.values(ELEMENT_TYPES).filter(t => !L || t.layer === L);
      if (opt.json) return J(list.map(t => ({ id: t.id, name: t.name, layer: t.layer, aspect: t.aspect }))), 0;
      for (const [lk, Ly] of Object.entries(LAYERS)) {
        const ts = list.filter(t => t.layer === lk);
        if (ts.length) out(`${Ly.name}: ${ts.map(t => t.id).join(', ')}`);
      }
      out(`Relationships: ${MM.REL_ORDER.join(', ')}`);
      return 0;
    }
    case 'rules': {
      const s = need(pos[1], 'SOURCE_TYPE'), t = need(pos[2], 'TARGET_TYPE');
      for (const x of [s, t]) if (!ELEMENT_TYPES[x]) fail(`unknown element type "${x}"`);
      const valid = MM.validRelations(s, t), sug = MM.suggestRelation(s, t, valid);
      if (opt.json) return J({ source: s, target: t, valid: MM.REL_ORDER.filter(r => valid.has(r)), suggested: sug }), 0;
      out(`${typeName(s)} → ${typeName(t)}: ${MM.REL_ORDER.filter(r => valid.has(r)).join(', ')} (suggested: ${sug})`);
      return 0;
    }
    case 'viewpoints': {
      const list = Object.entries(VIEWPOINTS).map(([id, v]) => ({ id, name: v.name, layers: v.layers || [], types: v.types || [] }));
      if (opt.json) return J(list), 0;
      for (const v of list) out(`${v.id}: ${v.name}${v.layers.length ? ` · layers ${v.layers.join(', ')}` : ''}${v.types.length ? ` · types ${v.types.join(', ')}` : ''}`);
      return 0;
    }
    case 'new': {
      const file = need(pos[1], 'FILE');
      if (existsSync(file)) fail(`${file} already exists`);
      const w = Workspace.empty(opt.name);
      w.file = file; w.write({ backup: false });
      out(`created ${file}`);
      return 0;
    }
    case 'info': {
      const w = ws(), byLayer = {};
      for (const e of w.elements) byLayer[layerOf(e.type)] = (byLayer[layerOf(e.type)] || 0) + 1;
      const adm = ADM_PHASES.map(p => ({ phase: p.id, status: w.d.adm?.phases?.[p.id]?.status || 'none' }));
      const info = { file: w.file, app: w.d.app, model: w.model.name, description: w.model.description || '', elements: w.elements.length, relationships: w.relationships.length, byLayer, views: w.views.map(v => ({ id: v.id, name: v.name, viewpoint: v.viewpoint, phase: v.phase })), adm };
      if (opt.json) return J(info), 0;
      out(`${info.model}${info.description ? ' — ' + info.description : ''}`);
      out(`${info.elements} elements · ${info.relationships} relationships · ${w.views.length} views · saved by ${w.d.app?.name || '?'} ${w.d.app?.version || ''}`);
      out('By layer: ' + Object.entries(byLayer).map(([k, n]) => `${LAYERS[k]?.name || k} ${n}`).join(', '));
      out('Views: ' + w.views.map(v => `"${v.name}"${v.phase ? ' (' + MM.admPhase(v.phase).code + ')' : ''}`).join(', '));
      out('ADM: ' + (adm.filter(a => a.status !== 'none').map(a => `${MM.admPhase(a.phase).code} ${ADM_STATUS[a.status].name.toLowerCase()}`).join(', ') || 'not started'));
      return 0;
    }
    case 'views': {
      const w = ws();
      const list = w.views.map(v => ({ id: v.id, name: v.name, viewpoint: v.viewpoint || 'none', phase: v.phase || '', elements: v.blocks.filter(b => b.element).length, notes: v.blocks.filter(b => !b.element).length, relationships: v.links.filter(l => l.rel).length, description: v.description || '' }));
      if (opt.json) return J(list), 0;
      for (const v of list) out(`${v.id}  "${v.name}"  ${VIEWPOINTS[v.viewpoint]?.name || v.viewpoint}${v.phase ? ' · phase ' + MM.admPhase(v.phase)?.code : ''} · ${v.elements} elements, ${v.relationships} relationships${v.notes ? `, ${v.notes} notes` : ''}`);
      return 0;
    }
    case 'show': {
      const w = ws(), v = w.findView(need(pos[2], 'VIEW'));
      const els = v.blocks.filter(b => b.element).map(b => ({ block: b.id, ...pick(w.el(b.element)), x: b.x, y: b.y, w: b.w, h: b.h, in: v.blocks.find(c => c !== b && inside(b, c))?.element || undefined }));
      const rels = v.links.filter(l => l.rel && w.rel(l.rel)).map(l => { const r = w.rel(l.rel); return { link: l.id, id: r.id, type: r.type, source: r.source, target: r.target, name: r.name || '' }; });
      const notes = v.blocks.filter(b => !b.element).map(b => ({ block: b.id, text: htmlText(b.title) }));
      if (opt.json) return J({ id: v.id, name: v.name, viewpoint: v.viewpoint, phase: v.phase, description: v.description || '', elements: els, relationships: rels, notes }), 0;
      out(`View "${v.name}" · ${VIEWPOINTS[v.viewpoint]?.name || 'no viewpoint'}${v.phase ? ' · phase ' + MM.admPhase(v.phase)?.code : ''}`);
      if (v.description) out(v.description);
      out(`\nElements (${els.length}):`);
      for (const e of els) out(`  ${e.id}  ${e.name} [${typeName(e.type)}]${e.in ? ` inside ${w.el(e.in)?.name}` : ''}`);
      out(`\nRelationships (${rels.length}):`);
      for (const r of rels) out(`  ${r.id}  ${w.relLabel(w.rel(r.id))}${r.name ? ` "${r.name}"` : ''}`);
      if (notes.length) { out(`\nNotes (${notes.length}):`); for (const n of notes) out(`  ${n.text}`); }
      return 0;
    }
    case 'elements': {
      const w = ws();
      const types = opt.type ? new Set(asList(opt.type)) : null;
      const used = new Set(w.views.flatMap(v => v.blocks.map(b => b.element)));
      const list = w.elements.filter(e => (!types || types.has(e.type)) && (!opt.layer || layerOf(e.type) === opt.layer) &&
        (!opt.search || norm(e.name + ' ' + e.documentation).includes(norm(opt.search))) && (!opt.unused || !used.has(e.id)))
        .map(e => ({ ...pick(e), views: w.viewsShowing(e.id).length, relationships: w.relsOf(e.id).length }));
      if (opt.json) return J(list), 0;
      for (const e of list) out(`${e.id}  ${e.name} [${typeName(e.type)}] · ${e.views} view(s), ${e.relationships} rel.`);
      out(`${list.length} element(s)`);
      return 0;
    }
    case 'element': {
      const w = ws(), e = w.findElement(need(pos[2], 'REF'));
      const rels = w.relsOf(e.id).map(r => ({ id: r.id, type: r.type, direction: r.source === e.id ? 'out' : 'in', other: r.source === e.id ? r.target : r.source, otherName: w.el(r.source === e.id ? r.target : r.source)?.name, name: r.name || '' }));
      const views = w.viewsShowing(e.id).map(v => ({ id: v.id, name: v.name }));
      if (opt.json) return J({ ...e, layer: layerOf(e.type), relationships: rels, views }), 0;
      out(`${e.name} [${typeName(e.type)}, ${LAYERS[layerOf(e.type)]?.name}] ${e.id}`);
      if (e.documentation) out(e.documentation);
      for (const p of e.properties || []) out(`  ${p.key}: ${p.value}`);
      out(`Relationships (${rels.length}):`);
      for (const r of rels) out(`  ${r.direction === 'out' ? '→' : '←'} ${relName(r.type)} ${r.direction === 'out' ? 'to' : 'from'} ${r.otherName}${r.name ? ` "${r.name}"` : ''}  ${r.id}`);
      out(`Views: ${views.map(v => `"${v.name}"`).join(', ') || 'none'}`);
      return 0;
    }
    case 'relations': {
      const w = ws();
      const types = opt.type ? new Set(asList(opt.type)) : null;
      const of = opt.of ? w.findElement(opt.of).id : null;
      const list = w.relationships.filter(r => (!types || types.has(r.type)) && (!of || r.source === of || r.target === of));
      if (opt.json) return J(list.map(r => ({ id: r.id, type: r.type, source: r.source, sourceName: w.el(r.source)?.name, target: r.target, targetName: w.el(r.target)?.name, name: r.name || '', valid: w.el(r.source) && w.el(r.target) ? w.isValid(r.type, w.el(r.source), w.el(r.target)) : false }))), 0;
      for (const r of list) out(`${r.id}  ${w.relLabel(r)}${r.name ? ` "${r.name}"` : ''}`);
      out(`${list.length} relationship(s)`);
      return 0;
    }
    case 'adm': {
      const w = ws();
      const list = ADM_PHASES.map(p => {
        const s = w.d.adm?.phases?.[p.id] || {};
        const items = Object.entries(p.items).map(([g, its]) => ({ group: g, items: its.map(it => ({ name: it, done: !!s.checked?.[it] })) }));
        return { id: p.id, code: p.code, name: p.name, status: s.status || 'none', notes: s.notes || '', items, views: w.views.filter(v => v.phase === p.id).map(v => v.name) };
      });
      if (opt.json) return J(list), 0;
      for (const p of list) {
        const all = p.items.flatMap(g => g.items), done = all.filter(i => i.done).length;
        out(`${p.code.padEnd(2)} ${p.name}: ${ADM_STATUS[p.status]?.name || p.status} · ${done}/${all.length} items${p.views.length ? ' · views: ' + p.views.map(n => `"${n}"`).join(', ') : ''}`);
        if (p.notes) out(`   ${p.notes}`);
      }
      return 0;
    }
    case 'check': {
      const w = ws(), issues = check(w);
      const errors = issues.filter(i => i.level === 'error').length;
      if (opt.json) { J({ errors, warnings: issues.filter(i => i.level === 'warning').length, issues }); return errors ? 1 : 0; }
      for (const lv of ['error', 'warning', 'info']) for (const i of issues.filter(x => x.level === lv)) out(`${lv.toUpperCase().padEnd(7)} ${i.msg}`);
      out(`${errors} error(s), ${issues.filter(i => i.level === 'warning').length} warning(s), ${issues.filter(i => i.level === 'info').length} note(s)`);
      return errors ? 1 : 0;
    }
    case 'impact': {
      const w = ws(), e = w.findElement(need(pos[2], 'REF'));
      const dir = opt.dir || 'both';
      if (!['in', 'out', 'both'].includes(dir)) fail('--dir is in, out or both');
      const res = impact(w, e, { depth: Math.max(1, +opt.depth || 3), dir, types: opt.rel });
      if (opt.json) return J({ start: pick(e), reached: res.map(x => ({ ...pick(x.el), depth: x.depth, via: { relationship: x.via.rel.id, type: x.via.rel.type, from: x.via.from, direction: x.via.out ? 'out' : 'in' } })) }), 0;
      out(`From ${w.elLabel(e)} (${dir}, depth ${Math.max(1, +opt.depth || 3)}):`);
      for (const x of res.sort((a, b) => a.depth - b.depth)) out(`${'  '.repeat(x.depth)}${x.via.out ? '→' : '←'} ${relName(x.via.rel.type)}: ${w.elLabel(x.el)}  (via ${w.el(x.via.from)?.name})`);
      out(`${res.length} element(s) reached`);
      return 0;
    }
    case 'catalog': {
      const w = ws(), types = new Set(asList(need(pos[2], 'TYPE')));
      for (const t of types) if (!ELEMENT_TYPES[t]) fail(`unknown element type "${t}"`);
      const els = w.elements.filter(e => types.has(e.type));
      const keys = [...new Set(els.flatMap(e => (e.properties || []).map(p => p.key)))];
      const rows = els.map(e => [e.name, typeName(e.type), e.documentation || '', ...keys.map(k => (e.properties || []).find(p => p.key === k)?.value || ''), w.viewsShowing(e.id).map(v => v.name).join('; ')]);
      out(table(['Name', 'Type', 'Documentation', ...keys, 'Views'], rows, opt.csv));
      return 0;
    }
    case 'matrix': {
      const w = ws(), rt = new Set(asList(need(pos[2], 'ROWTYPES'))), ct = new Set(asList(need(pos[3], 'COLTYPES')));
      for (const t of [...rt, ...ct]) if (!ELEMENT_TYPES[t]) fail(`unknown element type "${t}"`);
      const R = w.elements.filter(e => rt.has(e.type)), C = w.elements.filter(e => ct.has(e.type));
      const rows = R.map(r => [r.name, ...C.map(c => w.relationships.filter(x => (x.source === r.id && x.target === c.id) || (x.source === c.id && x.target === r.id))
        .map(x => REL_TYPES[x.type]?.abbr + (x.source === r.id ? '→' : '←')).join(' '))]);
      out(table(['', ...C.map(c => c.name)], rows, opt.csv));
      return 0;
    }
    case 'layout': {
      const w = ws();
      w.layout({ view: need(pos[2], 'VIEW') });
      if (!opt['dry-run']) w.write({ backup: !opt['no-backup'] });
      out(w.changes.join('\n'));
      return 0;
    }
    case 'apply': {
      const w = ws();
      const src = need(pos[2], 'OPS file (or - for stdin)');
      let ops;
      try { ops = JSON.parse(src === '-' ? readStdin() : readFileSync(src, 'utf8')); } catch (e) { fail(`operations: invalid JSON (${e.message})`); }
      const results = w.apply(ops);
      const issues = check(w).filter(i => i.level === 'error');
      if (!opt['dry-run']) w.write({ backup: !opt['no-backup'] });
      if (opt.json) return J({ written: !opt['dry-run'], results, changes: w.changes, errors: issues }), 0;
      out(w.changes.join('\n'));
      if (issues.length) out(`check: ${issues.length} error(s) in the workspace, run: togaf check ${w.file}`);
      out(opt['dry-run'] ? 'dry run: nothing written' : `written ${w.file}`);
      return 0;
    }
    default: fail(`unknown command "${cmd}". See: togaf help`);
  }
}
const pick = e => ({ id: e.id, type: e.type, name: e.name, documentation: e.documentation || '', properties: e.properties || [] });
const htmlText = h => String(h ?? '').replace(/<br\s*\/?>|<\/(p|div)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();

// run as a command (also through a symlinked path such as ~/avc/…), not when imported
const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (process.argv[1] && isMain()) {
  try { process.exitCode = run(process.argv.slice(2)) || 0; }
  catch (e) {
    if (e instanceof UserError) { process.stderr.write('error: ' + e.message + '\n'); process.exitCode = 2; }
    else throw e;
  }
}
