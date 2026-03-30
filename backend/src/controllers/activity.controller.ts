// src/controllers/activity.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';

export const getActivityLogs = async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  try {
    const logs = await prisma.activityLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};
