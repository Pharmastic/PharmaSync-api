import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import prisma from '../config/database_client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, Role, User } from '@prisma/client';

// Types and Interfaces
interface JWTPayload {
  id: string;
  email: string;
  role: Role;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthController {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  // Private helper methods
  private static async generateTokenPair(user: User): Promise<TokenPair> {
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, AuthController.JWT_SECRET, {
      expiresIn: AuthController.ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign(
      { id: user.id },
      AuthController.JWT_REFRESH_SECRET,
      {
        expiresIn: AuthController.REFRESH_TOKEN_EXPIRY
      }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    return { accessToken, refreshToken };
  }

  private static formatUserResponse(
    user: User,
    tokens: TokenPair
  ): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      ...tokens
    };
  }

  // Controller methods
  static async register(req: Request, res: Response) {
    const { email, password, firstName, lastName, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, role }
    });

    const tokens = await AuthController.generateTokenPair(user);
    const response = AuthController.formatUserResponse(user, tokens);

    res.status(201).json(response);
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    passport.authenticate(
      'local',
      { session: false },
      async (
        err: Error | null,
        user: User | false,
        info: { message: string }
      ) => {
        if (err) throw err;

        if (!user) {
          res.status(401).json({ error: info.message });
          return;
        }

        const tokens = await AuthController.generateTokenPair(user);
        const response = AuthController.formatUserResponse(user, tokens);
        res.json(response);
      }
    )({ ...req, body: { email, password } }, res, next);
  }

  static async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(
      refreshToken,
      AuthController.JWT_REFRESH_SECRET
    ) as {
      id: string;
    };
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        refreshToken
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const tokens = await AuthController.generateTokenPair(user);
    res.json(tokens);
  }

  static async logout(req: Request, res: Response) {
    const user = req.user as User;

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null }
    });

    res.json({ message: 'Successfully logged out' });
  }

  // Get all users with pagination and filtering
  static async getAllUsers(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        role,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query as {
        page?: string;
        limit?: string;
        search?: string;
        role?: Role;
        sortBy?: string;
        order?: 'asc' | 'desc';
      };

      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      // Build where clause for filtering
      const where: Prisma.UserWhereInput = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (role) {
        where.role = role;
      }

      // Get users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            // Exclude sensitive fields like password and refreshToken
            password: false,
            refreshToken: false
          },
          skip,
          take: limitNumber,
          orderBy: {
            [sortBy]: order
          }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        data: users,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}
