import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base supplier schema that matches Prisma's SupplierCreateInput
const supplierCreateSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  address: z.string().optional()
}) satisfies z.Schema<
  Omit<
    Prisma.SupplierCreateInput,
    'id' | 'createdAt' | 'updatedAt' | 'products'
  >
>;

// Schema for updating a supplier
const supplierUpdateSchema = supplierCreateSchema.partial();

// Derive types from the schemas
export type SupplierCreate = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;

// Request schemas for different supplier endpoints
export const supplierSchemas = {
  create: z.object({
    body: supplierCreateSchema
  }),

  update: z.object({
    params: z.object({
      id: z.string().uuid('Invalid supplier ID')
    }),
    body: supplierUpdateSchema
  }),

  getOne: z.object({
    params: z.object({
      id: z.string().uuid('Invalid supplier ID')
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
export const supplierResponseSchemas = {
  supplier: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
  })
} as const;

export type SupplierResponse = z.infer<typeof supplierResponseSchemas.supplier>;
