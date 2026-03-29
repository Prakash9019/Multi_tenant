// src/services/activity.service.ts
import prisma from '../config/db';

interface LogActivityParams {
  action: string;
  entityType: 'TASK' | 'BOARD' | 'COLUMN';
  entityId: string;
  userId: string;
  tenantId: string;
}

export const logActivity = async (params: LogActivityParams) => {
  try {
    await prisma.activityLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        tenantId: params.tenantId,
      },
    });
  } catch (error) {
    // In production, log this to a structured logging service (e.g., Datadog, Winston)
    console.error('Failed to log activity:', error);
  }
};