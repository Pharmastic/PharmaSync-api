import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database_client';
import { asyncHandler } from '../utils/error_handler';
import { categorySchemas, CategoryCreate } from '../schemas/category.schemas';
import { ValidationError, NotFoundError } from '../utils/error_handler';

export class CategoryController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body against the create schema
    const validationResult = categorySchemas.create.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const categoryData: CategoryCreate = validationResult.data.body;

    // Check if category with same name exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: categoryData.name }
    });

    if (existingCategory) {
      throw new ValidationError('Category with this name already exists');
    }

    // Create category
    const category = await prisma.category.create({
      data: categoryData
    });

    res.status(201).json(category);
  });

  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = categorySchemas.getAll.safeParse(req);
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
    const where: Prisma.CategoryWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get categories with pagination
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
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
      prisma.category.count({ where })
    ]);

    res.json({
      data: categories,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = categorySchemas.getOne.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;

    const category = await prisma.category.findUnique({
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

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    res.json(category);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = categorySchemas.update.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;
    const updateData = validationResult.data.body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      throw new NotFoundError('Category not found');
    }

    // If name is being updated, check for duplicates
    if (updateData.name && updateData.name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findUnique({
        where: { name: updateData.name }
      });

      if (duplicateCategory) {
        throw new ValidationError('Category with this name already exists');
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData
    });

    res.json(updatedCategory);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const validationResult = categorySchemas.getOne.safeParse(req);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.message);
    }

    const { id } = validationResult.data.params;

    // Check if category has any products
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (category._count.products > 0) {
      throw new ValidationError(
        'Cannot delete category with existing products'
      );
    }

    await prisma.category.delete({
      where: { id }
    });

    res.status(204).send();
  });
}
