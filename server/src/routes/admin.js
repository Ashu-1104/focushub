import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { seedDemoAccount } from '../jobs/seed.js';

// One-off setup for hosts where you cannot run `npm run seed` (e.g. Vercel).
// Disabled unless SEED_TOKEN is set; never deletes data; only adds the demo account if missing.
const router = Router();

const tokenMatches = (given) => {
  const expected = process.env.SEED_TOKEN || '';
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(expected);
  return expected.length >= 24 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

router.post('/seed-demo', async (req, res, next) => {
  try {
    if (!process.env.SEED_TOKEN) return res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
    if (!tokenMatches(req.get('X-Seed-Token'))) return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    if (await User.exists({ email: 'demo@focushub.com' })) return res.json({ created: false, message: 'Demo account already exists' });
    const user = await seedDemoAccount();
    res.status(201).json({ created: true, email: user.email });
  } catch (error) {
    next(error);
  }
});

export default router;
