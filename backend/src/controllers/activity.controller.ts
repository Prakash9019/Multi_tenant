// src/controllers/activity.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';
import { io } from '../sockets/socketManager';
import { getErrorMessage, isPrismaMissingColumnError, logError } from '../utils/runtime';

interface TaskSnapshot {
  title: string;
  description?: string | null;
  columnId: string;
  position: number;
  version: number;
}

const isTaskSnapshot = (value: unknown): value is TaskSnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.columnId === 'string' &&
    typeof candidate.position === 'number' &&
    typeof candidate.version === 'number'
  );
};

export const getActivityLogs = async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  try {
    const logs = await prisma.activityLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        tenantId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(logs);
  } catch (error) {
    logError('activity.getActivityLogs', error);
    res.status(500).json({ error: 'Failed to fetch activity logs', details: getErrorMessage(error) });
  }
};

export const undoLastAction = async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user.id;

  try {
    // Get the most recent undoable action by this user in this tenant
    const lastAction = await prisma.activityLog.findFirst({
      where: {
        tenantId,
        userId,
        action: { in: ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'] }, // Only undo these for now
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastAction) {
      return res.status(404).json({ error: 'No actions to undo' });
    }

    let undoResult: { action: string; entityId: string } | null = null;
    const data = lastAction.data as Record<string, unknown> | null;

    switch (lastAction.action) {
      case 'TASK_CREATED': {
        // Undo create = delete the task
        const deletedTask = await prisma.task.deleteMany({
          where: { id: lastAction.entityId, tenantId },
        });

        if (deletedTask.count === 0) {
          return res.status(409).json({
            error: 'Cannot undo this action because the task no longer exists in this tenant',
          });
        }

        if (io) {
          io.to(`tenant:${tenantId}`).emit('task:deleted', { id: lastAction.entityId });
        }

        undoResult = { action: 'TASK_DELETED', entityId: lastAction.entityId };
        break;
      }

      case 'TASK_DELETED': {
        // Undo delete = recreate the task
        const taskData = data?.task;

        if (!isTaskSnapshot(taskData)) {
          return res.status(409).json({
            error: 'Cannot undo this action because the original task snapshot is incomplete',
          });
        }

        const [existingTask, existingColumn] = await Promise.all([
          prisma.task.findFirst({
            where: { id: lastAction.entityId, tenantId },
            select: { id: true },
          }),
          prisma.column.findFirst({
            where: { id: taskData.columnId, tenantId },
            select: { id: true },
          }),
        ]);

        if (existingTask) {
          return res.status(409).json({
            error: 'Cannot undo this action because the task has already been restored',
          });
        }

        if (!existingColumn) {
          return res.status(409).json({
            error: 'Cannot undo this action because the original column no longer exists',
          });
        }

        const recreatedTask = await prisma.task.create({
          data: {
            id: lastAction.entityId,
            title: taskData.title,
            description: taskData.description,
            columnId: taskData.columnId,
            position: taskData.position,
            version: taskData.version,
            tenantId,
          },
        });

        if (io) {
          io.to(`tenant:${tenantId}`).emit('task:created', recreatedTask);
        }

        undoResult = { action: 'TASK_CREATED', entityId: lastAction.entityId };
        break;
      }

      case 'TASK_UPDATED': {
        // Undo update = revert to previous state
        const previousTask = data?.previous;
        const nextTask = data?.new;

        if (!isTaskSnapshot(previousTask) || !isTaskSnapshot(nextTask)) {
          return res.status(409).json({
            error: 'Cannot undo this action because the task history is incomplete',
          });
        }

        const reverted = await prisma.task.updateMany({
          where: {
            id: lastAction.entityId,
            tenantId,
            version: nextTask.version,
          },
          data: {
            title: previousTask.title,
            description: previousTask.description,
            columnId: previousTask.columnId,
            position: previousTask.position,
            version: { increment: 1 },
          },
        });

        if (reverted.count === 0) {
          return res.status(409).json({
            error: 'Cannot undo this action because the task was changed again',
          });
        }

        const revertedTask = await prisma.task.findFirst({
          where: { id: lastAction.entityId, tenantId },
        });

        if (!revertedTask) {
          return res.status(404).json({ error: 'Task not found after undo' });
        }

        if (io) {
          io.to(`tenant:${tenantId}`).emit('task:updated', revertedTask);
        }

        undoResult = { action: 'TASK_UPDATED', entityId: lastAction.entityId };
        break;
      }

      default:
        return res.status(409).json({ error: 'This action type cannot be undone' });
    }

    if (!undoResult) {
      return res.status(409).json({
        error: 'Cannot undo this action - the item may have been modified by another user',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          action: `UNDO_${lastAction.action}`,
          entityType: lastAction.entityType,
          entityId: lastAction.entityId,
          userId,
          tenantId,
          data: { originalAction: lastAction },
        },
      });

      await tx.activityLog.delete({ where: { id: lastAction.id } });
    });

    res.status(200).json({
      message: 'Action undone successfully',
      undoneAction: lastAction.action,
      result: undoResult,
    });
  } catch (error) {
    if (isPrismaMissingColumnError(error, 'data')) {
      return res.status(503).json({
        error: 'Undo is temporarily unavailable until the database migration for activity history is applied',
      });
    }

    logError('activity.undoLastAction', error);
    res.status(500).json({ error: 'Failed to undo action', details: getErrorMessage(error) });
  }
};
