// src/routes/org.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createOrganizationWithTenant, createTenant, getMyTenants } from '../controllers/org.controller';

const router = Router();

router.use(requireAuth); // Protect all org routes

router.post('/', createOrganizationWithTenant);
router.post('/tenants', createTenant);
router.get('/my-tenants', getMyTenants); // Frontend uses this to populate the "Tenant Switcher" dropdown

export default router;