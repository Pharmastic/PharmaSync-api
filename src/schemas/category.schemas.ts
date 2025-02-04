import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base category schema that matches Prisma's CategoryCreateInput
const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional()
}) satisfies z.Schema<
  Omit<
    Prisma.CategoryCreateInput,
    'id' | 'createdAt' | 'updatedAt' | 'products'
  >
>;

// Schema for updating a category
const categoryUpdateSchema = categoryCreateSchema.partial();

// Derive types from the schemas
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

// Request schemas for different category endpoints
export const categorySchemas = {
  create: z.object({
    body: categoryCreateSchema
  }),

  update: z.object({
    params: z.object({
      id: z.string().uuid('Invalid category ID')
    }),
    body: categoryUpdateSchema
  }),

  getOne: z.object({
    params: z.object({
      id: z.string().uuid('Invalid category ID')
    })
  }),

  getAll: z.object({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(['name', 'createdAt']).optional(),
      order: z.enum(['asc', 'desc']).optional()
    })
  })
} as const;

// Response schemas for type safety in controllers
export const categoryResponseSchemas = {
  category: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
  })
} as const;

export type CategoryResponse = z.infer<typeof categoryResponseSchemas.category>;
