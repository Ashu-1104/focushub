import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { streamEvents } from '../realtime/events.js';

const router = Router();

router.get('/', verifyAuth, (req, res, next) => streamEvents(req, res).catch(next));

export default router;
