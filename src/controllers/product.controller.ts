import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database_client';
import { DosageForm, LogType, Prisma, ProductStatus } from '@prisma/client';

// Validation schema for creating/updating a product
const productSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  manufacturer: z.string(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string(),
  price: z.number().positive(),
  costPrice: z.number().positive(),
  quantity: z.number().int().min(0),
  reorderPoint: z.number().int().min(0),
  expiryDate: z.string().datetime().optional(),
  categoryId: z.string().uuid(),
  supplierId: z.string().uuid(),
  batchNumber: z.string().optional(),
  dosageForm: z.nativeEnum(DosageForm),
  strength: z.string().optional(),
  storage: z.string().optional(),
  prescriptionRequired: z.boolean(),
  status: z.nativeEnum(ProductStatus).optional()
});

export class ProductController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = productSchema.parse(req.body);
      const userId = (req.user as { id: string }).id;

      const product = await prisma.product.create({
        data: {
          ...data,
          createdById: userId
        },
        include: {
          category: true,
          supplier: true
        }
      });

      // Create initial inventory log
      if (data.quantity > 0) {
        await prisma.inventoryLog.create({
          data: {
            productId: product.id,
            type: 'PURCHASE',
            quantity: data.quantity,
            reason: 'Initial stock'
          }
        });
      }

      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: 'Validation error', details: error.errors });
        return;
      }
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        category,
        status,
        expiringBefore
      } = req.query as {
        page?: string;
        limit?: string;
        search?: string;
        category?: string;
        status?: string;
        expiringBefore?: string;
      };

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const skip = (pageNumber - 1) * limitNumber;

      const where: Prisma.ProductWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { genericName: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (category) {
        where.categoryId = category;
      }

      if (status) {
        if (Object.values(ProductStatus).includes(status as ProductStatus)) {
          where.status = status as ProductStatus;
        } else {
          res.status(400).json({
            error: 'Invalid status value',
            validValues: Object.values(ProductStatus)
          });
          next();
        }
      }

      if (expiringBefore) {
        where.expiryDate = {
          lte: new Date(expiringBefore as string)
        };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limitNumber,
          include: {
            category: true,
            supplier: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.product.count({ where })
      ]);

      res.json({
        data: products,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          supplier: true,
          inventoryLogs: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        }
      });

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = productSchema.partial().parse(req.body);

      const product = await prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
          supplier: true
        }
      });

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: 'Validation error', details: error.errors });
        return;
      }
      next(error);
    }
  }

  static async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, type, reason } = z
        .object({
          quantity: z.number().int(),
          type: z.enum([
            'PURCHASE',
            'SALE',
            'ADJUSTMENT',
            'RETURN',
            'EXPIRED',
            'DAMAGED'
          ]),
          reason: z.string().optional()
        })
        .parse(req.body);

      const product = await prisma.$transaction(async (tx) => {
        // Get current product
        const currentProduct = await tx.product.findUnique({
          where: { id }
        });

        if (!currentProduct) {
          throw new Error('Product not found');
        }

        // Calculate new quantity
        let newQuantity = currentProduct.quantity;
        if (['PURCHASE', 'RETURN'].includes(type)) {
          newQuantity += quantity;
        } else {
          newQuantity -= quantity;
        }

        if (newQuantity < 0) {
          throw new Error('Insufficient stock');
        }

        // Update product quantity
        const updatedProduct = await tx.product.update({
          where: { id },
          data: {
            quantity: newQuantity,
            status: newQuantity === 0 ? 'OUT_OF_STOCK' : 'ACTIVE'
          }
        });

        // Create inventory log
        await tx.inventoryLog.create({
          data: {
            productId: id,
            type: type as LogType,
            quantity,
            reason
          }
        });

        return updatedProduct;
      });

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: 'Validation error', details: error.errors });
        return;
      }
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await prisma.product.delete({
        where: { id }
      });

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await prisma.product.findMany({
        where: {
          quantity: {
            lte: prisma.product.fields.reorderPoint
          },
          status: 'ACTIVE'
        },
        include: {
          supplier: true
        },
        orderBy: {
          quantity: 'asc'
        }
      });

      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  static async getExpiring(req: Request, res: Response, next: NextFunction) {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const products = await prisma.product.findMany({
        where: {
          expiryDate: {
            lte: thirtyDaysFromNow,
            gte: new Date()
          },
          status: 'ACTIVE'
        },
        orderBy: {
          expiryDate: 'asc'
        }
      });

      res.json(products);
    } catch (error) {
      next(error);
    }
  }
}
