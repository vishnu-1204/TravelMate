import fs from "fs";
import path from "path";

const logFile = path.resolve(__dirname, "../persistent_server.log");
export const logger = (msg: string, ...args: any[]) => {
  const formattedMsg = `[${new Date().toISOString()}] ${msg} ${args.map(a => JSON.stringify(a)).join(" ")}\n`;
  fs.appendFileSync(logFile, formattedMsg);
  console.log(msg, ...args);
};

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
import { refreshPackageCache } from "./modules/packages/service/packageService";

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
app.use("/api", testEmailRoutes);

// Health check
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
    
    let isActuallyListening = false;
    const tryListen = () => {
      if (isActuallyListening) return;

      setTimeout(() => {
        const net = require('net');
        const probe = net.createServer()
          .once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              logger(`⚠️ [PID ${process.pid}] Port ${config.port} probe: BUSY. Retrying in 2s...`);
              setTimeout(tryListen, 2000);
            } else {
              logger(`❌ [PID ${process.pid}] Port probe error:`, err);
            }
          })
          .once('listening', () => {
            probe.close(() => {
              logger(`✅ [PID ${process.pid}] Port ${config.port} probe: FREE. Binding Express...`);
              
              const server = app.listen(config.port, () => {
                isActuallyListening = true;
                logger(`🚀 [PID ${process.pid}] Server SUCCESS on http://localhost:${config.port}`);
              });

              server.on('error', (sErr: any) => {
                if (isActuallyListening) {
                  logger(`ℹ️ [PID ${process.pid}] Ignored transient error after success:`, sErr.code);
                  return;
                }
                logger(`❌ [PID ${process.pid}] Server error during bind:`, sErr.code);
                if (sErr.code === 'EADDRINUSE') {
                  setTimeout(tryListen, 2000);
                }
              });
            });
          })
          .listen(config.port);
      }, 500);
    };

    tryListen();

    if (config.packageRefreshIntervalMinutes > 0) {
      const intervalMs = config.packageRefreshIntervalMinutes * 60_000;
      setInterval(() => {
        refreshPackageCache().catch((error) => {
          logger(`Scheduled package refresh failed [PID ${process.pid}]:`, error);
        });
      }, intervalMs);
    }
  } catch (err: any) {
    logger(`CRITICAL: [PID ${process.pid}] System failure:`, err.message);
    process.exit(1);
  }
};

startServer();

export { startServer };
