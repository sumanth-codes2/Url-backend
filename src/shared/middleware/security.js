import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from '../config/env.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.', errors: [] }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.', errors: [] }
});

export const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many link redirects requested. Calm down!', errors: [] }
});

export const xssSanitize = (req, res, next) => {
  const sanitize = (val) => {
    if (typeof val === 'string') {
      return val.replace(/<[^>]*>/g, '');
    }
    if (typeof val === 'object' && val !== null) {
      for (const k in val) {
        val[k] = sanitize(val[k]);
      }
    }
    return val;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  next();
};

export const configureSecurity = (app) => {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...env.ALLOWED_ORIGINS, "https://api.github.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    xFrameOptions: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  app.use(mongoSanitize());

  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    next();
  });
};
