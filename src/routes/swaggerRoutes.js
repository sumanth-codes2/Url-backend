import express from 'express';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'BitylGlow API Documentation',
    version: '2.0.0',
    description: 'Enterprise URL Management & Redirection Analytics Platform'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development Server'
    }
  ],
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User successfully created' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful' }
        }
      }
    },
    '/api/urls/shorten': {
      post: {
        summary: 'Shorten a destination URL',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  originalUrl: { type: 'string' },
                  customCode: { type: 'string' },
                  title: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'URL successfully shortened' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument));

export default router;
export { swaggerDocument };
