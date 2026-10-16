import { Router } from 'express';
import {
  listAccounts,
  startSession,
  confirmSession,
  deleteAccount,
  updateAccount,
  exportSession,
  importSession,
} from '../controllers/accounts.ts';

const router = Router();

router.get('/', listAccounts);
router.post('/session/start', startSession);
router.post('/session/confirm', confirmSession);
router.post('/session/import', importSession);
router.get('/:id/session', exportSession);
router.patch('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
