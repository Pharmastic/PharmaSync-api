import { Router } from 'express';
import authRouter from './auth.routes';

const apiVersion = '/api/v1';

const router = Router();

router.use(apiVersion + '/auth', authRouter);

export default router;
