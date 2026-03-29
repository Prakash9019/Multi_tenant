// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const requireRoles = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.membership) {
      return res.status(403).json({ error: 'Membership context missing. Run requireTenant first.' });
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions for this action',
        requiredRoles: allowedRoles,
        userRole: req.membership.role 
      });
    }

    next();
  };
};