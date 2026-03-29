// src/sockets/presenceHandlers.ts
import { Server, Socket } from 'socket.io';

// Simple in-memory presence tracking (Map of tenantId -> Array of User Objects)
// If scaling with Redis, you would use Redis Hashes to store presence state across servers.
const activeUsers = new Map<string, Map<string, any>>();

export const registerPresenceHandlers = (io: Server, socket: Socket, tenantRoom: string) => {
  const tenantId = socket.data.tenantId;
  const user = socket.data.user;

  // Initialize tenant map if not exists
  if (!activeUsers.has(tenantId)) {
    activeUsers.set(tenantId, new Map());
  }

  const tenantUsers = activeUsers.get(tenantId)!;

  // Add user to presence map (using user.id as key to prevent duplicate avatars for same user)
  tenantUsers.set(user.id, { id: user.id, name: user.name, email: user.email });

  // Broadcast updated presence list to everyone in the room (including the joined user)
  io.to(tenantRoom).emit('presence:update', Array.from(tenantUsers.values()));

  // Handle Disconnect
  socket.on('disconnect', () => {
    if (tenantUsers.has(user.id)) {
      tenantUsers.delete(user.id);
      
      // Clean up map if empty to prevent memory leaks
      if (tenantUsers.size === 0) {
        activeUsers.delete(tenantId);
      } else {
        // Broadcast new list
        io.to(tenantRoom).emit('presence:update', Array.from(tenantUsers.values()));
      }
    }
  });
};