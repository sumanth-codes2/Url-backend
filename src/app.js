import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { configureSecurity, apiLimiter, redirectLimiter, xssSanitize } from './shared/middleware/security.js';
import logger from './shared/logger/logger.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import urlRoutes from './routes/urlRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import swaggerRoutes from './routes/swaggerRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';

import { ServiceRegistry } from './services/serviceRegistry.js';
import { 
  AnalyticsAIService, 
  MarketingAIService, 
  SecurityAIService, 
  WebsiteIntelligenceService, 
  PredictionAIService, 
  RecommendationAIService,
  NotificationService,
  AnalyticsService
} from './services/ai/orchestrator/specializedAiServices.js';
import { RoutingContext } from './services/ai/routing/routingStrategy.js';
import { EmailService } from './services/email/emailService.js';

ServiceRegistry.register('AnalyticsAIService', new AnalyticsAIService());
ServiceRegistry.register('MarketingAIService', new MarketingAIService());
ServiceRegistry.register('SecurityAIService', new SecurityAIService());
ServiceRegistry.register('WebsiteIntelligenceService', new WebsiteIntelligenceService());
ServiceRegistry.register('PredictionAIService', new PredictionAIService());
ServiceRegistry.register('RecommendationAIService', new RecommendationAIService());
ServiceRegistry.register('NotificationService', new NotificationService());
ServiceRegistry.register('AnalyticsService', new AnalyticsService());
ServiceRegistry.register('RoutingContext', new RoutingContext());
ServiceRegistry.register('EmailService', new EmailService());

const app = express();

app.set('trust proxy', 1);

app.use(compression());
app.use(cookieParser());

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const status = dbStatus === 'connected' ? 'healthy' : 'unhealthy';
  
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      database: dbStatus
    },
    system: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  });
});

configureSecurity(app);

app.use(xssSanitize);

app.use('/api-docs', swaggerRoutes);

app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/workspaces', apiLimiter, workspaceRoutes);
app.use('/api/urls', apiLimiter, urlRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

app.use('/', redirectLimiter, redirectRoutes);

app.use(errorHandler);

export default app;
