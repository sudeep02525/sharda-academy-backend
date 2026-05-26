import express from "express";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Notice from "../models/Notice.js";
import Fee from "../models/Fee.js";
import Timetable from "../models/Timetable.js";
import Result from "../models/Result.js";
import Inquiry from "../models/Inquiry.js";
import ActivityLog from "../models/ActivityLog.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 📶 1. BIOMETRIC ATTENDANCE HARDWARE SYNC API
// ==========================================

router.post("/biometric-sync", async (req, res) => {
  const { biometricId, timestamp, deviceId } = req.body;

  if (!biometricId) {
    return res.status(400).json({ success: false, message: "Missing biometric card identifier (biometricId)" });
  }

  try {
    const student = await User.findOne({ biometricId, role: "student" });
    if (!student) {
      return res.status(404).json({ success: false, message: "No student mapped to this biometric ID" });
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();
    const dateStr = eventTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Determine status (check-in after 9:15 AM is Late)
    const hours = eventTime.getHours();
    const minutes = eventTime.getMinutes();
    let status = "Present";
    if (hours > 9 || (hours === 9 && minutes > 15)) {
      status = "Late";
    }

    let attendance = await Attendance.findOne({ studentId: student._id, date: dateStr });

    if (!attendance) {
      // First tap of the day = Check-In
      attendance = new Attendance({
        studentId: student._id,
        date: dateStr,
        status: status,
        method: "Biometric",
        checkInTime: timeStr,
        deviceName: deviceId || "Main Entrance Biometric Device",
      });
      await attendance.save();

      // Log event
      await new ActivityLog({ action: `Biometric Check-In recorded for '${student.name}' at ${timeStr}` }).save();

      console.log(`\n🔔 [SMS/EMAIL NOTIFICATION] Sent to parent (${student.parentEmail || "no-parent@sharda.com"}):`);
      console.log(`💬 "Dear Parent, your child ${student.name} checked in safely at Sharda Academy at ${timeStr}."\n`);

      return res.status(201).json({
        success: true,
        message: `Check-in recorded for student '${student.name}' at ${timeStr}`,
        type: "check-in",
        attendance,
      });
    } else {
      // Subsequent tap of the day = Check-Out
      attendance.checkOutTime = timeStr;
      await attendance.save();

      // Log event
      await new ActivityLog({ action: `Biometric Check-Out recorded for '${student.name}' at ${timeStr}` }).save();

      console.log(`\n🔔 [SMS/EMAIL NOTIFICATION] Sent to parent (${student.parentEmail || "no-parent@sharda.com"}):`);
      console.log(`💬 "Dear Parent, your child ${student.name} checked out safely from Sharda Academy at ${timeStr}."\n`);

      return res.status(200).json({
        success: true,
        message: `Check-out recorded for student '${student.name}' at ${timeStr}`,
        type: "check-out",
        attendance,
      });
    }
  } catch (error) {
    console.error("Biometric Sync Error:", error);
    return res.status(500).json({ success: false, message: "Internal biometric syncing failure occurred" });
  }
});

// ==========================================
// 🛡️ 2. PORTALS GATEWAY INTERACTIVE APIS
// ==========================================

// --- STUDENT PORTAL ---
router.get("/student/dashboard", protect, restrictTo("student"), async (req, res) => {
  try {
    const studentId = req.user._id;

    // Fetch personal details
    const studentDetails = await User.findById(studentId).select("-password");

    // Fetch attendance log
    const attendanceLogs = await Attendance.find({ studentId }).sort({ date: -1 }).limit(30);

    // Fetch notices for Student role and General
    const notices = await Notice.find({ category: { $in: ["General", "Student"] } }).sort({ date: -1 }).limit(10);

    // Fetch timetable schedules
    const timetable = await Timetable.find({
      classLevel: studentDetails.classLevel,
      batch: studentDetails.batch,
    });

    // Fetch tuition bills
    const feeBills = await Fee.find({ studentId }).sort({ dueDate: -1 });

    // Fetch exam results
    const examResults = await Result.find({ studentId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      student: studentDetails,
      attendance: attendanceLogs,
      notices,
      timetable,
      fees: feeBills,
      results: examResults,
    });
  } catch (error) {
    console.error("Student Dashboard Fetch Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load student dashboard catalog" });
  }
});

