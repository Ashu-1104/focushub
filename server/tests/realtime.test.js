import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { clearTestDb, connectTestDb, disconnectTestDb, signUp } from './helpers.js';

let server;
let base;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});
beforeEach(clearTestDb);

// Opens an event stream and resolves with the parsed events once the server ends it (SSE_MAX_SECONDS).
const openStream = async (auth, { clientId, lastEventId } = {}) => {
  const headers = { ...auth, Accept: 'text/event-stream' };
  if (lastEventId) headers['Last-Event-ID'] = lastEventId;
  const res = await fetch(`${base}/api/events${clientId ? `?clientId=${clientId}` : ''}`, { headers });
  const done = res.ok ? res.text().then((text) => text.split('\n\n').filter((block) => block.includes('event:')).map((block) => {
    const field = (name) => block.split('\n').find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2);
    return { id: field('id'), type: field('event'), data: JSON.parse(field('data')) };
  })) : Promise.resolve([]);
  return { status: res.status, done };
};

const createTask = (auth, title, clientId) =>
  request(app).post('/api/tasks').set(auth).set('X-Client-Id', clientId).send({ title }).expect(201);

describe('real-time sync (Server-Sent Events)', () => {
  it('rejects streams without a valid token', async () => {
    expect((await openStream({})).status).toBe(401);
    expect((await openStream({ Authorization: 'Bearer nope' })).status).toBe(401);
  });

  it("delivers changes to the user's other tabs only", async () => {
    const alice = await signUp('alice');
    const bob = await signUp('bobby');
    const tabA = await openStream(alice, { clientId: 'tab-a' });
    const tabB = await openStream(alice, { clientId: 'tab-b' });
    const bobTab = await openStream(bob, { clientId: 'bob' });
    await new Promise((r) => setTimeout(r, 200));

    const { body } = await createTask(alice, 'Shared', 'tab-a');
    await request(app).put(`/api/tasks/${body.task._id}`).set(alice).set('X-Client-Id', 'tab-b').send({ status: 'done' }).expect(200);

    const [a, b, bobEvents] = await Promise.all([tabA.done, tabB.done, bobTab.done]);
    expect(a.map((e) => e.type)).toEqual(['task:updated']); // its own create is skipped
    expect(b.map((e) => [e.type, e.data.title])).toEqual([['task:created', 'Shared']]);
    expect(bobEvents).toEqual([]);
  }, 10000);

  it('resumes after a reconnect without missing changes', async () => {
    const alice = await signUp('alice');
    const first = await openStream(alice, { clientId: 'tab' });
    await new Promise((r) => setTimeout(r, 200));
    await createTask(alice, 'Before reconnect', 'other');
    const seen = await first.done;
    const lastId = seen.at(-1).id;

    await createTask(alice, 'While offline', 'other'); // happens between the two connections
    const second = await openStream(alice, { clientId: 'tab', lastEventId: lastId });
    const events = await second.done;
    expect(events.map((e) => e.data.title)).toEqual(['While offline']);
  }, 10000);
});
