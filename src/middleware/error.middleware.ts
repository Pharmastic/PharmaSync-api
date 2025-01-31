// src/middleware/error.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { handleError } from '../utils/error_handler';

interface TimedRequest extends Request {
  startTime?: number;
}

export const errorHandler = (
  err: Error,
  req: TimedRequest,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Log error for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle unique constraint violations
    if (err.code === 'P2002') {
      res.status(409).json({
        status: 'Conflict Error',
        message: 'A record with this value already exists'
      });
      return;
    }

    // Handle foreign key constraint violations
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 'Validation Error',
        message: 'Invalid reference to a related record'
      });
      return;
    }

    // Handle record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'Not Found',
        message: 'Record not found'
      });
      return;
    }
  }

  // Use the general error handler for other types of errors
  const { status, body } = handleError(err);
  res.status(status).json(body);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'Error',
    message: `Cannot ${req.method} ${req.url}`
  });
};
