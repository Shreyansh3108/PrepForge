import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import kitRoutes from "./routes/kits";
import authRoutes from "./routes/auth.routes";
import { requireSession } from "./middleware/auth";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ 
  origin: "https://prepforge-psi.vercel.app", // Allow Next.js frontend
  credentials: true 
}));
app.use(express.json());

// Session Configuration (Core Requirement 1)
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-prepforge-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 1000 * 60 * 60 * 24 // 1 day 
  }
}));

// Mount Auth Routes (Public)
app.use("/api/auth", authRoutes);

// Mount Kit Routes (Protected by requireSession middleware)
app.use("/api/kits", requireSession, kitRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PrepForge API is running." });
});

// Database Connection & Server Start
const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/prepforge";

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log(" Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(` API Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(" MongoDB connection error:", err);
  });