#!/usr/bin/env node
const AC_BASE = process.env.AC_BASE_URL || 'https://ipmionline81168.api-us1.com/api/3';
const API_KEY = process.env.AC_API_KEY;
const TEST_DEAL_ID = process.env.AC_TEST_DEAL_ID;

if (!API_KEY) {
  console.error('Missing AC_API_KEY env var');
  process.exit(1);
}
if (!TEST_DEAL_ID) {
  console.error('Missing AC_TEST_DEAL_ID env var (a safe throwaway deal id required for POST/PUT/DELETE probe)');
  process.exit(1);
}

const out = { base: AC_BASE, timestamp: new Date().toISOString(), probes: {} };

async function req(method, path, body) {
  const res = await fetch(`${AC_BASE}${path}`, {
    method,
    headers: {
      'Api-Token': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), json, text: json ? undefined : text.slice(0, 400) };
}

function shape(v) {
  if (v == null) return v;
  if (Array.isArray(v)) return { type: 'array', length: v.length, firstKeys: v[0] && typeof v[0] === 'object' ? Object.keys(v[0]) : null };
  if (typeof v === 'object') {
    const s = {};
    for (const [k,val] of Object.entries(v)) {
      if (Array.isArray(val)) s[k] = { type:'array', length: val.length, firstKeys: val[0] && typeof val[0]==='object' ? Object.keys(val[0]) : null };
      else if (val && typeof val === 'object') s[k] = { type:'object', keys: Object.keys(val) };
      else s[k] = typeof val;
    }
    return s;
  }
  return typeof v;
}

(async () => {
  out.probes.dealTasksList = await req('GET', '/dealTasks?limit=5');
  out.probes.dealTasksByDeal = await req('GET', `/deals/${TEST_DEAL_ID}/dealTasks?limit=5`);

  const due = new Date();
  due.setDate(due.getDate()+2);
  const dueStr = `${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')} 09:00:00`;

  const createBody = {
    dealTask: {
      title: '[probe] IPMI probe task',
      relid: String(TEST_DEAL_ID),
      reltype: 'Deal',
      duedate: dueStr,
      status: 0,
      note: 'Created by probe script',
      taskType: 1,
    }
  };

  out.probes.dealTasksCreate = await req('POST', '/dealTasks', createBody);

  const createdId = out.probes.dealTasksCreate?.json?.dealTask?.id;
  if (createdId) {
    out.probes.dealTaskSingle = await req('GET', `/dealTasks/${createdId}`);
    out.probes.dealTaskUpdateComplete = await req('PUT', `/dealTasks/${createdId}`, { dealTask: { status: 1 } });
    out.probes.dealTaskDelete = await req('DELETE', `/dealTasks/${createdId}`);
  } else {
    out.probes.dealTaskSingle = { skipped: true };
    out.probes.dealTaskUpdateComplete = { skipped: true };
    out.probes.dealTaskDelete = { skipped: true };
  }

  const ownerId = out.probes.dealTasksByDeal?.json?.dealTasks?.[0]?.userid || out.probes.dealTasksList?.json?.dealTasks?.[0]?.userid;
  if (ownerId) out.probes.userSingle = await req('GET', `/users/${ownerId}`);
  else out.probes.userSingle = { skipped: true, reason: 'No userid found in task samples' };

  out.shapes = {};
  for (const [k,v] of Object.entries(out.probes)) {
    out.shapes[k] = v && v.json ? shape(v.json) : null;
  }

  console.log(JSON.stringify(out, null, 2));
})();
