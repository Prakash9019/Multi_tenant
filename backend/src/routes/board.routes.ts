// src/routes/board.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { 
  createBoard, getBoards, getBoardById, updateBoard, deleteBoard 
} from '../controllers/board.controller';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', getBoards);
router.get('/:id', getBoardById);

// Members can create/edit, but only Admins can delete a whole board
router.post('/', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER']), createBoard);
router.put('/:id', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN', 'MEMBER']), updateBoard);
router.delete('/:id', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN']), deleteBoard);

export default router;