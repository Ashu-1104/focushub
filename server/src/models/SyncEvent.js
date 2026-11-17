import mongoose from 'mongoose';

// One change to a user's data, kept for a day so open tabs/devices can catch up (Server-Sent Events).
const syncEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g. task:created
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  sourceId: { type: String, default: null }, // the browser tab that made the change
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

syncEventSchema.index({ userId: 1, _id: 1 });

const SyncEvent = mongoose.model('SyncEvent', syncEventSchema);
export default SyncEvent;
