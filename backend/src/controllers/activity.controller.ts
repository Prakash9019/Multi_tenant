// src/controllers/activity.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';
import { logActivity } from '../services/activity.service';
import { io } from '../sockets/socketManager';
import { getErrorMessage, logError } from '../utils/runtime';

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

    // Check if the entity still exists and hasn't been modified by others
    let canUndo = false;
    let undoResult;

    const data = lastAction.data as any; // Cast JSON data for type safety

    switch (lastAction.action) {
      case 'TASK_CREATED':
        // Undo create = delete the task
        const taskExists = await prisma.task.findFirst({
          where: { id: lastAction.entityId, tenantId },
        });
        if (taskExists) {
          await prisma.task.delete({ where: { id: lastAction.entityId } });
          if (io) {
            io.to(`tenant:${tenantId}`).emit('task:deleted', { id: lastAction.entityId });
          }
          canUndo = true;
          undoResult = { action: 'TASK_DELETED', entityId: lastAction.entityId };
        }
        break;

      case 'TASK_DELETED':
        // Undo delete = recreate the task
        if (data?.task) {
          const recreatedTask = await prisma.task.create({
            data: {
              id: lastAction.entityId, // Restore with same ID
              title: data.task.title,
              description: data.task.description,
              columnId: data.task.columnId,
              position: data.task.position,
              version: data.task.version,
              tenantId,
            },
          });
          if (io) {
            io.to(`tenant:${tenantId}`).emit('task:created', recreatedTask);
          }
          canUndo = true;
          undoResult = { action: 'TASK_CREATED', entityId: lastAction.entityId };
        }
        break;

      case 'TASK_UPDATED':
        // Undo update = revert to previous state
        if (data?.previous) {
          const currentTask = await prisma.task.findFirst({
            where: { id: lastAction.entityId, tenantId },
          });
          if (currentTask && currentTask.version === data.new.version) {
            // Only undo if no one else modified it
            const revertedTask = await prisma.task.update({
              where: { id: lastAction.entityId },
              data: {
                title: data.previous.title,
                description: data.previous.description,
                columnId: data.previous.columnId,
                position: data.previous.position,
                version: { increment: 1 },
              },
            });
            if (io) {
              io.to(`tenant:${tenantId}`).emit('task:updated', revertedTask);
            }
            canUndo = true;
            undoResult = { action: 'TASK_UPDATED', entityId: lastAction.entityId };
          }
        }
        break;
    }

    if (canUndo) {
      // Log the undo action
      await logActivity({
        action: `UNDO_${lastAction.action}`,
        entityType: lastAction.entityType as 'TASK' | 'BOARD' | 'COLUMN',
        entityId: lastAction.entityId,
        userId,
        tenantId,
        data: { originalAction: lastAction },
      });

      // Delete the original action log so it can't be undone again
      await prisma.activityLog.delete({ where: { id: lastAction.id } });

      res.status(200).json({
        message: 'Action undone successfully',
        undoneAction: lastAction.action,
        result: undoResult,
      });
    } else {
      res.status(409).json({
        error: 'Cannot undo this action - the item may have been modified by another user'
      });
    }
  } catch (error) {
    logError('activity.undoLastAction', error);
    res.status(500).json({ error: 'Failed to undo action', details: getErrorMessage(error) });
  }
};
