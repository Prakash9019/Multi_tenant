// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { getRequiredEnv, getErrorMessage, logError } from '../utils/runtime';

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  try {
    const jwtSecret = getRequiredEnv('JWT_SECRET');
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    logError('auth.register', error);
    res.status(500).json({ error: 'Registration failed', details: getErrorMessage(error) });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const jwtSecret = getRequiredEnv('JWT_SECRET');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });

    res.status(200).json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    logError('auth.login', error);
    res.status(500).json({ error: 'Login failed', details: getErrorMessage(error) });
  }
};
