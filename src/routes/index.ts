import { Router } from 'express';
import authRouter from './auth.routes';
import productRouter from './products.routes';

const apiVersion = '/api/v1';

const router = Router();

router.use(`${apiVersion}/auth`, authRouter);
router.use(`${apiVersion}/products`, productRouter);

export default router;
