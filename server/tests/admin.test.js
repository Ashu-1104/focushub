import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Task from '../src/models/Task.js';
import User from '../src/models/User.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers.js';

const TOKEN = 'a-long-random-seed-token-for-tests';
const seed = (token) => request(app).post('/api/admin/seed-demo').set('X-Seed-Token', token);

describe('POST /api/admin/seed-demo', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);
  afterEach(() => { delete process.env.SEED_TOKEN; });

  it('does not exist unless SEED_TOKEN is set', async () => {
    await seed(TOKEN).expect(404);
  });

  it('needs the exact token', async () => {
    process.env.SEED_TOKEN = TOKEN;
    await seed('wrong').expect(403);
    await request(app).post('/api/admin/seed-demo').expect(403);
  });

  it('creates the demo account once, without touching other data', async () => {
    process.env.SEED_TOKEN = TOKEN;
    await request(app).post('/api/auth/signup').send({ email: 'real@example.com', username: 'realuser', password: 'secret123' }).expect(201);
    expect((await seed(TOKEN).expect(201)).body).toEqual({ created: true, email: 'demo@focushub.com' });
    expect((await seed(TOKEN).expect(200)).body.created).toBe(false);
    expect(await User.countDocuments()).toBe(2); // the real user is still there
    const demo = await User.findOne({ email: 'demo@focushub.com' });
    expect(await Task.countDocuments({ userId: demo._id, status: 'done' })).toBeGreaterThan(50); // history included
  });
});
