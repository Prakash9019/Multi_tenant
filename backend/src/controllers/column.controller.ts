// src/controllers/column.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';

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

    // TODO: Emit 'column:create' WebSocket event
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

    // TODO: Emit 'column:update' WebSocket event
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

    // TODO: Emit 'column:delete' WebSocket event
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete column' });
  }
};