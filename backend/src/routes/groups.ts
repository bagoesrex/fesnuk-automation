import { Router } from 'express';
import { listGroups, createGroup, updateGroup, deleteGroup, syncGroups } from '../controllers/groups.ts';

const router = Router();

router.get('/', listGroups);
router.post('/', createGroup);
router.post('/sync', syncGroups);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);

export default router;
