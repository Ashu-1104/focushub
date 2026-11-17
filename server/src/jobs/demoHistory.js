// Eight weeks of believable past work for the demo account, so analytics has something to show.
// Deterministic (seeded random), weekday-heavy, with most focus in the morning and early afternoon (IST).
import Session from '../models/Session.js';
import Task from '../models/Task.js';

const TITLES = [
  'Review pull requests', 'Write API tests', 'Update project README', 'Fix login bug', 'Plan sprint goals',
  'Refactor task service', 'Design settings page', 'Reply to client emails', 'Prepare weekly report',
  'Optimise database queries', 'Write blog post draft', 'Clean up old branches', 'Pair on calendar feature',
];
const PRIORITIES = ['low', 'medium', 'medium', 'medium', 'high', 'high', 'urgent'];
const DAY = 24 * 60 * 60 * 1000;

// small seeded PRNG (mulberry32) so every seed produces the same history
const random = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function buildDemoHistory(userId, { days = 56, now = new Date(), seed = 42 } = {}) {
  const rand = random(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const tasks = [];
  const sessions = [];

  for (let ago = days; ago >= 1; ago -= 1) {
    const day = startOfToday - ago * DAY;
    const weekend = [0, 6].includes(new Date(day).getUTCDay());
    // UTC hours 3-11 are 08:30-16:30 in India
    const at = (hour) => new Date(day + hour * 60 * 60 * 1000 + Math.floor(rand() * 50) * 60 * 1000);

    const doneCount = weekend ? Math.floor(rand() * 2) : 1 + Math.floor(rand() * 4);
    for (let i = 0; i < doneCount; i += 1) {
      const completedAt = at(4 + rand() * 7);
      const late = rand() < 0.2;
      tasks.push({
        userId,
        title: pick(TITLES),
        priority: pick(PRIORITIES),
        status: 'done',
        createdAt: new Date(completedAt.getTime() - (1 + Math.floor(rand() * 3)) * DAY),
        dueDate: new Date(completedAt.getTime() + (late ? -1 : 1) * DAY),
        completedAt,
        updatedAt: completedAt,
      });
    }

    const sessionCount = weekend ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 4);
    for (let i = 0; i < sessionCount; i += 1) {
      const morning = rand() < 0.65;
      sessions.push({
        userId,
        type: rand() < 0.75 ? 'pomodoro' : 'focus',
        duration: rand() < 0.75 ? 25 : 50,
        completedAt: at(morning ? 3.5 + rand() * 3 : 8 + rand() * 3),
      });
    }
  }
  return { tasks, sessions };
}

export async function insertDemoHistory(userId, options) {
  const { tasks, sessions } = buildDemoHistory(userId, options);
  await Task.insertMany(tasks, { timestamps: false });
  await Session.insertMany(sessions);
  return { tasks: tasks.length, sessions: sessions.length };
}
