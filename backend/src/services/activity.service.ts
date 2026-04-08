// src/services/activity.service.ts
import prisma from '../config/db';
import { isPrismaMissingColumnError, logError } from '../utils/runtime';

interface LogActivityParams {
  action: string;
  entityType: 'TASK' | 'BOARD' | 'COLUMN';
  entityId: string;
  userId: string;
  tenantId: string;
  data?: any; // Optional data for undo operations
}

export const logActivity = async (params: LogActivityParams) => {
  const baseData = {
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    tenantId: params.tenantId,
  };

  try {
    await prisma.activityLog.create({
      data: {
        ...baseData,
        data: params.data,
      },
    });
  } catch (error) {
    if (isPrismaMissingColumnError(error, 'data')) {
      try {
        await prisma.activityLog.create({
          data: baseData,
        });
        console.warn('[activity.log] ActivityLog.data is missing in the database. Logged a reduced activity entry.');
        return;
      } catch (fallbackError) {
        logError('activity.log.fallback', fallbackError);
        return;
      }
    }

    logError('activity.log', error);
  }
};
