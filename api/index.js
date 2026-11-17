// Vercel serverless entry: the whole Express API as one function (see vercel.json).
import app from '../server/src/app.js';
import { ensureDb } from '../server/src/config/database.js';

export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch (error) {
    console.error('Database unavailable:', error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database unavailable, please retry', code: 'DB_UNAVAILABLE' }));
    return;
  }
  return app(req, res);
}
