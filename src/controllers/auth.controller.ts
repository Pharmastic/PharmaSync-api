// src/controllers/auth.controller.ts

import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import passport from 'passport';
import { z } from 'zod';
import { User } from '@prisma/client';

interface Info {
  message: string;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      const result = await AuthService.register(email, password, name);

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: (error as Error).message });
      next();
    }
  }

  static login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { email, password } = loginSchema.parse(req.body);

    return new Promise((resolve, reject) => {
      passport.authenticate(
        'local',
        { session: false },
        async (err: Error | null, user: User | false, info: Info) => {
          if (err) {
            return reject(err);
          }

          if (!user) {
            res.status(401).json({ error: info.message });
            return resolve();
          }

          try {
            const tokens = await AuthService.generateTokens(user);
            res.json({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
              },
              ...tokens
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      )({ ...req, body: { email, password } }, res, next);
    });
  };

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        next();
      }

      const tokens = await AuthService.refreshToken(refreshToken);
      res.json(tokens);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
      next();
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as { id: number };
      await AuthService.logout(user.id);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error. message:' + (error as Error).message
      });
      next();
    }
  }
}
