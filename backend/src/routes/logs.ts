import { Router } from 'express';
import { listLogs, getStats } from '../controllers/logs.ts';

const router = Router();

router.get('/', listLogs);
router.get('/stats', getStats);

export default router;
