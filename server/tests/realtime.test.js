import http from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { io as connect } from 'socket.io-client';
import app from '../src/app.js';
import { initRealtime } from '../src/realtime/socket.js';
import { connectTestDb, disconnectTestDb, signUp } from './helpers.js';

let server;
let url;

beforeAll(async () => {
  await connectTestDb();
  server = http.createServer(app);
  initRealtime(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const open = (token) =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { transports: ['websocket'], auth: { token }, reconnection: false });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => {
      socket.close();
      reject(err);
    });
  });

// Collects events for a short time so we can also assert that nothing arrived.
const collect = (socket, event, ms = 400) =>
  new Promise((resolve) => {
    const received = [];
    socket.on(event, (payload) => received.push(payload));
    setTimeout(() => resolve(received), ms);
  });

describe('real-time sync', () => {
  it('rejects connections without a valid token', async () => {
    await expect(open('not-a-token')).rejects.toThrow('UNAUTHORIZED');
  });

  it("pushes changes to the user's other sessions only", async () => {
    const alice = await signUp('alice');
    const bob = await signUp('bobby');
    const token = (auth) => auth.Authorization.split(' ')[1];

    const tabA = await open(token(alice));
    const tabB = await open(token(alice));
    const bobTab = await open(token(bob));

    const inA = collect(tabA, 'task:created');
    const inB = collect(tabB, 'task:created');
    const inBob = collect(bobTab, 'task:created');

    // tab A makes the change and identifies itself, so only tab B is notified
    await request(app)
      .post('/api/tasks')
      .set(alice)
      .set('X-Socket-Id', tabA.id)
      .send({ title: 'Shared' })
      .expect(201);

    expect(await inA).toHaveLength(0);
    expect((await inB).map((t) => t.title)).toEqual(['Shared']);
    expect(await inBob).toHaveLength(0);

    [tabA, tabB, bobTab].forEach((s) => s.close());
  });
});
