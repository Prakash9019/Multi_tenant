// src/controllers/org.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';

export const createOrganizationWithTenant = async (req: Request, res: Response) => {
  const { orgName, tenantName } = req.body;
  const userId = req.user.id;

  try {
    // Transaction ensures both Org and Tenant are created safely
    const result = await prisma.$transaction(async (tx : any) => {
      const org = await tx.organization.create({
        data: { name: orgName },
      });

      const tenant = await tx.tenant.create({
        data: { name: tenantName, organizationId: org.id },
      });

      // Grant the creator ORG_ADMIN rights via Membership
      await tx.membership.create({
        data: {
          userId,
          organizationId: org.id,
          tenantId: tenant.id,
          role: 'ORG_ADMIN',
        },
      });

      return { org, tenant };
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create organization structure' });
  }
};

export const getMyTenants = async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    // Fetch all tenants the user has a membership for
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        tenant: true,
        organization: true
      }
    });

    res.status(200).json(memberships);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};