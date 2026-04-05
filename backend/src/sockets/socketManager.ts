// src/sockets/socketManager.ts
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { registerTaskHandlers } from './taskHandlers';
import { registerPresenceHandlers } from './presenceHandlers';
import { logError } from '../utils/runtime';

export let io: Server;

export const initializeSockets = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Conditionally apply Redis Adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis adapter connected for Socket.io scaling');
  }

  // Middleware: Authenticate and Authorize Tenant Access
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const tenantId = socket.handshake.query.tenantId as string;

      if (!token || !tenantId) {
        return next(new Error('Authentication and tenantId are required'));
      }

      const jwtSecret = process.env.JWT_SECRET?.trim();
      if (!jwtSecret) {
        return next(new Error('Socket authentication is not configured'));
      }

      // 1. Verify JWT
      const decoded = jwt.verify(token, jwtSecret) as any;

      // 2. Verify Membership to enforce cross-tenant data leakage prevention
      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: decoded.id,
            tenantId: tenantId,
          },
        },
      });

      if (!membership) {
        return next(new Error('Access denied to this tenant'));
      }

      // Attach context to socket
      socket.data.user = decoded;
      socket.data.tenantId = tenantId;
      
      next();
    } catch (error) {
      logError('socket.authenticate', error);
      next(new Error('Socket authentication failed'));
    }
  });

  // Connection Handler
  io.on('connection', (socket: Socket) => {
    const tenantId = socket.data.tenantId;
    const tenantRoom = `tenant:${tenantId}`;

    // Scoped WebSocket channel per tenant
    socket.join(tenantRoom);

    // Register domain-specific handlers
    registerPresenceHandlers(io, socket, tenantRoom);
    registerTaskHandlers(io, socket, tenantRoom);

    socket.on('disconnect', () => {
      // Presence leave logic is handled in presenceHandlers
      socket.leave(tenantRoom);
    });
  });
};
