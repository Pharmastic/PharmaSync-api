import express from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { validate } from '../middleware/validate';
import { supplierSchemas } from '../schemas/supplier.schemas';
import { AuthMiddleware } from '../middleware/auth.middleware';
import passport from 'passport';

const router = express.Router();

/**
 * @swagger
 * /suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a new supplier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Supplier name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Supplier email
 *               phone:
 *                 type: string
 *                 description: Supplier phone number
 *               address:
 *                 type: string
 *                 description: Supplier address
 *     responses:
 *       201:
 *         description: Supplier created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Supplier with this email already exists
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isManagerOrAdmin,
  validate(supplierSchemas.create),
  SupplierController.create
);

/**
 * @swagger
 * /suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get all suppliers
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or phone
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of suppliers with pagination
 */
router.get('/', validate(supplierSchemas.getAll), SupplierController.getAll);

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get a supplier by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier details with related products
 *       404:
 *         description: Supplier not found
 */
router.get('/:id', validate(supplierSchemas.getOne), SupplierController.getOne);

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     tags: [Suppliers]
 *     summary: Update a supplier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplier ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier updated successfully
 *       404:
 *         description: Supplier not found
 */
router.put(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isManagerOrAdmin,
  validate(supplierSchemas.update),
  SupplierController.update
);

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplier ID
 *     responses:
 *       204:
 *         description: Supplier deleted successfully
 *       404:
 *         description: Supplier not found
 *       400:
 *         description: Cannot delete supplier with existing products
 */
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isManagerOrAdmin,
  validate(supplierSchemas.getOne),
  SupplierController.delete
);

/**
 * @swagger
 * /suppliers/{id}/products:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get all products for a supplier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplier ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of products for the supplier with pagination
 *       404:
 *         description: Supplier not found
 */
router.get(
  '/:id/products',
  validate(supplierSchemas.getOne),
  SupplierController.getProductsBySupplier
);

/**
 * @swagger
 * /suppliers/{id}/stats:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get statistics for a supplier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Statistics for the supplier's products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProducts:
 *                   type: integer
 *                   description: Total number of products
 *                 totalQuantity:
 *                   type: integer
 *                   description: Total quantity of all products
 *                 averagePrice:
 *                   type: number
 *                   description: Average price of products
 *                 averageCostPrice:
 *                   type: number
 *                   description: Average cost price
 *                 lowStockProducts:
 *                   type: integer
 *                   description: Number of products below reorder point
 *                 productsByStatus:
 *                   type: object
 *                   description: Count of products by status
 *       404:
 *         description: Supplier not found
 */
router.get(
  '/:id/stats',
  validate(supplierSchemas.getOne),
  SupplierController.getSupplierStats
);

export default router;
