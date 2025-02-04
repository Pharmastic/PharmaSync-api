import { z } from 'zod';
import { Prisma, DosageForm, ProductStatus, LogType } from '@prisma/client';

// Base product schema that matches Prisma's ProductCreateInput
const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().positive('Price must be positive'),
  costPrice: z.number().positive('Cost price must be positive'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  reorderPoint: z.number().int().min(0, 'Reorder point cannot be negative'),
  expiryDate: z.string().datetime().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  supplierId: z.string().uuid('Invalid supplier ID'),
  batchNumber: z.string().optional(),
  dosageForm: z.nativeEnum(DosageForm, {
    errorMap: () => ({ message: 'Invalid dosage form' })
  }),
  strength: z.string().optional(),
  storage: z.string().optional(),
  prescriptionRequired: z.boolean(),
  status: z
    .nativeEnum(ProductStatus, {
      errorMap: () => ({ message: 'Invalid product status' })
    })
    .optional()
}) satisfies z.Schema<
  Omit<
    Prisma.ProductCreateInput,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'category'
    | 'supplier'
    | 'createdBy'
    | 'createdById'
    | 'inventoryLogs'
  >
>;

// Schema for updating product stock
const stockUpdateSchema = z.object({
  quantity: z.number().int(),
  type: z.nativeEnum(LogType, {
    errorMap: () => ({ message: 'Invalid log type' })
  }),
  reason: z.string().optional()
});

// Schema for updating a product
const productUpdateSchema = productCreateSchema.partial();

// Derive types from the schemas
export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type StockUpdate = z.infer<typeof stockUpdateSchema>;

// Request schemas for different product endpoints
export const productSchemas = {
  create: z.object({
    body: productCreateSchema
  }),

  update: z.object({
    params: z.object({
      id: z.string().uuid('Invalid product ID')
    }),
    body: productUpdateSchema
  }),

  updateStock: z.object({
    params: z.object({
      id: z.string().uuid('Invalid product ID')
    }),
    body: stockUpdateSchema
  }),

  getOne: z.object({
    params: z.object({
      id: z.string().uuid('Invalid product ID')
    })
  }),

  getAll: z.object({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      category: z.string().uuid('Invalid category ID').optional(),
      status: z.nativeEnum(ProductStatus).optional(),
      expiringBefore: z.string().datetime().optional(),
      sortBy: z.enum(['name', 'createdAt', 'quantity', 'price']).optional(),
      order: z.enum(['asc', 'desc']).optional()
    })
  })
} as const;

// Response schemas for type safety in controllers
export const productResponseSchemas = {
  product: z.object({
    id: z.string(),
    name: z.string(),
    genericName: z.string().nullable(),
    manufacturer: z.string(),
    description: z.string().nullable(),
    barcode: z.string().nullable(),
    sku: z.string(),
    price: z.number(),
    costPrice: z.number(),
    quantity: z.number(),
    reorderPoint: z.number(),
    expiryDate: z.string().nullable(),
    categoryId: z.string(),
    supplierId: z.string(),
    batchNumber: z.string().nullable(),
    dosageForm: z.nativeEnum(DosageForm),
    strength: z.string().nullable(),
    storage: z.string().nullable(),
    prescriptionRequired: z.boolean(),
    status: z.nativeEnum(ProductStatus),
    createdAt: z.string(),
    updatedAt: z.string(),
    category: z.object({
      id: z.string(),
      name: z.string()
    }),
    supplier: z.object({
      id: z.string(),
      name: z.string()
    })
  })
} as const;

export type ProductResponse = z.infer<typeof productResponseSchemas.product>;
