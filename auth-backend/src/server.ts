import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { initDatabase } from "./db";
import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/booking";
import packagesRoutes from "./routes/packages";
import { refreshPackageCache } from "./modules/packages/service/packageService";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const packageRateLimiter = rateLimit({
  windowMs: config.packageRateLimitWindowMs,
  max: config.packageRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many package API requests. Please retry shortly." },
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/packages", packageRateLimiter, packagesRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "🚀 Auth server running", timestamp: new Date().toISOString() });
});

// Start server
initDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`\n🚀 Server running on http://localhost:${config.port}`);
      console.log(`📡 API Base: http://localhost:${config.port}/api/auth`);
      console.log(`\nEndpoints:`);
      console.log(`  POST /api/auth/register`);
      console.log(`  POST /api/auth/login`);
      console.log(`  GET  /api/auth/profile  (requires Bearer token)`);
      console.log(`  GET  /api/auth/users    (testing only)\n`);
      console.log(`  GET  /api/packages`);
      console.log(`  GET  /api/packages/:id\n`);
      console.log(`  POST /api/booking/confirmation-email\n`);
    });

    if (config.packageRefreshIntervalMinutes > 0) {
      const intervalMs = config.packageRefreshIntervalMinutes * 60_000;
      setInterval(() => {
        refreshPackageCache().catch((error) => {
          console.error("Scheduled package refresh failed:", error);
        });
      }, intervalMs);
    }
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
