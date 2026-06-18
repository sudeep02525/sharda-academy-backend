import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Fee from './models/Fee.js';
import User from './models/User.js';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      const student = await User.findOne({ role: "student" });
      console.log("Student:", student.name, student._id);
      
      const invoiceId = "INV-00002";
      const fee = await Fee.create({
        studentId: student._id,
        invoiceId,
        amount: 10000,
        dueDate: "2026-06-25",
        description: "hii",
        classStandard: student.classLevel,
        batch: student.batch,
        paymentMethod: "",
        generatedBy: null,
        status: "Unpaid",
      });
      console.log("Fee created:", fee);
    } catch(err) {
      console.error("Mongoose Error:", err.message);
    }
    process.exit(0);
  });
