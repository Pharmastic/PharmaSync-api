import express from 'express';
import { ProductController } from '../controllers/product.controller';
import passport from 'passport';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

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
 *             type: object
 *             required:
 *               - name
 *               - manufacturer
 *               - sku
 *               - price
 *               - costPrice
 *               - categoryId
 *               - supplierId
 *               - dosageForm
 *             properties:
 *               name:
 *                 type: string
 *               genericName:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               description:
 *                 type: string
 *               barcode:
 *                 type: string
 *               sku:
 *                 type: string
 *               price:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               reorderPoint:
 *                 type: integer
 *                 minimum: 0
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               batchNumber:
 *                 type: string
 *               dosageForm:
 *                 type: string
 *                 enum: [TABLET, CAPSULE, LIQUID, INJECTION, CREAM, OINTMENT, DROPS, INHALER, POWDER, OTHER]
 *               strength:
 *                 type: string
 *               storage:
 *                 type: string
 *               prescriptionRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isPharmacist,
  ProductController.create
);

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
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
 *         description: Search term for name, generic name, or SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', ProductController.getAll);

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
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', ProductController.getOne);

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
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isPharmacist,
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
 *               type:
 *                 type: string
 *                 enum: [PURCHASE, SALE, ADJUSTMENT, RETURN, EXPIRED, DAMAGED]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock updated successfully
 */
router.put(
  '/:id/stock',
  passport.authenticate('jwt', { session: false }),
  AuthMiddleware.isPharmacist,
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
  ProductController.delete
);

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: Get products with low stock
 *     responses:
 *       200:
 *         description: List of products with stock below reorder point
 */
router.get('/low-stock', ProductController.getLowStock);

/**
 * @swagger
 * /products/expiring:
 *   get:
 *     tags: [Products]
 *     summary: Get products expiring soon
 *     responses:
 *       200:
 *         description: List of products expiring within 30 days
 */
router.get('/expiring', ProductController.getExpiring);

export default router;
