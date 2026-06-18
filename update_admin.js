import mongoose from "mongoose";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sharda-academy";

const updateAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      admin.email = "sharda.academyofficial@gmail.com";
      const salt = bcryptjs.genSaltSync(10);
      admin.password = bcryptjs.hashSync("Sudeep@00", salt);
      await admin.save();
      console.log("Admin credentials updated successfully in DB.");
    } else {
      console.log("No admin found in DB.");
    }
  } catch (error) {
    console.error("Error updating admin:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

updateAdmin();
