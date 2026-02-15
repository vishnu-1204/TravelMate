import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { initDatabase } from "./db";
import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/booking";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/booking", bookingRoutes);

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
      console.log(`  POST /api/booking/confirmation-email\n`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
