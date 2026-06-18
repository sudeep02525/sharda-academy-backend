import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sharda-academy";

const updateAdminName = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      admin.name = "Admin";
      await admin.save();
      console.log("Admin name updated successfully in DB.");
    } else {
      console.log("No admin found in DB.");
    }
  } catch (error) {
    console.error("Error updating admin name:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

updateAdminName();
