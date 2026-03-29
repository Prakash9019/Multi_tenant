// src/sockets/taskHandlers.ts
import { Server, Socket } from 'socket.io';
import prisma from '../config/db';
import { logActivity } from '../services/activity.service';

export const registerTaskHandlers = (io: Server, socket: Socket, tenantRoom: string) => {
  const tenantId = socket.data.tenantId;
  const userId = socket.data.user.id;

  // Handle Drag-and-Drop Task Move
  socket.on('task:move', async (data: { taskId: string; newColumnId: string; newPosition: number; version: number }) => {
    try {
      // Optimistic Locking: Check version to prevent concurrent drag-drop conflicts
      const updatedTask = await prisma.task.updateMany({
        where: {
          id: data.taskId,
          tenantId: tenantId,
          version: data.version, // Ensure client has the latest version
        },
        data: {
          columnId: data.newColumnId,
          position: data.newPosition,
          version: { increment: 1 },
        },
      });

      if (updatedTask.count === 0) {
        // Version mismatch or task deleted. Emit error to the specific user to trigger UI rollback.
        socket.emit('task:conflict', { taskId: data.taskId, message: 'Task was modified by another user. Refreshing.' });
        return;
      }

      // Fetch the updated task to broadcast
      const task = await prisma.task.findUnique({ where: { id: data.taskId } });

      // Broadcast to everyone else in the tenant room
      socket.to(tenantRoom).emit('task:moved', task);

      await logActivity({
        action: 'TASK_MOVED',
        entityType: 'TASK',
        entityId: data.taskId,
        userId: userId,
        tenantId: tenantId,
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to move task' });
    }
  });

  // Handle Task Update (Title, Description)
  socket.on('task:update', async (data: { taskId: string; updates: any; version: number }) => {
    try {
      const updatedTask = await prisma.task.updateMany({
        where: { id: data.taskId, tenantId, version: data.version },
        data: { ...data.updates, version: { increment: 1 } },
      });

      if (updatedTask.count === 0) {
        socket.emit('task:conflict', { taskId: data.taskId, message: 'Concurrent edit detected.' });
        return;
      }

      const task = await prisma.task.findUnique({ where: { id: data.taskId } });
      socket.to(tenantRoom).emit('task:updated', task);

      await logActivity({ action: 'TASK_UPDATED', entityType: 'TASK', entityId: data.taskId, userId, tenantId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to update task' });
    }
  });
};