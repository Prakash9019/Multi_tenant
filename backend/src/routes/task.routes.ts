// src/routes/task.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { createTask, updateTask, getTasksByBoard } from '../controllers/task.controller';

const router = Router();

// 1. All routes require valid JWT and valid Tenant context
router.use(requireAuth);
router.use(requireTenant);

// 2. Route definitions
router.get('/board/:boardId', getTasksByBoard);

// Only Org Admins, Tenant Admins, and Members can modify tasks
router.post('/', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER']), createTask);

// PUT requests handle optimistic locking under the hood
router.put('/:id', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER']), updateTask);

export default router;