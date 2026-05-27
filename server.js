import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import samsRoutes from "./routes/samsRoutes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS requests for portal servers
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increase JSON body limit for files

// Ensure physical uploads folder exists
import fs from "fs";
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static("uploads"));

// Bind API endpoint routers
app.use("/api/auth", authRoutes);
app.use("/api/sams", samsRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Sharda Academy Management System (SAMS) Backend API Active",
    version: "1.0.0",
  });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sharda-academy";

console.log("Connecting to database: " + MONGODB_URI.split("@")[1] || MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ [DATABASE] MongoDB Connected successfully");
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 [SAMS SERVER] Service active and listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ [DATABASE] Connection failed:", err.message);
    process.exit(1);
  });