// ==========================================
// 📥 3. PUBLIC ADMISSIONS INQUIRY WEBHOOK
// ==========================================
router.post("/admissions-inquiry", async (req, res) => {
  const { name, parentName, classLevel, phone, email } = req.body;

  if (!name || !parentName || !classLevel || !phone || !email) {
    return res.status(400).json({ success: false, message: "All admissions parameters are required" });
  }

  try {
    const inquiry = new Inquiry({
      name,
      parentName,
      classLevel,
      phone,
      email,
    });
    await inquiry.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Online Admission Inquiry submitted for student '${name}' (Std ${classLevel})` }).save();

    return res.status(201).json({
      success: true,
      message: "Online admission inquiry submitted successfully!",
      inquiry,
    });
  } catch (error) {
    console.error("Admissions Inquiry Error:", error);
    return res.status(500).json({ success: false, message: "Failed to log online admissions inquiry" });
  }
});

// --- ADMIN PORTAL CRITICAL METRICS & USER CONTROLS ---

// Admin: Analytics & Dashboards
router.get("/admin/analytics", protect, restrictTo("admin"), async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: "student" });
    const adminCount = await User.countDocuments({ role: "admin" });
    const inquiryCount = await Inquiry.countDocuments();

    // Fetch modern charts parameters
    const recentNotices = await Notice.find().sort({ date: -1 }).limit(10);
    const recentSyncLogs = await Attendance.find().populate("studentId", "name rollNumber classLevel").sort({ createdAt: -1 }).limit(30);

    const invoiceBills = await Fee.find().populate("studentId", "name rollNumber");
    const unpaidFees = invoiceBills.filter((bill) => bill.status === "Unpaid").reduce((sum, bill) => sum + bill.amount, 0);
    const paidFees = invoiceBills.filter((bill) => bill.status === "Paid").reduce((sum, bill) => sum + bill.amount, 0);

    const allUsers = await User.find().select("-password");

    // Fetch new CRM logs
    const admissionsInquiries = await Inquiry.find().sort({ createdAt: -1 });
    const activityAudits = await ActivityLog.find().sort({ createdAt: -1 }).limit(30);

    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers: usersCount,
        students: studentsCount,
        admins: adminCount,
        inquiries: inquiryCount,
        unpaidFees,
        paidFees,
      },
      notices: recentNotices,
      syncLogs: recentSyncLogs,
      usersList: allUsers,
      feesList: invoiceBills,
      inquiriesList: admissionsInquiries,
      activityLogs: activityAudits,
    });
  } catch (error) {
    console.error("Admin Analytics Fetch Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch master admin parameters" });
  }
});

// Admin: Register a Student or Admin
router.post("/admin/users", protect, restrictTo("admin"), async (req, res) => {
  const { name, email, phone, role, password, rollNumber, classLevel, batch, biometricId, parentEmail } = req.body;

  if (!name || !email || !phone || !role) {
    return res.status(400).json({ success: false, message: "Name, email, phone, and role indicators are required" });
  }

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: "An account with this email is already registered" });
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone,
      role,
      password: password || "",
      rollNumber,
      classLevel,
      batch,
      biometricId: biometricId || null,
      parentEmail: parentEmail ? parentEmail.toLowerCase() : "",
    });

    await newUser.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Registered new ${role} profile: '${name}'` }).save();

    return res.status(201).json({ success: true, message: `Account registered successfully for '${name}' as '${role}'`, user: newUser });
  } catch (error) {
    console.error("Register User Error:", error);
    return res.status(500).json({ success: false, message: "Internal failure creating user record" });
  }
});

