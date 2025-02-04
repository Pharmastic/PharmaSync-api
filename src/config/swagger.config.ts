// src/config/swagger.config.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

interface JsonSchemaProperty {
  type?: string;
  items?: {
    $ref?: string;
    type?: string;
    format?: string;
  };
  $ref?: string;
  format?: string;
  enum?: string[];
  properties?: Record<string, JsonSchemaProperty>;
  description?: string;
}

interface JsonSchemaDefinition {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
}

interface JsonSchema {
  definitions: Record<string, JsonSchemaDefinition>;
}

// Read the generated JSON schema
const schemaPath = join(
  __dirname,
  '../../prisma/json-schemas/json-schema.json'
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as JsonSchema;

// Convert Prisma-generated schemas to Swagger format
const convertedSchemas = Object.entries(schema.definitions).reduce<
  Record<string, JsonSchemaDefinition>
>((acc, [key, value]) => {
  acc[key] = {
    ...value,
    properties: Object.entries(value.properties).reduce<
      Record<string, JsonSchemaProperty>
    >((props, [propKey, propValue]) => {
      // Handle array types with circular references
      if (propValue.type === 'array' && propValue.items?.$ref) {
        props[propKey] = {
          type: 'array',
          items: {
            type: 'string',
            format: 'uuid'
          }
        };
      }
      // Handle direct circular references
      else if (propValue.$ref) {
        props[propKey] = {
          type: 'string',
          format: 'uuid'
        };
      } else {
        props[propKey] = propValue;
      }
      return props;
    }, {})
  };
  return acc;
}, {});

let url: string;
if (process.env.ENV === 'dev') {
  url = 'http://localhost:5000/api/v1';
} else if (process.env.ENV === 'production') {
  url = 'https://pharmasync-api-production.up.railway.app/api/v1';
} else {
  url = 'http://localhost:5000/api/v1'; // default fallback
}

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'PharmaSync API',
    version: '1.0.0',
    description: `
API documentation for PharmaSync App.

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
    schemas: {
      ...convertedSchemas,
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Detailed error message'
                }
              }
            }
          }
        }
      }
    },
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
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      ApiKeyAuth: [],
      bearerAuth: []
    }
  ]
} as const;

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: ['./src/routes/**/*.ts'] // Path to your route files
};

const swaggerSpec = swaggerJsdoc(options);

// Custom Swagger UI options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
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
