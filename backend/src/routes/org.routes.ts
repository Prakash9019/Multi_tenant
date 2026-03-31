// src/routes/org.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { createOrganizationWithTenant, createTenant, inviteUserToTenant, getMyTenants } from '../controllers/org.controller';

const router = Router();

router.use(requireAuth); // Protect all org routes

// ✅ Only ORG_ADMIN can create organizations (industry standard: admins manage structure)
router.post('/', requireRoles(['ORG_ADMIN']), createOrganizationWithTenant);
// ✅ Only ORG_ADMIN can create tenants
router.post('/tenants', requireRoles(['ORG_ADMIN']), createTenant);
// ✅ Only TENANT_ADMIN or ORG_ADMIN can invite users
router.post('/invite', requireRoles(['ORG_ADMIN', 'TENANT_ADMIN']), inviteUserToTenant);
// ✅ Any authenticated user can fetch their assigned tenants
router.get('/my-tenants', getMyTenants); // Frontend uses this to populate the "Tenant Switcher" dropdown

export default router;