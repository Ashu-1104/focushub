import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';

let memoryServer = null;

// Uses MONGODB_URI_TEST when set (CI service container), otherwise an in-memory MongoDB.
export const connectTestDb = async () => {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  await mongoose.connect(uri, { dbName: `focushub_test_${process.pid}` });
};

export const disconnectTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
};

export const clearTestDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

// Signs up a user and returns an Authorization header for them.
export const signUp = async (name) => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: `${name}@example.com`, username: name, password: 'secret123' })
    .expect(201);
  return { Authorization: `Bearer ${res.body.accessToken}` };
};
