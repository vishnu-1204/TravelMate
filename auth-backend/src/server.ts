import fs from "fs";
import path from "path";

import { logger } from "./utils/logger";
// Remove internal logger definition
logger("DEBUG: server.ts is starting...");

// Global Error Handlers
process.on("unhandledRejection", (reason, promise) => {
  logger("CRITICAL: Unhandled Rejection at:", promise as any, "reason:", reason as any);
  // Optional: Graceful shutdown or report to monitoring
});

process.on("uncaughtException", (err) => {
  logger("CRITICAL: Uncaught Exception thrown:", err.message, err.stack as any);
  process.exit(1);
});

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { initDatabase } from "./db";
import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/booking";
import packagesRoutes from "./routes/packages";
import testEmailRoutes from "./routes/testEmail";
import reviewsRoutes from "./routes/reviews";
import contactRoutes from "./routes/contact";
import { refreshPackageCache } from "./modules/packages/service/packageService";
import { startEmailRecoveryTask } from "./utils/emailRecovery";

const app = express();

// Middleware
const allowedOrigins = [
  config.frontendUrl,
  config.backendUrl,
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use("/api/booking/razorpay-webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const packageRateLimiter = rateLimit({
  windowMs: config.packageRateLimitWindowMs,
  max: config.packageRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many package API requests. Please retry shortly." },
});

const authRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

// Routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/packages", packageRateLimiter, packagesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/contact", contactRoutes);
app.get("/", (req, res) => {
  res.json({ status: "🚀 Auth server running", timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  if ((global as any).__SERVER_STARTED__) return;
  (global as any).__SERVER_STARTED__ = true;
  
  logger(`[PID ${process.pid}] Starting server initialization (Port ${config.port})...`);
  
  try {
    await initDatabase();
    
    let currentPort = config.port;
    let attempts = 0;
    const maxAttempts = 5;

    const tryListen = () => {
      if (attempts >= maxAttempts) {
        logger(`❌ [PID ${process.pid}] Failed to find an available port after ${maxAttempts} attempts.`);
        process.exit(1);
      }

      const net = require('net');
      const probe = net.createServer()
        .once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            logger(`⚠️ [PID ${process.pid}] Port ${currentPort} is BUSY. Trying next port...`);
            currentPort++;
            attempts++;
            tryListen();
          } else {
            logger(`❌ [PID ${process.pid}] Port probe error:`, err);
          }
        })
        .once('listening', () => {
          probe.close(() => {
            logger(`✅ [PID ${process.pid}] Port ${currentPort} is FREE. Binding Express...`);
            
            const server = app.listen(currentPort, () => {
              logger(`🚀 [PID ${process.pid}] Server SUCCESS on http://localhost:${currentPort}`);
              // Update config if port changed so other parts of the app know the active port
              (config as any).activePort = currentPort;
            });

            server.on('error', (sErr: any) => {
              logger(`❌ [PID ${process.pid}] Server error during bind:`, sErr.code);
              if (sErr.code === 'EADDRINUSE') {
                currentPort++;
                attempts++;
                tryListen();
              }
            });
          });
        })
        .listen(currentPort);
    };

    tryListen();

    // Trigger initial package cache refresh
    refreshPackageCache().catch((error) => {
      logger(`Initial package refresh failed [PID ${process.pid}]:`, error);
    });

    if (config.packageRefreshIntervalMinutes > 0) {
      const intervalMs = config.packageRefreshIntervalMinutes * 60_000;
      setInterval(() => {
        refreshPackageCache().catch((error) => {
          logger(`Scheduled package refresh failed [PID ${process.pid}]:`, error);
        });
      }, intervalMs);
    }

    // Start background email recovery (every 15 mins)
    startEmailRecoveryTask();
  } catch (err: any) {
    logger(`CRITICAL: [PID ${process.pid}] System failure:`, err.message);
    process.exit(1);
  }
};

startServer();

export { startServer };
