import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = 'http://localhost:3000';
const created = [];
async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}
function json(method, data) { return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }; }
async function waitReady() {
  for (let i = 0; i < 90; i++) {
    try { if ((await request('/health/ready')).status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw Error('Application did not become ready');
}
try {
  await waitReady();
  assert.equal((await request('/health/live')).status, 200);
  const body = { coin_id: 'bitcoin', amount: '0.01234567', price: '42000.10000000', purchased_at: '2025-04-01T12:00:00.000Z' };
  let r = await request('/api/assets', json('POST', body));
  assert.equal(r.status, 201); created.push(r.data.id); const id = r.data.id;
  r = await request('/api/assets', json('POST', { ...body, amount: '1.00000000' }));
  assert.equal(r.status, 201); created.push(r.data.id); assert.notEqual(r.data.id, id);
  r = await request(`/api/assets/${id}`); assert.equal(r.status, 200); assert.equal(r.data.coin_id, 'bitcoin'); assert.equal(r.data.amount, body.amount);
  r = await request(`/api/assets/${id}`, json('PATCH', { amount: '2.25000000' })); assert.equal(r.status, 200); assert.equal(r.data.amount, '2.25000000');
  assert.equal((await request('/api/assets')).data.filter(x => created.includes(x.id)).length, 2);
  assert.equal((await request('/api/assets', json('POST', { ...body, amount: '-1' }))).status, 400);
  assert.equal((await request('/api/assets', json('POST', { ...body, coin_id: "x' OR 1=1" }))).status, 400);
  assert.equal((await request('/api/assets', json('POST', { ...body, purchased_at: '2025-02-30T12:00:00.000Z' }))).status, 400);
  assert.equal((await request('/api/assets/invalid')).status, 400);
  assert.equal((await request('/api/assets/4294967295')).status, 404);
  assert.equal((await request('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  console.log('PASS create, duplicate coin, read, list, update, invalid input');
  execFileSync('docker', ['compose', 'run', '--rm', '--no-deps', 'db-init'], { stdio: 'inherit' });
  assert.equal((await request(`/api/assets/${id}`)).data.amount, '2.25000000');
  console.log('PASS SQL reapplication preserves rows');
  execFileSync('docker', ['compose', 'restart', 'db', 'app'], { stdio: 'inherit' });
  await waitReady();
  assert.equal((await request(`/api/assets/${id}`)).data.amount, '2.25000000');
  console.log('PASS persistence after database and application restart');
  assert.equal((await request(`/api/assets/${id}`, { method: 'DELETE' })).status, 204);
  created.splice(created.indexOf(id), 1);
  assert.equal((await request(`/api/assets/${id}`)).status, 404);
  assert.equal((await request(`/api/assets/${id}`, { method: 'DELETE' })).status, 404);
  console.log('PASS delete and missing record');
} finally {
  for (const id of created) { try { await request(`/api/assets/${id}`, { method: 'DELETE' }); } catch {} }
}
