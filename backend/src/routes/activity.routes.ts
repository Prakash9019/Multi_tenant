// src/routes/activity.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { getActivityLogs } from '../controllers/activity.controller';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', getActivityLogs);

export default router;
