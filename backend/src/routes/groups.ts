import { Router } from 'express';
import { listGroups, createGroup, updateGroup, deleteGroup } from '../controllers/groups.ts';

const router = Router();

router.get('/', listGroups);
router.post('/', createGroup);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);

export default router;
