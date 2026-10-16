import { Router } from 'express';
import { getAuthStatus, login } from '../controllers/auth.ts';

const router = Router();

router.get('/status', getAuthStatus);
router.post('/login', login);

export default router;
