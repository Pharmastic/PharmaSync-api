import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const router = Router();

let url;
if (process.env.ENV === 'dev') url = 'http://localhost:5000/api/v1';
else if (process.env.ENV === 'production')
  url = 'https://pharmasync-api-production.up.railway.app/api/v1';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'pharmasync API',
    version: '1.0.0',
    description: `
API documentation for pharmasync App.

## Authentication

All API endpoints require an API key to be sent in the request header.
- Header name: \`x-api-key\`
- Example value: \`pharmasync-test-key-123\` (for development)

To test the endpoints:
1. Click the 'Authorize' button at the top
2. Enter your API key in the value field
3. Click 'Authorize' to save
4. Your requests will now include the API key

This API uses Passport Authentication. There are two ways to authenticate:

1. **Register a new user:**
   - Use the \`/auth/register\` endpoint
   - Provide email and password
   - The response will include a JWT token

2. **Login existing user:**
   - Use the \`/auth/login\` endpoint
   - Provide email and password
   - The response will include a JWT token

3. **Using the token:**
   - Click the 'Authorize' button at the top
   - In the 'bearerAuth' section, enter your JWT token
   - Click 'Authorize' to save
   - All subsequent requests will include this token

Note: All protected endpoints require a valid JWT token.
    `
  },
  servers: [
    {
      url,
      description:
        process.env.ENV === 'production'
          ? 'Production server'
          : 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for accessing the server'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'P JWT token obtained from login/register'
      }
    },
    schemas: {
      AuthResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT token for authentication'
          },
          user: {
            type: 'object',
            properties: {
              uid: {
                type: 'string'
              },
              email: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  },
  security: [
    {
      ApiKeyAuth: [],
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Endpoints for user authentication'
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['*/routes/**/**.ts', '*/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

// Custom Swagger UI options
const swaggerUiOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true
  }
};

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

export default router;
