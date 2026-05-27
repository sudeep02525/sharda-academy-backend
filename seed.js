import mongoose from "mongoose";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import User from "./models/User.js";
import Attendance from "./models/Attendance.js";
import Notice from "./models/Notice.js";
import Fee from "./models/Fee.js";
import Timetable from "./models/Timetable.js";
import Result from "./models/Result.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sharda-academy";

console.log("Connecting to database for seeding: " + (MONGODB_URI.split("@")[1] || MONGODB_URI));

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing collections
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Notice.deleteMany({});
    await Fee.deleteMany({});
    await Timetable.deleteMany({});
    await Result.deleteMany({});
    console.log("🗑️ Cleared existing database records");

    const salt = bcryptjs.genSaltSync(10);

    // Create Master Admin Account (with hashed password set)
    const admin = new User({
      name: "Director Sudeep Das",
      email: "sudeepdas2525@zohomail.in",
      phone: "+91 8888888888",
      role: "admin",
      password: bcryptjs.hashSync("Sudeep@00", salt), // hashed password
    });
    await admin.save();
    console.log("👤 Admin account seeded: sudeepdas2525@zohomail.in");

    // Seed general Notice Bulletin Board
    const notices = [
      new Notice({
        title: "SSC & HSC Board Prep Crash Course registrations open!",
        content: "Specialized board exam preparation crash sessions led by top state board evaluators and senior lecturers are commencing from 1st June. Ensure your seat registrations are submitted to the admin office by 28th May. High-potential scholarships are available for topper students.",
        category: "General",
        author: "Director Sudeep Das",
      }),
      new Notice({
        title: "Biometric ID Cards Attendance Rules",
        content: "All students must tap their Biometric Smart ID Cards at the main entrance gate check-in point before 09:00 AM daily. Live check-in and check-out logs are automatically forwarded to parents' registered emails.",
        category: "Student",
        author: "Academy Admin Desk",
      }),
    ];
    await Notice.insertMany(notices);
    console.log("📢 Notice board announcements seeded");

    console.log("\n🚀 [SEED SUCCESS] Sharda Academy Sandbox populated successfully with Admin account!");
    console.log("-----------------------------------------------------------------");
    console.log("🔑 Logins:");
    console.log("   - ADMIN: sudeepdas2525@zohomail.in (Pass: Sudeep@00)");
    console.log("-----------------------------------------------------------------\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Failed:", error);
    process.exit(1);
  }
};

seedDatabase();
