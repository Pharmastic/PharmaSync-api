import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database_client';
import { asyncHandler } from '../utils/error_handler';
import { supplierSchemas, SupplierCreate } from '../schemas/supplier.schemas';
import {
  ValidationError,
  NotFoundError,
  ConflictError
} from '../utils/error_handler';

export class SupplierController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body against the create schema
    const validationResult = supplierSchemas.create.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const supplierData: SupplierCreate = validationResult.data.body;

    // Check if supplier with same email exists (if email provided)
    if (supplierData.email) {
      const existingSupplier = await prisma.supplier.findUnique({
        where: { email: supplierData.email }
      });

      if (existingSupplier) {
        throw new ConflictError('Supplier with this email already exists');
      }
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: supplierData
    });

    res.status(201).json(supplier);
  });

  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = supplierSchemas.getAll.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const {
      page = '1',
      limit = '10',
      search,
      sortBy = 'createdAt',
      order = 'desc'
    } = validationResult.data.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause for filtering
    const where: Prisma.SupplierWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get suppliers with pagination
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: {
          [sortBy]: order
        },
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.supplier.count({ where })
    ]);

    res.json({
      data: suppliers,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = supplierSchemas.getOne.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            quantity: true,
            status: true
          }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    res.json(supplier);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = supplierSchemas.update.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;
    const updateData = validationResult.data.body;

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!existingSupplier) {
      throw new NotFoundError('Supplier not found');
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== existingSupplier.email) {
      const duplicateSupplier = await prisma.supplier.findUnique({
        where: { email: updateData.email }
      });

      if (duplicateSupplier) {
        throw new ConflictError('Supplier with this email already exists');
      }
    }

    // Update supplier
    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: updateData
    });

    res.json(updatedSupplier);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = supplierSchemas.getOne.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;

    // Check if supplier has any products
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    if (supplier._count.products > 0) {
      throw new ValidationError(
        'Cannot delete supplier with existing products. Please reassign or delete the products first.'
      );
    }

    // Delete supplier
    await prisma.supplier.delete({
      where: { id }
    });

    res.status(204).send();
  });

  static getProductsBySupplier = asyncHandler(
    async (req: Request, res: Response) => {
      const validationResult = supplierSchemas.getOne.safeParse(req);
      if (!validationResult.success) {
        throw new ValidationError(validationResult.error.message);
      }

      const { id } = validationResult.data.params;
      const { page = '1', limit = '10' } = req.query as {
        page?: string;
        limit?: string;
      };

      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      // Check if supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id }
      });

      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }

      // Get products for supplier with pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: { supplierId: id },
          skip,
          take: limitNumber,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true
          }
        }),
        prisma.product.count({
          where: { supplierId: id }
        })
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
    }
  );

  static getSupplierStats = asyncHandler(
    async (req: Request, res: Response) => {
      const validationResult = supplierSchemas.getOne.safeParse(req);
      if (!validationResult.success) {
        throw new ValidationError(validationResult.error.message);
      }

      const { id } = validationResult.data.params;

      // Check if supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id }
      });

      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }

      // Get various statistics about the supplier's products
      const stats = await prisma.product.aggregate({
        where: { supplierId: id },
        _count: {
          _all: true // Total number of products
        },
        _sum: {
          quantity: true // Total quantity of all products
        },
        _avg: {
          price: true, // Average price of products
          costPrice: true // Average cost price
        }
      });

      // Get count of low stock products
      const lowStockCount = await prisma.product.count({
        where: {
          supplierId: id,
          quantity: {
            lte: prisma.product.fields.reorderPoint
          }
        }
      });

      // Get count of products by status
      const productsByStatus = await prisma.product.groupBy({
        by: ['status'],
        where: { supplierId: id },
        _count: {
          status: true
        }
      });

      res.json({
        totalProducts: stats._count._all,
        totalQuantity: stats._sum.quantity || 0,
        averagePrice: stats._avg.price || 0,
        averageCostPrice: stats._avg.costPrice || 0,
        lowStockProducts: lowStockCount,
        productsByStatus: productsByStatus.reduce(
          (acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
          },
          {} as Record<string, number>
        )
      });
    }
  );
}
