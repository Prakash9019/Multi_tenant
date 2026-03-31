// src/routes/org.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { createOrganizationWithTenant, createTenant, inviteUserToTenant, getMyTenants } from '../controllers/org.controller';

const router = Router();

router.use(requireAuth); // Protect all org routes

// ✅ Any authenticated user can CREATE their own organization (they become ORG_ADMIN)
// No role check needed since they have 0 memberships at this point
router.post('/', createOrganizationWithTenant);
// ✅ Only ORG_ADMIN can create additional tenants
router.post('/tenants', requireTenant, requireRoles(['ORG_ADMIN']), createTenant);
// ✅ Only TENANT_ADMIN or ORG_ADMIN can invite users (requireTenant must come first)
router.post('/invite', requireTenant, requireRoles(['ORG_ADMIN', 'TENANT_ADMIN']), inviteUserToTenant);
// ✅ Any authenticated user can fetch their assigned tenants
router.get('/my-tenants', getMyTenants);

export default router;