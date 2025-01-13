import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerRouter from './routes/swagger';
import routes from './routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || '5000';
const ENV = process.env.ENV || 'dev';

let databaseUrl: string;

switch (ENV) {
  case 'production':
    databaseUrl = process.env.DATABASE_URL_PROD || '';
    break;
  case 'test':
    databaseUrl = process.env.DATABASE_URL_TEST || '';
    break;
  default:
    databaseUrl = process.env.DATABASE_URL_DEV || '';
}

process.env.DATABASE_URL = databaseUrl;

// Trust proxy - Add this before other middleware
app.set('trust proxy', 1);

// API Key middleware
const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'pharmasync-test-key-123';

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }

  next();
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware setup
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// CORS Configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
  })
);

// Public routes (no API key required)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('pharmasync-backend');
});

// Swagger documentation route (no authentication required)
app.use('/docs', swaggerRouter);

// Protected routes (API key required)
app.use('/', apiKeyAuth, routes);

// Error handling
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

export const server = app.listen(port, () => {
  if (ENV === 'dev') console.log(`Server running on port: ${port}`);
  console.log(`Environment: ${ENV || 'development'}`);
});

export default app;
