// src/controllers/column.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';
import { io } from '../sockets/socketManager';
import { logActivity } from '../services/activity.service';

export const createColumn = async (req: Request, res: Response) => {
  const { name, boardId, position } = req.body;
  const tenantId = req.tenantId!;

  try {
    // First, verify the board actually belongs to this tenant
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board || board.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const column = await prisma.column.create({
      data: { name, boardId, position, tenantId },
    });

    if (io) {
      io.to(`tenant:${tenantId}`).emit('column:created', column);
    }

    await logActivity({ action: 'COLUMN_CREATED', entityType: 'COLUMN', entityId: column.id, userId: req.user.id, tenantId });

    res.status(201).json(column);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create column' });
  }
};

export const updateColumn = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, position } = req.body;
  const tenantId = req.tenantId!;

  try {
    const column = await prisma.column.updateMany({
      where: { id, tenantId },
      data: { name, position },
    });

    if (column.count === 0) return res.status(404).json({ error: 'Column not found' });

    const updatedColumn = await prisma.column.findUnique({ where: { id } });
    if (io && updatedColumn) {
      io.to(`tenant:${tenantId}`).emit('column:updated', updatedColumn);
    }

    await logActivity({ action: 'COLUMN_UPDATED', entityType: 'COLUMN', entityId: id, userId: req.user.id, tenantId });

    res.status(200).json({ message: 'Column updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update column' });
  }
};

export const deleteColumn = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId!;

  try {
    const column = await prisma.column.deleteMany({
      where: { id, tenantId },
    });

    if (column.count === 0) return res.status(404).json({ error: 'Column not found' });

    if (io) {
      io.to(`tenant:${tenantId}`).emit('column:deleted', { id });
    }

    await logActivity({ action: 'COLUMN_DELETED', entityType: 'COLUMN', entityId: id, userId: req.user.id, tenantId });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete column' });
  }
};