import { z } from 'zod';
import Task from '../models/Task.js';
import Session from '../models/Session.js';
import { HEATMAP_DAYS, RANGES, buildAnalytics, isValidTimeZone } from '../services/analytics.js';

const querySchema = z.object({
  days: z.coerce.number().refine((d) => RANGES.includes(d), { message: `days must be one of ${RANGES.join(', ')}` }).default(30),
  tz: z.string().max(64).refine(isValidTimeZone, { message: 'tz must be an IANA time zone, e.g. Asia/Kolkata' }).default('UTC'),
});

export const getAnalytics = async (req, res, next) => {
  try {
    const { days, tz } = querySchema.parse(req.query);
    // enough history for this period, the previous one and the heatmap, plus a day for time zones
    const since = new Date(Date.now() - (Math.max(days * 2, HEATMAP_DAYS) + 1) * 24 * 60 * 60 * 1000);
    const userId = req.user.userId;

    const [tasks, sessions] = await Promise.all([
      Task.find({
        userId,
        $or: [
          { completedAt: { $gte: since } },
          { createdAt: { $gte: since } },
          { status: 'done', completedAt: null, updatedAt: { $gte: since } },
        ],
      }).select('status priority dueDate createdAt updatedAt completedAt').lean(),
      Session.find({ userId, completedAt: { $gte: since } }).select('type duration completedAt').lean(),
    ]);

    res.json(buildAnalytics({ tasks, sessions, days, tz }));
  } catch (error) {
    next(error);
  }
};
