export function makeTaskTag(templateId, entryId) {
  return `[ipmi:tmpl=${templateId}:entry=${entryId}]`;
}

export function parseTaskTag(text = '') {
  const m = String(text).match(/\[ipmi:tmpl=([^:\]]+):entry=([^\]]+)\]/);
  if (!m) return null;
  return { templateId: m[1], entryId: m[2] };
}

export function buildSyncPlan({ template, deals, existingTasks, offsetChangeMode = 'update' }) {
  const eligibleDeals = deals.filter(d => d.ownerId === template.repId && d.eventName === template.eventName && !!d.linkedinSentDate);
  const desired = new Map();
  for (const deal of eligibleDeals) {
    for (const entry of template.entries) {
      const key = `${deal.id}:${entry.id}`;
      const dueDate = addDays(deal.linkedinSentDate, entry.offsetDays);
      desired.set(key, { dealId: deal.id, entryId: entry.id, dueDate, type: entry.type, title: entry.title, description: entry.description || '' });
    }
  }

  const byKey = new Map();
  for (const t of existingTasks) {
    const tag = parseTaskTag(`${t.title || ''} ${t.note || ''}`);
    if (!tag || tag.templateId !== template.id) continue;
    byKey.set(`${t.dealId}:${tag.entryId}`, t);
  }

  const ops = { create: [], update: [], delete: [], noop: [], preserveCompletedOrphan: [] };

  for (const [key, d] of desired) {
    const existing = byKey.get(key);
    if (!existing) {
      ops.create.push(d);
      continue;
    }
    const sameDue = sameDate(existing.dueDate, d.dueDate);
    const sameType = String(existing.type || '') === String(d.type || '');
    const sameTitle = stripTag(String(existing.title || '')).trim() === String(d.title || '').trim();
    const sameDesc = String(existing.description || existing.note || '') === String(d.description || '');

    if (sameDue && sameType && sameTitle && sameDesc) {
      ops.noop.push({ existingTaskId: existing.id, desired: d });
    } else if (Number(existing.status) === 1) {
      ops.preserveCompletedOrphan.push({ existingTaskId: existing.id, reason: 'completed' });
    } else if (!sameDue && offsetChangeMode === 'update') {
      ops.update.push({ existingTaskId: existing.id, patch: d });
    } else {
      ops.delete.push({ existingTaskId: existing.id, reason: 'mismatch' });
      ops.create.push(d);
    }
    byKey.delete(key);
  }

  for (const [, leftover] of byKey) {
    if (Number(leftover.status) === 1) ops.preserveCompletedOrphan.push({ existingTaskId: leftover.id, reason: 'completed_orphan' });
    else ops.delete.push({ existingTaskId: leftover.id, reason: 'orphan' });
  }

  return ops;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function sameDate(a, b) {
  return String(a || '').slice(0, 10) === String(b || '').slice(0, 10);
}

function stripTag(text){ return String(text).replace(/\[ipmi:tmpl=[^\]]+\]/g,'').trim(); }
