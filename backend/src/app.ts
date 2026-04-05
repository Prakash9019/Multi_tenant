// src/app.ts
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes';
import prisma from './config/db';

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
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', message: 'Kanban API is running', db: 'connected' });
  } catch (error) {
    console.error('Health check DB error:', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

export default app;