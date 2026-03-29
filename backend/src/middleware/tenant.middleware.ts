// src/middleware/tenant.middleware.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db'; // Your Prisma client instance

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  // Expecting clients to pass the active tenant ID in headers
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' });
  }

  try {
    // Validate that the user is actually a member of this tenant
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId: tenantId,
        },
      },
    });

    if (!membership) {
      // Cross-tenant access attempt denied
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }

    // Attach verified tenant and membership context to the request
    req.tenantId = tenantId;
    req.membership = membership;
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error verifying tenancy' });
  }
};