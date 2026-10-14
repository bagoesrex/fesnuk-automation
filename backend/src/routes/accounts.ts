import { Router } from 'express';
import { listAccounts, startSession, confirmSession, deleteAccount } from '../controllers/accounts.ts';

const router = Router();

router.get('/', listAccounts);
router.post('/session/start', startSession);
router.post('/session/confirm', confirmSession);
router.delete('/:id', deleteAccount);

export default router;
