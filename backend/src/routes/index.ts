// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import orgRoutes from './org.routes';
import boardRoutes from './board.routes';
import columnRoutes from './column.routes';
import taskRoutes from './task.routes';
import activityRoutes from './activity.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', orgRoutes);
router.use('/boards', boardRoutes);
router.use('/columns', columnRoutes);
router.use('/tasks', taskRoutes);
router.use('/activity', activityRoutes);

export default router;