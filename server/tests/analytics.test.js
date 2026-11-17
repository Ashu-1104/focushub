import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Session from '../src/models/Session.js';
import Task from '../src/models/Task.js';
import User from '../src/models/User.js';
import { buildAnalytics, lastDays, localDate } from '../src/services/analytics.js';
import { clearTestDb, connectTestDb, disconnectTestDb, signUp } from './helpers.js';

const TZ = 'Asia/Kolkata'; // UTC+5:30
const NOW = new Date('2026-11-17T12:00:00Z'); // Tue 17 Nov, 17:30 in Kolkata

describe('buildAnalytics', () => {
  const task = (overrides) => ({
    status: 'done', priority: 'medium', createdAt: '2026-11-10T04:00:00Z', updatedAt: '2026-11-10T04:00:00Z',
    completedAt: null, dueDate: null, ...overrides,
  });

  it('buckets by the local day, not the UTC day', () => {
    // 18:30 UTC on the 16th is already 00:00 on the 17th in Kolkata
    expect(localDate('2026-11-16T18:30:00Z', TZ)).toBe('2026-11-17');
    expect(lastDays(3, NOW, TZ)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
    const result = buildAnalytics({ tasks: [task({ completedAt: '2026-11-16T18:30:00Z' })], sessions: [], days: 7, now: NOW, tz: TZ });
    expect(result.daily.at(-1)).toMatchObject({ date: '2026-11-17', completed: 1 });
    expect(result.range).toMatchObject({ start: '2026-11-11', end: '2026-11-17' });
  });

  it('totals, rates, weekdays, hours and priorities', () => {
    const tasks = [
      task({ completedAt: '2026-11-17T05:00:00Z', priority: 'high', dueDate: '2026-11-17T06:30:00Z', createdAt: '2026-11-15T05:00:00Z' }), // on time
      task({ completedAt: '2026-11-16T05:00:00Z', priority: 'urgent', dueDate: '2026-11-14T06:30:00Z', createdAt: '2026-11-15T05:00:00Z' }), // late
      task({ status: 'todo', createdAt: '2026-11-16T05:00:00Z' }), // created, not done
      task({ status: 'done', completedAt: null, updatedAt: '2026-11-16T07:00:00Z' }), // old data: done without completedAt
    ];
    const sessions = [
      { type: 'pomodoro', duration: 25, completedAt: '2026-11-17T03:30:00Z' }, // 09:00 local
      { type: 'focus', duration: 50, completedAt: '2026-11-17T03:45:00Z' },
      { type: 'short_break', duration: 5, completedAt: '2026-11-17T04:00:00Z' }, // not focus
    ];
    const r = buildAnalytics({ tasks, sessions, days: 7, now: NOW, tz: TZ });
    expect(r.totals).toMatchObject({ completed: 3, created: 3, focusMinutes: 75, sessions: 2, completionRate: 100, onTimeRate: 50 });
    expect(r.totals.bestDay).toEqual({ date: '2026-11-16', completed: 2 });
    expect(r.byWeekday.find((d) => d.day === 'Tue')).toEqual({ day: 'Tue', completed: 1, focusMinutes: 75 });
    expect(r.byHour[9].focusMinutes).toBe(75);
    expect(r.byPriority).toEqual([
      { priority: 'urgent', completed: 1 }, { priority: 'high', completed: 1 },
      { priority: 'medium', completed: 1 }, { priority: 'low', completed: 0 },
    ]);
    expect(r.heatmap).toHaveLength(84);
    expect(r.heatmap.at(-1)).toEqual({ date: '2026-11-17', count: 3 }); // 1 task + 2 focus sessions
  });

  it('compares with the previous period', () => {
    const tasks = [
      task({ completedAt: '2026-11-08T05:00:00Z' }), // previous 7 days
      task({ completedAt: '2026-11-15T05:00:00Z' }),
      task({ completedAt: '2026-11-16T05:00:00Z' }),
    ];
    const r = buildAnalytics({ tasks, sessions: [], days: 7, now: NOW, tz: TZ });
    expect(r.change.completed).toBe(100);
    expect(r.change.focusMinutes).toBe(0);
    expect(buildAnalytics({ tasks: tasks.slice(1), sessions: [], days: 7, now: NOW, tz: TZ }).change.completed).toBeNull();
  });
});

describe('GET /api/analytics', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  it('validates the query', async () => {
    const auth = await signUp('alice');
    await request(app).get('/api/analytics').query({ days: 14 }).set(auth).expect(400);
    await request(app).get('/api/analytics').query({ tz: 'Mars/Olympus' }).set(auth).expect(400);
    await request(app).get('/api/analytics').expect(401);
  });

  it("returns only the user's own work", async () => {
    const alice = await signUp('alice');
    const bob = await signUp('bobby');
    const aliceUser = await User.findOne({ username: 'alice' });
    const bobUser = await User.findOne({ username: 'bobby' });
    const doneNow = { status: 'done', completedAt: new Date() };
    await Task.create([
      { title: 'A1', userId: aliceUser._id, ...doneNow },
      { title: 'A2', userId: aliceUser._id, ...doneNow },
      { title: 'B1', userId: bobUser._id, ...doneNow },
    ]);
    await Session.create({ userId: aliceUser._id, type: 'pomodoro', duration: 25 });

    const res = await request(app).get('/api/analytics').query({ days: 7, tz: 'UTC' }).set(alice).expect(200);
    expect(res.body.totals).toMatchObject({ completed: 2, focusMinutes: 25, sessions: 1 });
    expect(res.body.daily).toHaveLength(7);
    const bobRes = await request(app).get('/api/analytics').query({ days: 7, tz: 'UTC' }).set(bob).expect(200);
    expect(bobRes.body.totals.completed).toBe(1);
  });
});
