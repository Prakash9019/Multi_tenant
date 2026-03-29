// src/routes/column.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { createColumn, updateColumn, deleteColumn } from '../controllers/column.controller';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.post('/', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER']), createColumn);
router.put('/:id', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER']), updateColumn);
router.delete('/:id', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN']), deleteColumn);

export default router;