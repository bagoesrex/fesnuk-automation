import { Router } from 'express';
import {
  listSchedules, createSchedule, updateSchedule,
  toggleSchedule, runScheduleNow, deleteSchedule,
} from '../controllers/schedules.ts';

const router = Router();

router.get('/', listSchedules);
router.post('/', createSchedule);
router.patch('/:id', updateSchedule);
router.post('/:id/toggle', toggleSchedule);
router.post('/:id/run', runScheduleNow);
router.delete('/:id', deleteSchedule);

export default router;
