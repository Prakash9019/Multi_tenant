// src/controllers/board.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/db';

export const createBoard = async (req: Request, res: Response) => {
  const { name } = req.body;
  const tenantId = req.tenantId!;

  try {
    const board = await prisma.board.create({
      data: { name, tenantId },
    });
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
};

export const getBoards = async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  try {
    const boards = await prisma.board.findMany({
      where: { tenantId },
      include: {
        columns: {
          orderBy: { position: 'asc' }
        }
      }
    });
    res.status(200).json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
};

export const getBoardById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId!;

  try {
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: { orderBy: { position: 'asc' } }
          }
        }
      }
    });

    if (!board || board.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.status(200).json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
};

export const updateBoard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const tenantId = req.tenantId!;

  try {
    const board = await prisma.board.updateMany({
      where: { id, tenantId }, // Strict scoping ensures cross-tenant updates fail
      data: { name },
    });

    if (board.count === 0) return res.status(404).json({ error: 'Board not found' });
    
    res.status(200).json({ message: 'Board updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update board' });
  }
};

export const deleteBoard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId!;

  try {
    const board = await prisma.board.deleteMany({
      where: { id, tenantId }, 
    });

    if (board.count === 0) return res.status(404).json({ error: 'Board not found' });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete board' });
  }
};