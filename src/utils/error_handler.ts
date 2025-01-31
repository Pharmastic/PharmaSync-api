import { Prisma } from '@prisma/client';
import { RequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public status: string,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError
) => {
  // Most common Prisma error codes you'll encounter
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return {
        statusCode: 409,
        message: `A record with this ${(error.meta?.target as string[]).join(', ')} already exists.`
      };

    case 'P2025': // Record not found
      return {
        statusCode: 404,
        message: 'Record not found.'
      };

    case 'P2003': // Foreign key constraint violation
      return {
        statusCode: 400,
        message: 'Invalid reference to a related record.'
      };

    case 'P2014': // Required relation violation
      return {
        statusCode: 400,
        message: 'Required relation violation.'
      };

    case 'P2024': // Connection pool timeout
      return {
        statusCode: 503,
        message: 'Database connection timeout. Please try again.'
      };

    default:
      console.error('Unhandled Prisma Error:', {
        code: error.code,
        meta: error.meta,
        message: error.message
      });
      return {
        statusCode: 500,
        message: 'An unexpected database error occurred.'
      };
  }
};

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(401, 'Authentication Error', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'Validation Error', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'Conflict Error', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'Not Found', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, 'Forbidden', message);
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        status: error.status,
        message: error.message
      }
    };
  }

  // Prisma error handling
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error);
  }

  // JWT errors
  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return {
      status: 401,
      body: {
        status: 'Authentication Error',
        message: 'Invalid token'
      }
    };
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return {
      status: 401,
      body: {
        status: 'Authentication Error',
        message: 'Token has expired'
      }
    };
  }

  // Default error
  console.error('Unhandled error:', error);
  return {
    status: 500,
    body: {
      status: 'Error',
      message: 'An unexpected error occurred'
    }
  };
};

export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  async (req, res, next): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
