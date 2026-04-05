// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logError } from '../utils/runtime';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    logError('auth.middleware', new Error('JWT_SECRET is not configured'));
    return res.status(500).json({ error: 'Server authentication is not configured' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; 
    next();
  } catch (error) {
    logError('auth.middleware', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
