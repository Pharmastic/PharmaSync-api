import { z } from 'zod';
import { Role } from '@prisma/client';

export const authSchemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      role: z
        .enum(['USER', 'PHARMACIST', 'ADMIN', 'MANAGER'] as [Role, ...Role[]])
        .optional()
        .default('USER')
    })
  }),

  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required')
    })
  }),

  refreshToken: z.object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required')
    })
  })
};
