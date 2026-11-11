// node --test tools/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadMetamodel, Workspace, check, impact, run } from './togaf.mjs';

const SAMPLE = new URL('../sample.json', import.meta.url);
const copy = () => {
  const dir = mkdtempSync(join(tmpdir(), 'togaf-'));
  const f = join(dir, 'ws.json');
  writeFileSync(f, readFileSync(SAMPLE));
  return f;
};
const runOut = argv => { const lines = []; const code = run(argv, s => lines.push(s)); return { code, text: lines.join('\n') }; };

test('the app metamodel region evaluates without a browser', () => {
  const mm = loadMetamodel();
  assert.ok(mm.ELEMENT_TYPES.applicationComponent);
  assert.ok(mm.validRelations('applicationComponent', 'applicationService').has('realization'));
  assert.equal(mm.APP_INFO.name, 'arch-togaf');
});

test('the sample workspace has no errors', () => {
  const issues = check(Workspace.read(copy()));
  assert.deepEqual(issues.filter(i => i.level === 'error'), []);
});

test('check reports what the app would drop or reject', () => {
  const w = Workspace.read(copy());
  const r = w.relationships.find(x => x.id === 'r-c8');
  [r.source, r.target] = [r.target, r.source]; // wrong direction: requirement realizes a component
  w.relationships.push({ id: 'r-dangling', type: 'serving', source: 'e-shop', target: 'e-nope' });
  w.views[0].links.push({ id: 'l-bad', rel: 'r-c3', from: { block: w.views[0].blocks[0].id }, to: { block: w.views[0].blocks[1].id } });
  const codes = check(w).filter(i => i.level === 'error').map(i => i.code);
  assert.ok(codes.includes('invalid-relationship'));
  assert.ok(codes.includes('dangling-relationship'));
  assert.ok(codes.includes('link-mismatch'));
});

test('apply adds, relates, shows and lays out; drawn links join source to target', () => {
  const f = copy();
  const w = Workspace.read(f);
  w.apply([
    { op: 'addElement', type: 'applicationComponent', name: 'CRM', id: 'e-crm' },
    { op: 'addRelationship', type: 'flow', source: 'CRM', target: 'ERP', name: 'customers' },
    { op: 'show', view: 'Order system', elements: ['CRM'] },
    { op: 'addView', name: 'CRM view', viewpoint: 'applicationCooperation', elements: ['CRM', 'ERP', 'Web shop'] }
  ]);
  w.write();
  const back = Workspace.read(f);
  const rel = back.relationships.find(r => r.source === 'e-crm');
  for (const name of ['Order system', 'CRM view']) {
    const v = back.findView(name), l = v.links.find(x => x.rel === rel.id);
    assert.ok(l, `relationship drawn in ${name}`);
    assert.equal(v.blocks.find(b => b.id === l.from.block).element, 'e-crm');
  }
  const v = back.findView('CRM view');
  for (const a of v.blocks) for (const b of v.blocks) if (a !== b) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'no overlapping blocks');
  assert.deepEqual(check(back).filter(i => i.level === 'error'), []);
  assert.ok(existsSync(join(f, '..', '.ws.json.bak')));
});

test('invalid relationships are refused unless forced, and a failed batch writes nothing', () => {
  const f = copy();
  const before = readFileSync(f, 'utf8');
  const ops = writeOps(f, [
    { op: 'addElement', type: 'goal', name: 'G1' },
    { op: 'addRelationship', type: 'composition', source: 'Web shop', target: 'Handle order' }
  ]);
  assert.throws(() => runOut(['apply', f, ops]), /not valid/);
  assert.equal(readFileSync(f, 'utf8'), before);
  const w = Workspace.read(f);
  w.apply([{ op: 'addRelationship', type: 'composition', source: 'Web shop', target: 'Handle order', force: true }]);
  assert.equal(check(w).filter(i => i.code === 'invalid-relationship').length, 1);
});

test('removeElement cascades to relationships, blocks, links and flow steps', () => {
  const w = Workspace.read(copy());
  w.apply([{ op: 'removeElement', ref: 'ERP' }]);
  assert.ok(!w.relationships.some(r => r.source === 'e-erp' || r.target === 'e-erp'));
  for (const v of w.views) {
    assert.ok(!v.blocks.some(b => b.element === 'e-erp'));
    const ids = new Set([...v.blocks.map(b => b.id), ...v.links.map(l => l.id)]);
    for (const l of v.links) for (const e of ['from', 'to']) if (l[e].block) assert.ok(ids.has(l[e].block));
    for (const fl of v.flows || []) for (const s of fl.steps) assert.ok(ids.has(s.ref));
  }
  assert.deepEqual(check(w).filter(i => i.level === 'error'), []);
});

test('ambiguous names are refused with the candidates', () => {
  const w = Workspace.read(copy());
  w.apply([{ op: 'addElement', type: 'node', name: 'ERP' }]);
  assert.throws(() => w.findElement('ERP'), /ambiguous/);
  assert.equal(w.findElement('applicationComponent:ERP').id, 'e-erp');
});

test('impact follows relationships in the asked direction', () => {
  const w = Workspace.read(copy());
  const names = impact(w, w.findElement('ERP'), { depth: 1, dir: 'out' }).map(x => x.el.name).sort();
  assert.deepEqual(names, ['Order API', 'Order record']);
});

test('settings, viewports and untouched views survive a write', () => {
  const f = copy();
  const orig = JSON.parse(readFileSync(f, 'utf8'));
  const w = Workspace.read(f);
  w.apply([{ op: 'addElement', type: 'goal', name: 'G2' }]);
  w.write();
  const back = JSON.parse(readFileSync(f, 'utf8'));
  assert.deepEqual(back.settings, orig.settings);
  assert.deepEqual(back.views, orig.views);
  assert.deepEqual(back.app, orig.app);
});

function writeOps(f, ops) { const p = f + '.ops.json'; writeFileSync(p, JSON.stringify(ops)); return p; }
