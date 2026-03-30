// src/controllers/task.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';
import { io } from '../sockets/socketManager';
import { logActivity } from '../services/activity.service';

export const createTask = async (req: Request, res: Response) => {
  const { title, description, columnId, position } = req.body;
  const tenantId = req.tenantId!; // Guaranteed by middleware

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        position,
        columnId,
        tenantId, // Strict scoping
      },
    });

    if (io) {
      io.to(`tenant:${tenantId}`).emit('task:created', task);
    }

    await logActivity({
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: task.id,
      userId: req.user.id,
      tenantId,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, columnId, position, version } = req.body;
  const tenantId = req.tenantId!;

  try {
    // Optimistic Locking: We only update if the version matches what the client sent
    const updatedTask = await prisma.task.updateMany({
      where: {
        id,
        tenantId, // Prevent cross-tenant data modification
        version: version, // Concurrency check
      },
      data: {
        title,
        description,
        columnId,
        position,
        version: { increment: 1 }, // Auto-increment version on success
      },
    });

    if (updatedTask.count === 0) {
      // If count is 0, either the task doesn't exist, belongs to another tenant, 
      // OR a concurrent edit happened (version mismatch).
      return res.status(409).json({ 
        error: 'Conflict detected. The task was modified by another user or does not exist. Please refresh.' 
      });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found after update' });

    if (io) {
      io.to(`tenant:${tenantId}`).emit('task:updated', task);
    }

    await logActivity({
      action: 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: id,
      userId: req.user.id,
      tenantId,
    });

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId!;

  try {
    const deleted = await prisma.task.deleteMany({ where: { id, tenantId }});
    if (deleted.count === 0) return res.status(404).json({ error: 'Task not found' });

    if (io) {
      io.to(`tenant:${tenantId}`).emit('task:deleted', { id });
    }

    await logActivity({
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: id,
      userId: req.user.id,
      tenantId,
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

export const getTasksByBoard = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const tenantId = req.tenantId!;

  try {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        column: {
          boardId: boardId // Join through column to ensure it belongs to the right board
        }
      },
      orderBy: { position: 'asc' }
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};