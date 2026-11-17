import mongoose from 'mongoose';
import SyncEvent from '../models/SyncEvent.js';

// Real-time sync that also works on serverless hosts: every change is written to the SyncEvent
// collection, and each open tab streams new events over Server-Sent Events (GET /api/events).
// Tabs reconnect with Last-Event-ID, so nothing is missed when a host ends long requests.

const POLL_MS = Number(process.env.SSE_POLL_MS) || 1500;
const HEARTBEAT_MS = 20_000;
// stay below serverless limits (Vercel: 300 s); the browser reconnects and resumes
const MAX_MS = (Number(process.env.SSE_MAX_SECONDS) || 280) * 1000;

export const emitToUser = async (req, type, payload) => {
  try {
    await SyncEvent.create({ userId: req.user.userId, type, payload, sourceId: req.get('X-Client-Id') || null });
  } catch (error) {
    console.error('Could not record sync event:', error.message); // never fail the user's request over sync
  }
};

const send = (res, event) => {
  res.write(`id: ${event._id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
};

export const streamEvents = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : null;
  const resumeFrom = req.get('Last-Event-ID');
  let lastId = mongoose.isValidObjectId(resumeFrom) ? new mongoose.Types.ObjectId(resumeFrom) : null;
  if (!lastId) {
    // a fresh connection starts from now, not from the whole day's history
    const latest = await SyncEvent.findOne({ userId }).sort({ _id: -1 }).select('_id').lean();
    lastId = latest?._id ?? new mongoose.Types.ObjectId('000000000000000000000000');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 1000\n: connected\n\n');

  let open = true;
  req.on('close', () => { open = false; });
  const started = Date.now();
  let lastBeat = started;

  while (open && Date.now() - started < MAX_MS) {
    const events = await SyncEvent.find({ userId, _id: { $gt: lastId } }).sort({ _id: 1 }).limit(100).lean();
    for (const event of events) {
      lastId = event._id;
      if (event.sourceId && event.sourceId === clientId) continue; // the tab already applied its own change
      send(res, event);
    }
    if (Date.now() - lastBeat > HEARTBEAT_MS) {
      res.write(': ping\n\n');
      lastBeat = Date.now();
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  // tell the browser where to resume, then let it reconnect
  if (open) res.write(`id: ${lastId}\n: reconnect\n\n`);
  res.end();
};
