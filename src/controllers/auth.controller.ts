import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import prisma from '../config/database_client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, Role, User } from '@prisma/client';
import { asyncHandler } from '../utils/error_handler';
import { AuthResponse, authSchemas, UserCreate } from '../schemas/auth.schemas';
import { ValidationError } from '../utils/error_handler';

interface JWTPayload {
  id: string;
  email: string;
  role: Role;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthController {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRY = '7d';
  private static readonly REFRESH_TOKEN_EXPIRY = '30d';

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

  static register = asyncHandler(
    async (req: Request, res: Response<AuthResponse>) => {
      // Validate request body against the register schema
      const validationResult = authSchemas.register.safeParse(req);

      if (!validationResult.success) {
        throw new ValidationError(validationResult.error.message);
      }

      const { email, password, firstName, lastName, role }: UserCreate =
        validationResult.data.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role
        }
      });

      const tokens = await AuthController.generateTokenPair(user);
      const response = AuthController.formatUserResponse(user, tokens);

      res.status(201).json(response);
    }
  );

  static login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // Validate request body against the login schema
      const validationResult = authSchemas.login.safeParse(req);

      if (!validationResult.success) {
        throw new ValidationError(validationResult.error.message);
      }

      const { email, password } = validationResult.data.body;

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
            throw new ValidationError(info.message);
          }

          const tokens = await AuthController.generateTokenPair(user);
          const response = AuthController.formatUserResponse(user, tokens);
          res.json(response);
        }
      )({ ...req, body: { email, password } }, res, next);
    }
  );

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = authSchemas.refreshToken.safeParse(req);

    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { refreshToken } = validationResult.data.body;

    try {
      const decoded = jwt.verify(
        refreshToken,
        AuthController.JWT_REFRESH_SECRET
      ) as { id: string };
      const user = await prisma.user.findFirst({
        where: {
          id: decoded.id,
          refreshToken
        }
      });

      if (!user) {
        throw new ValidationError('Invalid refresh token');
      }

      const tokens = await AuthController.generateTokenPair(user);
      res.json(tokens);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ValidationError('Invalid or expired refresh token');
      }
      throw error;
    }
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;

    if (!user) {
      throw new ValidationError('Not authenticated');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null }
    });

    res.json({ message: 'Successfully logged out' });
  });

  // Get all users with pagination and filtering
  static getAllUsers = asyncHandler(async (req: Request, res: Response) => {
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
  });
}
