// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: Role;
    }
  }
}

export class AuthMiddleware {
  static hasRole(allowedRoles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;

        if (!user) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to access this resource'
          });
          return;
        }

        if (!allowedRoles.includes(user.role)) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this resource'
          });
          return;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static isAdmin = (req: Request, res: Response, next: NextFunction) => {
    AuthMiddleware.hasRole([Role.ADMIN])(req, res, next);
  };

  static isManagerOrAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    AuthMiddleware.hasRole([Role.ADMIN, Role.MANAGER])(req, res, next);
  };

  static isPharmacist = (req: Request, res: Response, next: NextFunction) => {
    AuthMiddleware.hasRole([Role.ADMIN, Role.MANAGER, Role.PHARMACIST])(
      req,
      res,
      next
    );
  };

  static isResourceOwner = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = req.user;
      const resourceId = req.params.id;

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      // If user is admin or manager, allow access
      if (user.role === Role.ADMIN || user.role === Role.MANAGER) {
        next();
        return;
      }

      // Check if the resource belongs to the user
      if (resourceId !== user.id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
