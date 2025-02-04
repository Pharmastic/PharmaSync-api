import express from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { productSchemas } from '../schemas/product.schemas';
import { AuthMiddleware } from '../middleware/auth.middleware';
import passport from 'passport';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductCreate:
 *       type: object
 *       required:
 *         - name
 *         - manufacturer
 *         - sku
 *         - price
 *         - costPrice
 *         - categoryId
 *         - supplierId
 *         - dosageForm
 *       properties:
 *         name:
 *           type: string
 *           description: Product name
 *         genericName:
 *           type: string
 *           description: Generic name of the medicine
 *         manufacturer:
 *           type: string
 *           description: Manufacturer name
 *         description:
 *           type: string
 *           description: Product description
 *         barcode:
 *           type: string
 *           description: Product barcode (must be unique)
 *         sku:
 *           type: string
 *           description: Stock keeping unit (must be unique)
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Selling price
 *         costPrice:
 *           type: number
 *           minimum: 0
 *           description: Purchase price
 *         quantity:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           description: Current stock quantity
 *         reorderPoint:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *           description: Minimum quantity before reorder alert
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: Product expiry date
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Category ID
 *         supplierId:
 *           type: string
 *           format: uuid
 *           description: Supplier ID
 *         batchNumber:
 *           type: string
 *           description: Manufacturing batch number
 *         dosageForm:
 *           type: string
 *           enum: [TABLET, CAPSULE, LIQUID, INJECTION, CREAM, OINTMENT, DROPS, INHALER, POWDER, OTHER]
 *           description: Form of the medicine
 *         strength:
 *           type: string
 *           description: Medicine strength/concentration
 *         storage:
 *           type: string
 *           description: Storage requirements
 *         prescriptionRequired:
 *           type: boolean
 *           default: false
 *           description: Whether prescription is required
 */

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Product with this SKU or barcode already exists
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isPharmacist,
  validate(productSchemas.create),
  ProductController.create
);

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products with filtering and pagination
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
 *         description: Search in name, generic name, or SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, DISCONTINUED, OUT_OF_STOCK, EXPIRED]
 *         description: Filter by product status
 *       - in: query
 *         name: expiringBefore
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter products expiring before this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, quantity, price]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of products with pagination
 */
router.get('/', validate(productSchemas.getAll), ProductController.getAll);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details with related data
 *       404:
 *         description: Product not found
 */
router.get('/:id', validate(productSchemas.getOne), ProductController.getOne);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product with this SKU or barcode already exists
 */
router.put(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isPharmacist,
  validate(productSchemas.update),
  ProductController.update
);

/**
 * @swagger
 * /products/{id}/stock:
 *   put:
 *     tags: [Products]
 *     summary: Update product stock
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - type
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to add or remove
 *               type:
 *                 type: string
 *                 enum: [PURCHASE, SALE, ADJUSTMENT, RETURN, EXPIRED, DAMAGED]
 *                 description: Type of stock movement
 *               reason:
 *                 type: string
 *                 description: Reason for stock adjustment
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: Product not found
 */
router.put(
  '/:id/stock',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isPharmacist,
  validate(productSchemas.updateStock),
  ProductController.updateStock
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isManagerOrAdmin,
  validate(productSchemas.getOne),
  ProductController.delete
);

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: Get products with stock below reorder point
 *     responses:
 *       200:
 *         description: List of products with low stock
 */
router.get('/low-stock', ProductController.getLowStock);

/**
 * @swagger
 * /products/expiring:
 *   get:
 *     tags: [Products]
 *     summary: Get products expiring within 30 days
 *     responses:
 *       200:
 *         description: List of products expiring soon
 */
router.get('/expiring', ProductController.getExpiring);

export default router;
