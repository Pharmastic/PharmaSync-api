import { Router } from 'express';
import authRouter from './auth.routes';
import productRouter from './products.routes';
import categoryRouter from './category.routes';
import supplierRouter from './supplier.routes';

const apiVersion = '/api/v1';

const router = Router();

router.use(`${apiVersion}/auth`, authRouter);
router.use(`${apiVersion}/products`, productRouter);
router.use(`${apiVersion}/categories`, categoryRouter);
router.use(`${apiVersion}/suppliers`, supplierRouter);

export default router;
