import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
dotenv.config({ path: envPath });

// Debug: Log environment loading
console.log("🔧 Loading environment from:", envPath);
console.log("🔧 NODE_ENV:", process.env.NODE_ENV);
console.log("🔧 PORT:", process.env.PORT);
console.log("🔧 Database URL available:", !!process.env.POSTGRES_URL);
console.log("🔧 Neon URL available:", !!process.env.NEON_DATABASE_URL);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./db/connection";
import { generalRateLimit } from "./middleware/rateLimiter";
import reportsRouter from "./routes/reports";
import categoriesRouter from "./routes/categories";
import locationsRouter from "./routes/locations";
import adminRouter from "./routes/admin";
import uploadRouter from "./routes/upload";

const app = express();

// Middleware
app.use(helmet());

// Configure CORS for production and development
const corsOptions = {
  origin: [
    // Production frontend URLs
    // Frontend URLS
    "https://fix-my-barangay-frontend.vercel.app",
    "https://fix-my-barangay-frontend-48dou3nw9-school-project.vercel.app",
    "https://fix-my-barangay-frontend-git-main-school-project.vercel.app",
    // Backend URLS
    "https://fix-my-barangay-backend.vercel.app",
    "https://fix-my-barangay-backend-bezhp7mtp-school-project.vercel.app",
    "https://fix-my-barangay-backend-git-main-school-project.vercel.app",
    // Development URLs (always allowed for local development)
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimit);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API routes
app.get("/api/v1", (req, res) => {
  res.json({ message: "Fix My Barangay API v1.0" });
});

app.use("/api/v1", reportsRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/locations", locationsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1", uploadRouter);

// 404 handler - must be last route handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database connection for serverless
const initializeDatabase = async () => {
  try {
    await connectDatabase();
    console.log("💾 Database ready");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
};

// Initialize database on first request
initializeDatabase();

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
  });
}

// Export for Vercel serverless functions
export default app;
