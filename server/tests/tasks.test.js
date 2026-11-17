import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { clearTestDb, connectTestDb, disconnectTestDb, signUp } from './helpers.js';

const api = request(app);

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearTestDb);

const createTask = (auth, body) => api.post('/api/tasks').set(auth).send(body).expect(201);

describe('tasks API', () => {
  it('requires authentication', async () => {
    await api.get('/api/tasks').expect(401);
  });

  it('creates a task with due time, repeat and reminder', async () => {
    const auth = await signUp('alice');
    const res = await createTask(auth, {
      title: 'Standup',
      dueDate: '2026-11-20T04:00:00.000Z',
      allDay: false,
      recurrence: 'daily',
      reminderMinutes: 10,
    });
    expect(res.body.task).toMatchObject({ title: 'Standup', status: 'todo', allDay: false, recurrence: 'daily', reminderMinutes: 10 });
  });

  it('rejects invalid repeat and reminder values', async () => {
    const auth = await signUp('alice');
    await api.post('/api/tasks').set(auth).send({ title: 'x', recurrence: 'hourly' }).expect(400);
    await api.post('/api/tasks').set(auth).send({ title: 'x', reminderMinutes: -5 }).expect(400);
  });

  it('only changes the fields that are sent', async () => {
    const auth = await signUp('alice');
    const { body } = await createTask(auth, { title: 'Report', dueDate: '2026-11-20T06:30:00.000Z', priority: 'high' });

    const done = await api.put(`/api/tasks/${body.task._id}`).set(auth).send({ status: 'done' }).expect(200);
    expect(done.body.task).toMatchObject({ status: 'done', priority: 'high', dueDate: '2026-11-20T06:30:00.000Z' });
    expect(done.body.task.completedAt).toBeTruthy();

    const moved = await api.put(`/api/tasks/${body.task._id}`).set(auth).send({ dueDate: '2026-11-25T06:30:00.000Z' }).expect(200);
    expect(moved.body.task).toMatchObject({ status: 'done', dueDate: '2026-11-25T06:30:00.000Z' });
  });

  it('creates the next occurrence once when a repeating task is completed', async () => {
    const auth = await signUp('alice');
    const { body } = await createTask(auth, {
      title: 'Water plants',
      dueDate: '2026-11-17T06:30:00.000Z',
      recurrence: 'weekly',
      reminderMinutes: 0,
    });

    const first = await api.put(`/api/tasks/${body.task._id}`).set(auth).send({ status: 'done' }).expect(200);
    expect(first.body.nextTask).toMatchObject({
      title: 'Water plants',
      status: 'todo',
      recurrence: 'weekly',
      reminderMinutes: 0,
      dueDate: '2026-11-24T06:30:00.000Z',
    });

    const again = await api.put(`/api/tasks/${body.task._id}`).set(auth).send({ status: 'done' }).expect(200);
    expect(again.body.nextTask).toBeNull();
  });

  it('returns only tasks due inside the requested range', async () => {
    const auth = await signUp('alice');
    await createTask(auth, { title: 'In range', dueDate: '2026-11-10T06:30:00.000Z' });
    await createTask(auth, { title: 'Too late', dueDate: '2026-12-10T06:30:00.000Z' });
    await createTask(auth, { title: 'No date' });

    const res = await api
      .get('/api/tasks/range')
      .set(auth)
      .query({ start: '2026-11-01T00:00:00.000Z', end: '2026-12-01T00:00:00.000Z' })
      .expect(200);
    expect(res.body.tasks.map((t) => t.title)).toEqual(['In range']);
  });

  it('validates the range', async () => {
    const auth = await signUp('alice');
    const range = (start, end) => api.get('/api/tasks/range').set(auth).query({ start, end });
    await range('2026-11-10T00:00:00.000Z', '2026-11-01T00:00:00.000Z').expect(400);
    await range('2026-01-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z').expect(400);
    await range('yesterday', 'tomorrow').expect(400);
  });

  it("keeps users' tasks private", async () => {
    const alice = await signUp('alice');
    const bob = await signUp('bobby');
    const { body } = await createTask(alice, { title: 'Secret', dueDate: '2026-11-10T06:30:00.000Z' });

    await api.get(`/api/tasks/${body.task._id}`).set(bob).expect(404);
    await api.put(`/api/tasks/${body.task._id}`).set(bob).send({ status: 'done' }).expect(404);
    await api.delete(`/api/tasks/${body.task._id}`).set(bob).expect(404);
    const list = await api.get('/api/tasks').set(bob).expect(200);
    expect(list.body.tasks).toHaveLength(0);
  });
});
