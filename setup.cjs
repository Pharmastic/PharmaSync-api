const fs = require('fs');
const { execSync } = require('child_process')
const path = require('path');

// Function to create directories if they don't exist
function createDirectories(dirs) {
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

execSync('npm init -y');
execSync('npm install prompt-sync');

const prompt = require('prompt-sync')();


// Function to re-prompt if input is empty
function getInput(fieldName, defaultValue = '') {
  let input = '';
  while (!input) {
    if (defaultValue)
      input = prompt(`Enter ${fieldName} (default: ${defaultValue}): `);
    else
      input = prompt(`Enter ${fieldName}: `);
    if (!input && defaultValue) {
      input = defaultValue;
      console.log(`Using default value for ${fieldName}: ${input}`);
    }
  }
  return input;
}

// Prompt user for input with re-prompting if left empty
const PROJECT_NAME = getInput('project name');
const DB_NAME = getInput('base database name (will be used for prod, dev, and test)');
const DB_PORT = getInput('database port', '5432'); // Set default value for DB_PORT
const DB_USER = getInput('database user');
const DB_PASS = getInput('database password');
const DB_NAME_DEV = DB_NAME + '_dev';
const DB_NAME_TEST = DB_NAME + '_test';


// Initialize npm and install dependencies
execSync('npm install express dotenv cors');
execSync('npm install --save-dev nodemon eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser jest ts-jest @types/jest supertest @types/supertest @types/express @types/cors db-migrate-pg ts-node @types/pg ts-node-dev');

// Create folder structure (Cross-platform)
createDirectories([
  path.join('src', 'controllers'),
  path.join('src', 'routes'),
  path.join('src', 'models'),
  path.join('src', 'middleware'),
  path.join('src', 'tests')
]);

// Create starter files
fs.writeFileSync('src/index.ts', `
  import express, { Request, Response } from 'express';
  import dotenv from 'dotenv';
  import cors from 'cors';
  
  // Load environment variables from a .env file into process.env
  dotenv.config();
  
  // Create an instance of the Express application
  const app = express();
  
  // Define the port for the application to listen on
  const port = process.env.PORT || '5000';
  const address = \`localhost:\${port}\`;
  
  const apiVersion = '/api/v1';
  
  // Middleware to parse JSON request bodies
  app.use(express.json());
  
  // Middleware to enable Cross-Origin Resource Sharing (CORS)
  if (process.env.ENV == 'production') {
    console.log('production');
    app.use(
      cors({
        origin: ['https://your-production-url.com'], // Change this to your frontend url
        credentials: true,
        exposedHeaders: ['Content-Disposition'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );
  } else {
    console.log('dev');
    app.use(
      cors({
        exposedHeaders: ['Content-Disposition'],
      })
    );
  }
  
  // Route handler for the root path
  app.get('/', function (req: Request, res: Response) {
    res.send('${PROJECT_NAME}');
  });
  
  // Start the server and listen for incoming requests
  export const server = app.listen(port, () => {
    console.log(\`Starting app on: \${address}\`);
  });
  
  // Export the app instance for testing or other use
  export default app;
  `);
// Create tsconfig.json
fs.writeFileSync('tsconfig.json', JSON.stringify({

  compilerOptions: {
    target: "es2020",
    module: "commonjs",
    lib: ["ES2020", "DOM"],
    outDir: "./dist",
    strict: true,
    noImplicitAny: true,
    typeRoots: ["./types", "node_modules"],
    moduleResolution: "node",
    sourceMap: true,
    strictFunctionTypes: true,
    strictNullChecks: true,
    noImplicitThis: true,
    types: ["jest"],
    esModuleInterop: true
  },
  include: ["src/**/*.ts", "tests/**/*.ts"],
  ["ts- node"]: {
    transpileOnly: true,
    files: true
  },
  exclude: ["node_modules", "./coverage", "./dist"]
}, null, 2));

// Create .env file
fs.writeFileSync('.env', `
  DB_HOST_PROD=localhost
  DB_NAME_PROD=${DB_NAME}
  DB_PORT_PROD=${DB_PORT}
  DB_USER_PROD=${DB_USER}
  DB_PASS_PROD=${DB_PASS}
  
  DB_HOST_DEV=localhost
  DB_NAME_DEV=${DB_NAME_DEV}
  DB_PORT_DEV=${DB_PORT}
  DB_USER_DEV=${DB_USER}
  DB_PASS_DEV=${DB_PASS}
  
  DB_HOST_TEST=localhost
  DB_NAME_TEST=doctor_visit_test
  DB_PORT_TEST=${DB_PORT}
  DB_USER_TEST=${DB_USER}
  DB_PASS_TEST=${DB_PASS}
  PORT=5000
  ENV=dev
  `);

// Setup ESLint and Prettier
fs.writeFileSync('.eslintrc.json', JSON.stringify({
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["prettier"],
  extends: ["eslint:recommended", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "no-use-before-define": ["error", { "functions": true, "classes": true }],
    "no-var": "error",
    "prefer-const": "error"
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  env: {
    node: true,
    es6: true
  }
}, null, 2));

// Create .prettierrc file
fs.writeFileSync('.prettierrc', JSON.stringify({
  semi: true,
  trailingComma: "none",
  singleQuote: true,
  printWidth: 80
}, null, 2));

// Create database configuration with dev, test, and production
fs.writeFileSync('database.json', JSON.stringify({
  prod: {
    driver: "pg",
    host: { "ENV": "DB_HOST_PROD" },
    database: { "ENV": "DB_NAME_PROD" },
    user: { "ENV": "DB_USER_PROD" },
    password: { "ENV": "DB_PASS_PROD" },
    port: { "ENV": "DB_PORT_PROD" }
  },
  dev: {
    driver: "pg",
    host: { "ENV": "DB_HOST_DEV" },
    database: { "ENV": "DB_NAME_DEV" },
    user: { "ENV": "DB_USER_DEV" },
    password: { "ENV": "DB_PASS_DEV" },
    port: { "ENV": "DB_PORT_DEV" }
  },
  test: {
    driver: "pg",
    host: { "ENV": "DB_HOST_TEST" },
    database: { "ENV": "DB_NAME_TEST" },
    user: { "ENV": "DB_USER_TEST" },
    password: { "ENV": "DB_PASS_TEST" },
    port: { "ENV": "DB_PORT_TEST" }
  }
}, null, 2));

fs.writeFileSync('src/tests/index.test.ts', `
  import { describe, expect, afterAll, it } from '@jest/globals';
  import request from 'supertest';
  import app, { server } from '../index';  // Adjust the import path according to your actual setup
  
  describe("GET API '/'", () => {
    it('should return "${PROJECT_NAME}"', async () => {
      const res = await request(app)
        .get('/')
        .expect(200);
      expect(res.text).toBe('${PROJECT_NAME}');
    });
  
    afterAll((done) => {
      server.close(done);
    });
  });
  `);

fs.writeFileSync('src/database.ts', `
  import dotenv from 'dotenv';
  import { Pool } from 'pg';

  dotenv.config();

  // Destructure required environment variables for PostgreSQL connection
  const {
   DB_HOST_PROD,
   DB_NAME_PROD,
   DB_USER_PROD,
   DB_PASS_PROD,
   DB_PORT_PROD,
   DB_HOST_DEV,
   DB_NAME_DEV,
   DB_USER_DEV,
   DB_PASS_DEV,
   DB_PORT_DEV,
   DB_HOST_TEST,
   DB_NAME_TEST,
   DB_USER_TEST,
   DB_PASS_TEST,
   DB_PORT_TEST,
   ENV
  } = process.env;

  // Create a new Pool instance for managing PostgreSQL connections
  // Default configuration is empty and will be overwritten based on environment
  export let sqlClient = new Pool({
    host: '',
    port: 5432,
    database: '',
    user: '',
    password: '',
  });

  // Configure the Pool based on the environment
  // Development environment
  if (ENV == 'dev') {
    sqlClient = new Pool({
      host: DB_HOST_DEV,
      port: Number(DB_PORT_DEV) | 5432,
      database: DB_NAME_DEV,
      user: DB_USER_DEV,
      password: DB_PASS_DEV,
    });
  }

  // Test environment
  if (ENV == 'test') {
    sqlClient = new Pool({
      host: DB_HOST_TEST,
      port: Number(DB_PORT_TEST) | 5432,
      database: DB_NAME_TEST,
      user: DB_USER_TEST,
      password: DB_PASS_TEST,
    });
  }

  // Production environment
  if (ENV == 'production') {
    sqlClient = new Pool({
      host: DB_HOST_PROD,
      port: Number(DB_PORT_PROD),
      database: DB_NAME_PROD,
      user: DB_USER_PROD,
      password: DB_PASS_PROD,
    });
}
  `)

// Create jest.config.ts
fs.writeFileSync('jest.config.ts', `
  import type { Config } from '@jest/types';
  
  const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
    testMatch: ['**/src/**/*.test.ts'],
  };
  
  export default config;
  `);

// Create typedoc.json
fs.writeFileSync('typedoc.json', JSON.stringify({
  entryPoints: ["src/index.ts"],
  out: "docs",
  exclude: ["**/node_modules/**", "**/test/**"]
}, null, 2));

// Create eslint.config.mjs
fs.writeFileSync('eslint.config.mjs', `
  import prettier from 'eslint-plugin-prettier';
  import typescriptEslint from '@typescript-eslint/eslint-plugin';
  import globals from 'globals';
  import tsParser from '@typescript-eslint/parser';
  import path from 'node:path';
  import { fileURLToPath } from 'node:url';
  import js from '@eslint/js';
  import { FlatCompat } from '@eslint/eslintrc';
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
  });

  export default [
    ...compat.extends(
      'eslint:recommended',
      'prettier',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended'
    ),
    {
      plugins: {
        prettier,
        '@typescript-eslint': typescriptEslint,
      },

      languageOptions: {
        globals: {
          ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: 'module',

        parserOptions: {
          project: './tsconfig.json',
        },
      },

      rules: {
        'prettier/prettier': 2,

        'no-use-before-define': [
          'error',
          {
            functions: true,
            classes: true,
          },
        ],

        'no-var': 'error',
        'prefer-const': 'error',
      },
    },
  ];
  `);

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.scripts = {
  start: "sleep 3 && node dist/index.js",
  dev: "ts-node-dev --respawn --transpile-only src/index.ts",
  build: "npx tsc",
  createdb: `db-migrate db:create ${DB_NAME}`,
  migrate: "db-migrate up",
  watch: "tsc-watch --onSuccess \"node ./dist/server.js\"",
  jest: "jest --coverage",
  test: `set ENV=test&& db-migrate db:drop ${DB_NAME_TEST} && db-migrate db:create ${DB_NAME_TEST} && db-migrate --env test up && npm run build && npm run jest && db-migrate db:drop ${DB_NAME_TEST}`,
  ['test:coverage']: "npm run build && npx nyc --reporter=html --reporter=text --check-coverage npm run test",
  lint: "eslint src/**/*.ts",
  prettier: "prettier --config .prettierrc --write src/**/*.ts"
};
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Log the database names
console.log(`\nDatabase Names:`);
console.log(`Production DB: ${DB_NAME}`);
console.log(`Development DB: ${DB_NAME_DEV}`);
console.log(`Testing DB: ${DB_NAME_TEST}`);

console.log(`\nSetup complete! Navigate to ${PROJECT_NAME} and start coding.`);