import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';

// Base user schema that matches Prisma's UserCreateInput
const userCreateSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z
    .enum(['USER', 'PHARMACIST', 'ADMIN', 'MANAGER'] as [Role, ...Role[]])
    .optional()
    .default('USER')
}) satisfies z.Schema<
  Omit<
    Prisma.UserCreateInput,
    'id' | 'refreshToken' | 'createdAt' | 'updatedAt' | 'products'
  >
>;

// Derive types from the schema
export type UserCreate = z.infer<typeof userCreateSchema>;

// Request schemas for different auth endpoints
export const authSchemas = {
  register: z.object({
    body: userCreateSchema
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
} as const;

// Response schemas for type safety in controllers
export const authResponseSchemas = {
  authResponse: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      role: z.enum(['USER', 'PHARMACIST', 'ADMIN', 'MANAGER'] as [
        Role,
        ...Role[]
      ])
    }),
    accessToken: z.string(),
    refreshToken: z.string()
  })
} as const;

// Export types for responses
export type AuthResponse = z.infer<typeof authResponseSchemas.authResponse>;