// Admin: Modify/Update User details
router.put("/admin/users/:id", protect, restrictTo("admin"), async (req, res) => {
  const userId = req.params.id;
  const updates = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Target account not found" });
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== "") {
        if (key === "email" || key === "parentEmail") {
          user[key] = updates[key].toLowerCase();
        } else {
          user[key] = updates[key];
        }
      }
    });

    await user.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Modified student record for '${user.name}'` }).save();

    return res.status(200).json({ success: true, message: "Account record updated successfully", user });
  } catch (error) {
    console.error("Update User Error:", error);
    return res.status(500).json({ success: false, message: "Internal failure updating user details" });
  }
});

// Admin: Delete User account
router.delete("/admin/users/:id", protect, restrictTo("admin"), async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Target account not found" });
    }

    await User.findByIdAndDelete(userId);

    // Audit Log Activity
    await new ActivityLog({ action: `Deleted student record of '${user.name}'` }).save();

    return res.status(200).json({ success: true, message: `Account record for '${user.name}' has been deleted successfully` });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({ success: false, message: "Internal failure removing user record" });
  }
});

// Admin: Issue Tuition Fee Invoices
router.post("/admin/fees", protect, restrictTo("admin"), async (req, res) => {
  const { studentId, amount, dueDate, description } = req.body;

  if (!studentId || !amount || !dueDate) {
    return res.status(400).json({ success: false, message: "Student, fee Amount, and due Date parameters are required" });
  }

  try {
    const invoiceId = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const feeInvoice = new Fee({
      studentId,
      invoiceId,
      amount,
      dueDate,
      description: description || "Tuition & Coaching Fees",
      status: "Unpaid",
    });

    await feeInvoice.save();

    // Fetch student details
    const student = await User.findById(studentId);
    // Audit Log Activity
    await new ActivityLog({ action: `Issued invoice bill '${invoiceId}' (₹${amount}) to '${student?.name || "Candidate"}'` }).save();

    return res.status(201).json({ success: true, message: "Billing invoice issued successfully", fee: feeInvoice });
  } catch (error) {
    console.error("Issue Fee Error:", error);
    return res.status(500).json({ success: false, message: "Failed to issue invoice record" });
  }
});

// Admin: Mark Tuition invoices as Paid
router.put("/admin/fees/:id", protect, restrictTo("admin"), async (req, res) => {
  const feeId = req.params.id;
  const { status, paymentMethod } = req.body;

  try {
    const feeInvoice = await Fee.findById(feeId);
    if (!feeInvoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    feeInvoice.status = status || "Paid";
    if (feeInvoice.status === "Paid") {
      feeInvoice.paymentDate = new Date();
      feeInvoice.paymentMethod = paymentMethod || "Cash/UPI Sync Desk";
    } else {
      feeInvoice.paymentDate = null;
      feeInvoice.paymentMethod = "";
    }

    await feeInvoice.save();

    const student = await User.findById(feeInvoice.studentId);
    if (student) {
      student.feeStatus = feeInvoice.status;
      await student.save();
    }

    // Audit Log Activity
    await new ActivityLog({ action: `Collected invoice payment for '${feeInvoice.invoiceId}' from '${student?.name}' via ${paymentMethod || "Cash/UPI"}` }).save();

    return res.status(200).json({ success: true, message: `Invoice updated to status '${feeInvoice.status}' successfully`, fee: feeInvoice });
  } catch (error) {
    console.error("Update Fee Error:", error);
    return res.status(500).json({ success: false, message: "Failed to modify invoice status" });
  }
});

// Admin: Schedule Timetable routines
router.post("/admin/timetables", protect, restrictTo("admin"), async (req, res) => {
  const { classLevel, batch, subject, teacherName, day, startTime, endTime, room } = req.body;

  if (!classLevel || !batch || !subject || !teacherName || !day || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: "All scheduling parameters are required" });
  }

  try {
    const routine = new Timetable({
      classLevel,
      batch,
      subject,
      teacherName,
      day,
      startTime,
      endTime,
      room: room || "Coaching Classroom 1",
    });

    await routine.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Scheduled routine class '${subject}' for Std ${classLevel} (${batch}) on ${day}` }).save();

    return res.status(201).json({ success: true, message: "Class routine scheduled successfully", routine });
  } catch (error) {
    console.error("Schedule Timetable Error:", error);
    return res.status(500).json({ success: false, message: "Failed to schedule class routine" });
  }
});

// Admin: Upload Results
router.post("/admin/results", protect, restrictTo("admin"), async (req, res) => {
  const { studentId, examName, marks } = req.body;

  if (!studentId || !examName || !marks || marks.length === 0) {
    return res.status(400).json({ success: false, message: "Student, Exam name, and Marks array are required" });
  }

  try {
    const result = new Result({
      studentId,
      examName,
      marks,
    });
    await result.save();

    const student = await User.findById(studentId);
    // Audit Log Activity
    await new ActivityLog({ action: `Uploaded exam scores sheet of '${examName}' for '${student?.name}'` }).save();

    return res.status(201).json({ success: true, message: "Exam result sheet registered successfully", result });
  } catch (error) {
    console.error("Result Upload Error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit marks result record" });
  }
});

// Admin: Broadcast Notices
router.post("/admin/notices", protect, restrictTo("admin"), async (req, res) => {
  const { title, content, category } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: "Title and Content are required" });
  }

  try {
    const notice = new Notice({
      title,
      content,
      category: category || "General",
      author: "Academy Director",
    });
    await notice.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Broadcasted general alert bulletin: '${title}'` }).save();

    return res.status(201).json({ success: true, message: "Notice bulletin broadcasted successfully", notice });
  } catch (error) {
    console.error("Notice Upload Error:", error);
    return res.status(500).json({ success: false, message: "Failed to broadcast notice message" });
  }
});

// Admin: Approve Online Admission Inquiry
router.put("/admin/admissions/:id", protect, restrictTo("admin"), async (req, res) => {
  const inquiryId = req.params.id;
  const { status } = req.body;

  try {
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Admission inquiry not found" });
    }

    inquiry.status = status || "Approved";
    await inquiry.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Admissions status marked as '${inquiry.status}' for candidate '${inquiry.name}'` }).save();

    return res.status(200).json({
      success: true,
      message: `Inquiry status successfully updated to '${inquiry.status}'`,
      inquiry,
    });
  } catch (error) {
    console.error("Approve Admission Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update admissions inquiry status" });
  }
});

export default router;
