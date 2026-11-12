import express from 'express';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const app = express();
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'coin', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'coin', connectionLimit: 10, timezone: 'Z',
});
app.use(express.json({ limit: '16kb' }));
const fields = ['coin_id', 'amount', 'price', 'purchased_at'];
function validate(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !fields.includes(k))) return false;
  if (!Object.keys(body).length || (!partial && fields.some(k => !(k in body)))) return false;
  if ('coin_id' in body && (typeof body.coin_id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(body.coin_id))) return false;
  for (const key of ['amount', 'price']) {
    if (key in body && (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/.test(String(body[key])) || Number(body[key]) <= 0)) return false;
  }
  if ('purchased_at' in body && (typeof body.purchased_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(body.purchased_at) || !Number.isFinite(Date.parse(body.purchased_at)))) return false;
  if ('purchased_at' in body) {
    const date = new Date(body.purchased_at);
    if (date.getUTCFullYear() < 1000 || date.toISOString().slice(0, 19) !== body.purchased_at.slice(0, 19)) return false;
  }
  return true;
}
function validId(id) { return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 4294967295; }
const run = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', run(async (_req, res) => {
  await pool.query('SELECT 1 FROM assets LIMIT 1'); res.json({ status: 'ready' });
}));
app.get('/api/assets', run(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, coin_id, amount, price, purchased_at, created_at FROM assets ORDER BY id'); res.json(rows);
}));
app.get('/api/assets/:id', run(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const [rows] = await pool.execute('SELECT id, coin_id, amount, price, purchased_at, created_at FROM assets WHERE id = ?', [req.params.id]);
  return rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Asset not found' });
}));
app.post('/api/assets', run(async (req, res) => {
  if (!validate(req.body)) return res.status(400).json({ error: 'Check coin, amount, price and purchase date' });
  const {coin_id, amount, price, purchased_at} = req.body;
  const [result] = await pool.execute('INSERT INTO assets (coin_id, amount, price, purchased_at) VALUES (?, ?, ?, ?)', [coin_id, amount, price, new Date(purchased_at)]);
  const [rows] = await pool.execute('SELECT id, coin_id, amount, price, purchased_at, created_at FROM assets WHERE id = ?', [result.insertId]);
  res.status(201).location(`/api/assets/${result.insertId}`).json(rows[0]);
}));
app.patch('/api/assets/:id', run(async (req, res) => {
  if (!validId(req.params.id) || !validate(req.body, true)) return res.status(400).json({ error: 'Check the asset details' });
  const keys = fields.filter(k => k in req.body);
  const values = keys.map(k => k === 'purchased_at' ? new Date(req.body[k]) : req.body[k]);
  const [result] = await pool.execute(`UPDATE assets SET ${keys.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ?`, [...values, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Asset not found' });
  const [rows] = await pool.execute('SELECT id, coin_id, amount, price, purchased_at, created_at FROM assets WHERE id = ?', [req.params.id]); res.json(rows[0]);
}));
app.delete('/api/assets/:id', run(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const [result] = await pool.execute('DELETE FROM assets WHERE id = ?', [req.params.id]);
  return result.affectedRows ? res.status(204).end() : res.status(404).json({ error: 'Asset not found' });
}));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
}
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err); return res.status(err.status === 413 ? 413 : 503).json({ error: 'Request could not be completed' });
});
const server = app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => pool.end().finally(() => process.exit(0))));
