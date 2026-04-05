// src/app.ts
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes';
import prisma from './config/db';
import { hasRequiredEnv, logError } from './utils/runtime';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());

// Mount all API routes under /api/v1
app.use('/api/v1', apiRoutes);

// Health check endpoint with DB connectivity validation
app.get('/health', async (req, res) => {
  const checks = {
    database: false,
    prisma: false,
    jwtSecret: hasRequiredEnv('JWT_SECRET'),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
    await prisma.user.count();
    checks.prisma = true;

    const statusCode = checks.database && checks.prisma && checks.jwtSecret ? 200 : 500;

    res.status(statusCode).json({
      status: statusCode === 200 ? 'ok' : 'error',
      message: statusCode === 200 ? 'Kanban API is running' : 'Kanban API configuration is incomplete',
      checks,
    });
  } catch (error) {
    logError('health', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection or Prisma schema check failed',
      checks,
    });
  }
});

export default app;
