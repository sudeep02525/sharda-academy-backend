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

console.log("Connecting to database for seeding: " + MONGODB_URI.split("@")[1] || MONGODB_URI);

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

    // 1. Create Student Accounts
    // Student A: Unactivated online account (no password set, to test Registration OTP activation)
    const student1 = new User({
      name: "Amit Sharma",
      email: "student@sharda.com",
      phone: "+91 8877665544",
      role: "student",
      rollNumber: "SA-2026-001",
      classLevel: 12,
      batch: "HSC Board Premium",
      biometricId: "RFID-9988-77",
      parentEmail: "parent@sharda.com",
      feeStatus: "Unpaid",
      password: "", // blank password means unactivated/unregistered online profile
    });
    await student1.save();

    // Student B: Already active profile (hashed password set, to test direct login)
    const student2 = new User({
      name: "Pooja Verma",
      email: "pooja@sharda.com",
      phone: "+91 7766554433",
      role: "student",
      rollNumber: "SA-2026-002",
      classLevel: 10,
      batch: "Batch A",
      biometricId: "RFID-1122-33",
      parentEmail: "parent@sharda.com",
      feeStatus: "Paid",
      password: bcryptjs.hashSync("student123", salt), // pre-activated account
    });
    await student2.save();
    console.log("👤 Student accounts seeded: student@sharda.com, pooja@sharda.com");

    // 2. Create Master Admin Account (with hashed password set)
    const admin = new User({
      name: "Director Sudeep Das",
      email: "sudeepdas2525@zohomail.in",
      phone: "+91 8888888888",
      role: "admin",
      password: bcryptjs.hashSync("Sudeep@00", salt), // hashed password
    });
    await admin.save();
    console.log("👤 Admin account seeded: sudeepdas2525@zohomail.in");

    // 3. Seed Daily Attendance Events (Biometric Logs)
    const attendanceEvents = [
      new Attendance({
        studentId: student1._id,
        date: "2026-05-20",
        status: "Present",
        method: "Biometric",
        checkInTime: "08:52 AM",
        checkOutTime: "04:12 PM",
        deviceName: "Main Front Gate Biometric",
      }),
      new Attendance({
        studentId: student1._id,
        date: "2026-05-21",
        status: "Late",
        method: "Biometric",
        checkInTime: "09:22 AM",
        checkOutTime: "04:05 PM",
        deviceName: "Main Front Gate Biometric",
      }),
      new Attendance({
        studentId: student1._id,
        date: "2026-05-22",
        status: "Present",
        method: "Biometric",
        checkInTime: "08:45 AM",
        checkOutTime: "04:10 PM",
        deviceName: "Main Front Gate Biometric",
      }),
      new Attendance({
        studentId: student2._id,
        date: "2026-05-21",
        status: "Present",
        method: "Biometric",
        checkInTime: "08:55 AM",
        checkOutTime: "04:02 PM",
        deviceName: "Main Front Gate Biometric",
      }),
      new Attendance({
        studentId: student2._id,
        date: "2026-05-22",
        status: "Present",
        method: "Biometric",
        checkInTime: "08:50 AM",
        checkOutTime: "04:00 PM",
        deviceName: "Main Front Gate Biometric",
      }),
    ];
    await Attendance.insertMany(attendanceEvents);
    console.log("📶 Attendance sync logs seeded");

    // 4. Seed Notice Bulletin Board
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

    // 5. Seed Tuition Fee Invoices
    const feeInvoices = [
      new Fee({
        studentId: student1._id,
        invoiceId: "INV-2026-901",
        description: "Coaching Tuition & Study Materials (Term 1)",
        amount: 15000,
        dueDate: "2026-06-15",
        status: "Unpaid",
      }),
      new Fee({
        studentId: student2._id,
        invoiceId: "INV-2026-902",
        description: "Class 10 Board Prep Coaching (Term 1)",
        amount: 8000,
        dueDate: "2026-05-30",
        status: "Paid",
        paymentDate: new Date("2026-05-18"),
        paymentMethod: "UPI (Paytm Sync)",
      }),
    ];
    await Fee.insertMany(feeInvoices);
    console.log("💳 Student fee invoices seeded");

    // 6. Seed Class Timetable routines
    const schedules = [
      new Timetable({
      classLevel: 12,
      batch: "HSC Board Premium",
      subject: "Mathematics",
      teacherName: "Prof. Sudeep Das",
      day: "Monday",
      startTime: "04:00 PM",
      endTime: "05:30 PM",
      room: "Premium Smart Hall 1",
    }),
    new Timetable({
      classLevel: 12,
      batch: "HSC Board Premium",
      subject: "Physics",
      teacherName: "Prof. Sudeep Das",
      day: "Wednesday",
      startTime: "04:00 PM",
      endTime: "05:30 PM",
      room: "Premium Smart Hall 1",
    }),
      new Timetable({
        classLevel: 10,
        batch: "Batch A",
        subject: "Mathematics",
        teacherName: "Prof. Sudeep Das",
        day: "Tuesday",
        startTime: "05:00 PM",
        endTime: "06:30 PM",
        room: "Coaching Lab A",
      }),
    ];
    await Timetable.insertMany(schedules);
    console.log("📅 Timetable class schedules seeded");

    // 7. Seed Exam Result marks sheets
    const results = [
      new Result({
      studentId: student1._id,
      examName: "HSC Board Phase-1 Evaluation Test",
      marks: [
        { subject: "Mathematics", obtained: 92, max: 100 },
        { subject: "Physics", obtained: 88, max: 100 },
        { subject: "Chemistry", obtained: 85, max: 100 },
      ],
    }),
      new Result({
        studentId: student2._id,
        examName: "Midterm Assessment Exam (Class 10)",
        marks: [
          { subject: "Mathematics", obtained: 85, max: 100 },
          { subject: "Science", obtained: 78, max: 100 },
          { subject: "English", obtained: 92, max: 100 },
        ],
      }),
    ];

    for (const r of results) {
      await r.save();
    }
    console.log("🏆 Student academic score sheets seeded");

    console.log("\n🚀 [SEED SUCCESS] Sharda Academy Sandbox populated successfully!");
    console.log("-----------------------------------------------------------------");
    console.log("🔑 Logins (Use Email + OTP login dispatch, code prints to console):");
    console.log("   - ADMIN: sudeepdas2525@zohomail.in (Pass: Sudeep@00)");
    console.log("   - STUDENT A (Register Flow): student@sharda.com (No password set yet!)");
    console.log("   - STUDENT B (Login Flow): pooja@sharda.com (Pass: student123)");
    console.log("-----------------------------------------------------------------\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Failed:", error);
    process.exit(1);
  }
};

seedDatabase();
