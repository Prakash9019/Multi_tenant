// src/controllers/org.controller.ts
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
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

export const createTenant = async (req: Request, res: Response) => {
  const { organizationId, tenantName } = req.body;
  const userId = req.user.id;

  try {
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) return res.status(404).json({ error: 'Organization not found' });

    const tenant = await prisma.tenant.create({ data: { name: tenantName, organizationId } });

    // Auto-role assign the creator as TENANT_ADMIN for this tenant if they're member of org
    await prisma.membership.create({
      data: {
        userId,
        organizationId,
        tenantId: tenant.id,
        role: 'TENANT_ADMIN',
      },
    });

    res.status(201).json({ tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tenant' });
  }
};

export const inviteUserToTenant = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string;

    // 1. Ensure the user making the request is an ORG_ADMIN or TENANT_ADMIN
    // (This should be handled by your existing rbac.middleware)

    // 2. Find the tenant to get organizationId
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { organizationId: true },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    // 3. Find the user being invited
    const userToInvite = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToInvite) {
      return res.status(404).json({ message: "User not found. They must register first." });
    }

    // 4. Create the Membership
    const membership = await prisma.membership.create({
      data: {
        userId: userToInvite.id,
        tenantId: tenantId,
        organizationId: tenant.organizationId,
        role: (role as Role) || Role.MEMBER,
      },
    });

    res.status(201).json({ message: "User invited successfully", membership });
  } catch (error) {
    res.status(500).json({ message: "Error inviting user", error });
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