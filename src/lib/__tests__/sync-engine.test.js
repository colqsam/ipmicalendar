import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyncPlan, makeTaskTag } from '../sync-engine.js';

const template = { id: 'tmpl1', repId: '10', eventName: 'EHS Nashville | Jul 26-28', entries: [{ id: 'e1', offsetDays: 0, type: 'email', title: 't1' }] };
const deals = [{ id: 'd1', ownerId: '10', eventName: 'EHS Nashville | Jul 26-28', linkedinSentDate: '2026-07-01' }];

test('new template => creates', () => {
  const ops = buildSyncPlan({ template, deals, existingTasks: [] });
  assert.equal(ops.create.length, 1);
});

test('unchanged => noop', () => {
  const existingTasks = [{ id: 't1', dealId: 'd1', dueDate: '2026-07-01', status: 0, type: 'email', title: `t1 ${makeTaskTag('tmpl1','e1')}`, note: '' }];
  const ops = buildSyncPlan({ template, deals, existingTasks });
  assert.equal(ops.noop.length, 1);
});

test('entry removed => delete unless completed', () => {
  const existingTasks = [{ id: 't1', dealId: 'd1', dueDate: '2026-07-01', status: 0, type: 'email', title: makeTaskTag('tmpl1','old'), note: '' }];
  const ops = buildSyncPlan({ template, deals, existingTasks });
  assert.equal(ops.delete.length, 1);
});

test('completed orphan preserved', () => {
  const existingTasks = [{ id: 't1', dealId: 'd1', dueDate: '2026-07-01', status: 1, type: 'email', title: makeTaskTag('tmpl1','old'), note: '' }];
  const ops = buildSyncPlan({ template, deals, existingTasks });
  assert.equal(ops.delete.length, 0);
  assert.equal(ops.preserveCompletedOrphan.length, 1);
});


test('offset changed defaults to update', () => {
  const t2 = { ...template, entries: [{ id: 'e1', offsetDays: 2, type: 'email', title: 't1' }] };
  const existingTasks = [{ id: 't1', dealId: 'd1', dueDate: '2026-07-01', status: 0, type: 'email', title: `t1 ${makeTaskTag('tmpl1','e1')}`, note: '' }];
  const ops = buildSyncPlan({ template: t2, deals, existingTasks });
  assert.equal(ops.update.length, 1);
  assert.equal(ops.create.length, 0);
  assert.equal(ops.delete.length, 0);
});
