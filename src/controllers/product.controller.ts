import { Request, Response } from 'express';
import { Prisma, LogType, ProductStatus } from '@prisma/client';
import prisma from '../config/database_client';
import { asyncHandler } from '../utils/error_handler';
import {
  productSchemas,
  ProductCreate,
  StockUpdate
} from '../schemas/product.schemas';
import {
  ValidationError,
  NotFoundError,
  ConflictError
} from '../utils/error_handler';

export class ProductController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body against the create schema
    const validationResult = productSchemas.create.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const productData: ProductCreate = validationResult.data.body;
    const userId = (req.user as { id: string }).id;

    // Check if product with same SKU or barcode exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: productData.sku },
          ...(productData.barcode ? [{ barcode: productData.barcode }] : [])
        ]
      }
    });

    if (existingProduct) {
      throw new ConflictError(
        'Product with this SKU or barcode already exists'
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        ...productData,
        createdById: userId
      },
      include: {
        category: true,
        supplier: true
      }
    });

    // Create initial inventory log if quantity > 0
    if (productData.quantity > 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          type: LogType.PURCHASE,
          quantity: productData.quantity,
          reason: 'Initial stock'
        }
      });
    }

    res.status(201).json(product);
  });

  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = productSchemas.getAll.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const {
      page = '1',
      limit = '10',
      search,
      category,
      status,
      expiringBefore,
      sortBy = 'createdAt',
      order = 'desc'
    } = validationResult.data.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause for filtering
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (status) {
      where.status = status;
    }

    if (expiringBefore) {
      where.expiryDate = {
        lte: new Date(expiringBefore)
      };
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: {
          [sortBy]: order
        },
        include: {
          category: true,
          supplier: true
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
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = productSchemas.getOne.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;

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
      throw new NotFoundError('Product not found');
    }

    res.json(product);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = productSchemas.update.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;
    const updateData = validationResult.data.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // If SKU or barcode is being updated, check for duplicates
    if (
      (updateData.sku && updateData.sku !== existingProduct.sku) ||
      (updateData.barcode && updateData.barcode !== existingProduct.barcode)
    ) {
      const duplicateProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: updateData.sku },
            ...(updateData.barcode ? [{ barcode: updateData.barcode }] : [])
          ],
          NOT: { id }
        }
      });

      if (duplicateProduct) {
        throw new ConflictError(
          'Product with this SKU or barcode already exists'
        );
      }
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        supplier: true
      }
    });

    res.json(updatedProduct);
  });

  static updateStock = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = productSchemas.updateStock.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;
    const stockData: StockUpdate = validationResult.data.body;

    const product = await prisma.$transaction(async (tx) => {
      const currentProduct = await tx.product.findUnique({
        where: { id }
      });

      if (!currentProduct) {
        throw new NotFoundError('Product not found');
      }

      // Calculate new quantity
      let newQuantity = currentProduct.quantity;
      switch (stockData.type) {
        case LogType.PURCHASE:
        case LogType.RETURN:
          newQuantity += stockData.quantity;
          break;
        case LogType.SALE:
        case LogType.ADJUSTMENT:
        case LogType.EXPIRED:
        case LogType.DAMAGED:
          newQuantity -= stockData.quantity;
          break;
      }

      if (newQuantity < 0) {
        throw new ValidationError('Insufficient stock');
      }

      // Update product quantity and status
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          quantity: newQuantity,
          status:
            newQuantity === 0
              ? ProductStatus.OUT_OF_STOCK
              : ProductStatus.ACTIVE
        }
      });

      // Create inventory log
      await tx.inventoryLog.create({
        data: {
          productId: id,
          type: stockData.type,
          quantity: stockData.quantity,
          reason: stockData.reason
        }
      });

      return updatedProduct;
    });

    res.json(product);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = productSchemas.getOne.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventoryLogs: true
      }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Delete product and related inventory logs
    await prisma.$transaction([
      prisma.inventoryLog.deleteMany({
        where: { productId: id }
      }),
      prisma.product.delete({
        where: { id }
      })
    ]);

    res.status(204).send();
  });

  static getLowStock = asyncHandler(async (_req: Request, res: Response) => {
    const products = await prisma.product.findMany({
      where: {
        quantity: {
          lte: prisma.product.fields.reorderPoint
        },
        status: ProductStatus.ACTIVE
      },
      include: {
        supplier: true
      },
      orderBy: {
        quantity: 'asc'
      }
    });

    res.json(products);
  });

  static getExpiring = asyncHandler(async (_req: Request, res: Response) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const products = await prisma.product.findMany({
      where: {
        AND: [
          {
            expiryDate: {
              lte: thirtyDaysFromNow,
              gte: new Date() // Only include products that haven't expired yet
            }
          },
          {
            status: ProductStatus.ACTIVE
          }
        ]
      },
      include: {
        category: true,
        supplier: true
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });

    res.json(products);
  });
}
