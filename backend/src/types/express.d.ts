// src/types/express.d.ts
import { User, Membership } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: any; // Replaced with strict JWT payload type in production
      tenantId?: string;
      membership?: Membership;
    }
  }
}