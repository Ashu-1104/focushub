import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { getAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.get('/', verifyAuth, getAnalytics);

export default router;
