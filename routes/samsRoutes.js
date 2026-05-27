import express from "express";
import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Notice from "../models/Notice.js";
import Fee from "../models/Fee.js";
import Timetable from "../models/Timetable.js";
import Result from "../models/Result.js";
import Inquiry from "../models/Inquiry.js";
import ActivityLog from "../models/ActivityLog.js";
import Homework from "../models/Homework.js";
import StudyMaterial from "../models/StudyMaterial.js";
import { 
  sendNoticeBulkEmail, 
  sendHomeworkBulkEmail, 
  sendFeeReminderEmail, 
  sendExamAlertEmail 
} from "../utils/mailer.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import * as StudentAdminController from "../controllers/StudentAdminController.js";
import * as AttendanceAdminController from "../controllers/AttendanceAdminController.js";
import * as HomeworkAdminController from "../controllers/HomeworkAdminController.js";
import * as StudyMaterialAdminController from "../controllers/StudyMaterialAdminController.js";
import * as FeeAdminController from "../controllers/FeeAdminController.js";
import * as ResultAdminController from "../controllers/ResultAdminController.js";
import * as NoticeAdminController from "../controllers/NoticeAdminController.js";
import * as TimetableAdminController from "../controllers/TimetableAdminController.js";

const router = express.Router();

// Helper to save Base64 data as a physical file on the server and return static relative URL
const saveBase64File = (base64String, originalName) => {
  if (!base64String || !base64String.startsWith("data:")) {
    return base64String || "";
  }
  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64String;
    }
    const fileBuffer = Buffer.from(matches[2], 'base64');
    const ext = path.extname(originalName) || '.pdf';
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueName = `${baseName}_${Date.now()}${ext}`;
    
    // Ensure folder path exists
    const uploadsDir = "./uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    fs.writeFileSync(path.join(uploadsDir, uniqueName), fileBuffer);
    return `/uploads/${uniqueName}`;
  } catch (err) {
    console.error("⚠️ Failed to write base64 file to server:", err.message);
    return "";
  }
};

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

    // Fetch real homework assignments
    const homework = await Homework.find({
      classLevel: studentDetails.classLevel,
      batch: studentDetails.batch,
    }).sort({ dueDate: 1 });

    // Fetch real study materials notes/worksheets
    const studyMaterials = await StudyMaterial.find({
      classLevel: studentDetails.classLevel,
      $or: [{ batch: studentDetails.batch }, { batch: "All Batches" }, { batch: "" }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      student: studentDetails,
      attendance: attendanceLogs,
      notices,
      timetable,
      fees: feeBills,
      results: examResults,
      homework,
      studyMaterials,
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
  const { 
    name, email, phone, role, password, rollNumber, classLevel, batch, biometricId, parentEmail,
    dob, gender, bloodGroup, aadhaarNo, homeAddress, fatherName, fatherPhone, motherName, motherPhone,
    profilePhoto, status
  } = req.body;

  if (!name || !email || !phone || !role) {
    return res.status(400).json({ success: false, message: "Name, email, phone, and role indicators are required" });
  }

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: "An account with this email is already registered" });
    }

    let savedPhotoUrl = "";
    if (profilePhoto) {
      savedPhotoUrl = saveBase64File(profilePhoto, "profile.jpg");
    }

    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password || "12345678", salt);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone,
      role,
      password: hashedPassword,
      rollNumber,
      classLevel,
      batch,
      biometricId: biometricId || null,
      parentEmail: parentEmail ? parentEmail.toLowerCase() : "",
      dob: dob || "",
      gender: gender || "",
      bloodGroup: bloodGroup || "",
      aadhaarNo: aadhaarNo || "",
      homeAddress: homeAddress || "",
      fatherName: fatherName || "",
      fatherPhone: fatherPhone || "",
      motherName: motherName || "",
      motherPhone: motherPhone || "",
      profilePhoto: savedPhotoUrl,
      status: status || "Active"
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

    if (updates.profilePhoto && updates.profilePhoto.startsWith("data:")) {
      updates.profilePhoto = saveBase64File(updates.profilePhoto, "profile.jpg");
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== "") {
        if (key === "email" || key === "parentEmail") {
          user[key] = updates[key].toLowerCase();
        } else if (key === "password") {
          const salt = bcryptjs.genSaltSync(10);
          user.password = bcryptjs.hashSync(updates.password, salt);
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

// Student: Pay tuition invoice online
router.put("/fees/:id", protect, restrictTo("student"), async (req, res) => {
  const feeId = req.params.id;
  const { status, paymentMethod } = req.body;

  try {
    const feeInvoice = await Fee.findById(feeId);
    if (!feeInvoice) {
      return res.status(404).json({ success: false, message: "Invoice record not found" });
    }

    // Verify this student owns the fee record
    if (feeInvoice.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access forbidden: Unauthorized fee payment" });
    }

    feeInvoice.status = status || "Paid";
    if (feeInvoice.status === "Paid") {
      feeInvoice.paymentDate = new Date();
      feeInvoice.paymentMethod = paymentMethod || "UPI Checkout Portal";
    }

    await feeInvoice.save();

    const student = await User.findById(feeInvoice.studentId);
    if (student) {
      student.feeStatus = feeInvoice.status;
      await student.save();
    }

    // Audit Log Activity
    await new ActivityLog({ action: `Online payment submitted for fee invoice '${feeInvoice.invoiceId}' by '${student?.name}' via ${paymentMethod || "UPI"}` }).save();

    return res.status(200).json({ success: true, message: "Tuition fee invoice paid successfully via online checkout", fee: feeInvoice });
  } catch (error) {
    console.error("Student Payment Error:", error);
    return res.status(500).json({ success: false, message: "Internal failure occurred during online payment" });
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

    // Trigger SMTP email card
    if (student) {
      const resultsSummary = result.marks.map(m => `${m.subject}: ${m.obtained}/${m.max}`).join(", ");
      const emails = [student.email, student.parentEmail].filter(Boolean);
      if (emails.length > 0) {
        for (const email of emails) {
          try {
            await sendExamAlertEmail(email, student.name, examName, resultsSummary, result.percentage, result.grade);
          } catch (mailErr) {
            console.error("⚠️ Marks email dispatch failed:", mailErr.message);
          }
        }
      }
    }

    return res.status(201).json({ success: true, message: "Exam result sheet registered and email alerts dispatched successfully", result });
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

    // Fetch all students/parents and dispatch notice bulk emails
    try {
      const users = await User.find({ role: "student" });
      const emails = users.map(u => u.email).filter(Boolean);
      const parentEmails = users.map(u => u.parentEmail).filter(Boolean);
      const allEmails = [...new Set([...emails, ...parentEmails])];
      if (allEmails.length > 0) {
        await sendNoticeBulkEmail(allEmails, title, content);
      }
    } catch (mailErr) {
      console.error("⚠️ Notice bulk email dispatch failed:", mailErr.message);
    }

    return res.status(201).json({ success: true, message: "Notice bulletin broadcasted and email notifications dispatched", notice });
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

// ==========================================
// 📚 3. NEW HOMEWORK MANAGEMENT ENDPOINTS
// ==========================================

// Admin: Upload homework assignment
router.post("/admin/homework", protect, restrictTo("admin"), async (req, res) => {
  const { title, description, subject, classLevel, batch, dueDate, attachmentName, attachmentData, teacherName } = req.body;
  if (!title || !subject || !classLevel || !batch || !dueDate || !teacherName) {
    return res.status(400).json({ success: false, message: "Missing required homework parameters" });
  }
  try {
    const homework = new Homework({
      title,
      description: description || "",
      subject,
      classLevel: parseInt(classLevel),
      batch,
      dueDate,
      attachmentName: attachmentName || "",
      attachmentData: saveBase64File(attachmentData, attachmentName),
      teacherName,
    });
    await homework.save();

    await new ActivityLog({ action: `Uploaded homework assignment '${title}' for Std ${classLevel} (${batch})` }).save();

    // Fetch all students in this class level and batch to send them a bulk email
    try {
      const students = await User.find({ role: "student", classLevel: parseInt(classLevel), batch });
      const emails = students.map(s => s.email).filter(Boolean);
      const parentEmails = students.map(s => s.parentEmail).filter(Boolean);
      const allRecipients = [...new Set([...emails, ...parentEmails])];

      if (allRecipients.length > 0) {
        await sendHomeworkBulkEmail(allRecipients, title, subject, dueDate);
      }
    } catch (mailErr) {
      console.error("⚠️ Homework email dispatch failed:", mailErr.message);
    }

    return res.status(201).json({ success: true, message: "Homework assignment uploaded successfully", homework });
  } catch (err) {
    console.error("Homework Upload Error:", err);
    return res.status(500).json({ success: false, message: "Failed to upload homework assignment" });
  }
});

// Admin: Fetch all homework assignments
router.get("/admin/homework", protect, restrictTo("admin"), async (req, res) => {
  try {
    const homeworks = await Homework.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, homeworks });
  } catch (err) {
    console.error("Fetch Homeworks Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch homework assignments" });
  }
});

// Admin: Delete homework assignment
router.delete("/admin/homework/:id", protect, restrictTo("admin"), async (req, res) => {
  try {
    await Homework.findByIdAndDelete(req.params.id);
    await new ActivityLog({ action: `Deleted homework assignment ID: ${req.params.id}` }).save();
    return res.status(200).json({ success: true, message: "Homework assignment deleted successfully" });
  } catch (err) {
    console.error("Delete Homework Error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete homework assignment" });
  }
});

// ==========================================
// 📓 4. NEW STUDY MATERIAL MANAGEMENT ENDPOINTS
// ==========================================

// Admin: Upload study material
router.post("/admin/study-materials", protect, restrictTo("admin"), async (req, res) => {
  const { title, description, subject, classLevel, batch, materialType, attachmentName, attachmentData, pages, fileSize } = req.body;
  if (!title || !subject || !classLevel) {
    return res.status(400).json({ success: false, message: "Title, Subject and Class Level are required" });
  }
  try {
    const material = new StudyMaterial({
      title,
      description: description || "",
      subject,
      classLevel: parseInt(classLevel),
      batch: batch || "All Batches",
      materialType: materialType || "Notes",
      attachmentName: attachmentName || "",
      attachmentData: saveBase64File(attachmentData, attachmentName),
      pages: pages || "",
      fileSize: fileSize || "",
    });
    await material.save();

    await new ActivityLog({ action: `Uploaded study material notes '${title}' for Std ${classLevel}` }).save();
    return res.status(201).json({ success: true, message: "Study material notes uploaded successfully", material });
  } catch (err) {
    console.error("Study Material Upload Error:", err);
    return res.status(500).json({ success: false, message: "Failed to upload study material" });
  }
});

// Admin: Fetch all study materials
router.get("/admin/study-materials", protect, restrictTo("admin"), async (req, res) => {
  try {
    const materials = await StudyMaterial.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, materials });
  } catch (err) {
    console.error("Fetch Study Materials Error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch study materials" });
  }
});

// Admin: Delete study material
router.delete("/admin/study-materials/:id", protect, restrictTo("admin"), async (req, res) => {
  try {
    await StudyMaterial.findByIdAndDelete(req.params.id);
    await new ActivityLog({ action: `Deleted study material ID: ${req.params.id}` }).save();
    return res.status(200).json({ success: true, message: "Study material deleted successfully" });
  } catch (err) {
    console.error("Delete Study Material Error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete study material" });
  }
});

// ==========================================
// 🖊️ 5. NEW MANUAL ATTENDANCE MANAGEMENT ENDPOINTS
// ==========================================

// Admin: Mark attendance manually
router.post("/admin/attendance", protect, restrictTo("admin"), async (req, res) => {
  const { studentId, date, status, checkInTime, checkOutTime } = req.body;
  if (!studentId || !date || !status) {
    return res.status(400).json({ success: false, message: "Student, Date, and Status are required" });
  }
  try {
    let attendance = await Attendance.findOne({ studentId, date });
    if (attendance) {
      attendance.status = status;
      if (checkInTime) attendance.checkInTime = checkInTime;
      if (checkOutTime) attendance.checkOutTime = checkOutTime;
      attendance.method = "Manual";
      await attendance.save();
    } else {
      attendance = new Attendance({
        studentId,
        date,
        status,
        method: "Manual",
        checkInTime: checkInTime || "09:00 AM",
        checkOutTime: checkOutTime || "04:00 PM",
        deviceName: "Manual ERP Dashboard",
      });
      await attendance.save();
    }

    const student = await User.findById(studentId);
    await new ActivityLog({ action: `Manually marked attendance for '${student?.name}' as '${status}' on ${date}` }).save();
    return res.status(200).json({ success: true, message: "Attendance status saved successfully", attendance });
  } catch (err) {
    console.error("Manual Attendance Error:", err);
    return res.status(500).json({ success: false, message: "Failed to save attendance record" });
  }
});

// ==========================================
// 🪙 6. NEW TRANSACT FEE PAYMENT REMINDER ENDPOINT
// ==========================================

// Admin: Trigger transactional fee payment reminder email to parent and student
router.post("/admin/fees/remind/:id", protect, restrictTo("admin"), async (req, res) => {
  try {
    const feeInvoice = await Fee.findById(req.params.id);
    if (!feeInvoice) {
      return res.status(404).json({ success: false, message: "Invoice record not found" });
    }
    const student = await User.findById(feeInvoice.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Associated student not found" });
    }

    const emails = [student.email, student.parentEmail].filter(Boolean);
    if (emails.length > 0) {
      for (const email of emails) {
        try {
          await sendFeeReminderEmail(email, student.name, feeInvoice.invoiceId, feeInvoice.amount, feeInvoice.dueDate);
        } catch (mailErr) {
          console.error(`⚠️ Fee email alert failed for ${email}:`, mailErr.message);
        }
      }
    }

    await new ActivityLog({ action: `Sent fee invoice payment reminder for '${feeInvoice.invoiceId}' to student/parent` }).save();
    return res.status(200).json({ success: true, message: `Fee payment reminder sent successfully to student and parent` });
  } catch (err) {
    console.error("Fee Reminder Error:", err);
    return res.status(500).json({ success: false, message: "Failed to dispatch reminder notification email" });
  }
});

// ==========================================
// 👨‍🎓 ADMIN STUDENT MANAGEMENT
// ==========================================
router.post("/admin/students", protect, restrictTo("admin"), StudentAdminController.addStudent);
router.get("/admin/students", protect, restrictTo("admin"), StudentAdminController.getAllStudents);
router.get("/admin/students/:id", protect, restrictTo("admin"), StudentAdminController.getStudentById);
router.put("/admin/students/:id", protect, restrictTo("admin"), StudentAdminController.updateStudent);
router.delete("/admin/students/:id", protect, restrictTo("admin"), StudentAdminController.deleteStudent);
router.put("/admin/students/:id/deactivate", protect, restrictTo("admin"), StudentAdminController.deactivateStudent);
router.put("/admin/students/:id/activate", protect, restrictTo("admin"), StudentAdminController.activateStudent);
router.put("/admin/students/:id/reset-password", protect, restrictTo("admin"), StudentAdminController.resetStudentPassword);

// ==========================================
// 📊 ADMIN ATTENDANCE MANAGEMENT
// ==========================================
router.post("/admin/attendance/mark", protect, restrictTo("admin"), AttendanceAdminController.markAttendance);
router.get("/admin/attendance", protect, restrictTo("admin"), AttendanceAdminController.getAttendance);
router.get("/admin/attendance/daily-report", protect, restrictTo("admin"), AttendanceAdminController.getDailyReport);
router.get("/admin/attendance/monthly-report", protect, restrictTo("admin"), AttendanceAdminController.getMonthlyReport);
router.put("/admin/attendance/:id", protect, restrictTo("admin"), AttendanceAdminController.updateAttendance);
router.delete("/admin/attendance/:id", protect, restrictTo("admin"), AttendanceAdminController.deleteAttendance);

// ==========================================
// 📚 ADMIN HOMEWORK MANAGEMENT
// ==========================================
router.post("/admin/homework", protect, restrictTo("admin"), HomeworkAdminController.uploadHomework);
router.put("/admin/homework/:id", protect, restrictTo("admin"), HomeworkAdminController.updateHomework);
router.delete("/admin/homework/:id", protect, restrictTo("admin"), HomeworkAdminController.deleteHomework);
router.get("/homework", protect, HomeworkAdminController.getHomework);
router.get("/homework/:id", protect, HomeworkAdminController.getHomeworkById);

// ==========================================
// 📖 ADMIN STUDY MATERIAL MANAGEMENT
// ==========================================
router.post("/admin/studymaterial", protect, restrictTo("admin"), StudyMaterialAdminController.uploadStudyMaterial);
router.put("/admin/studymaterial/:id", protect, restrictTo("admin"), StudyMaterialAdminController.updateStudyMaterial);
router.delete("/admin/studymaterial/:id", protect, restrictTo("admin"), StudyMaterialAdminController.deleteStudyMaterial);
router.get("/studymaterial", protect, StudyMaterialAdminController.getStudyMaterial);
router.get("/studymaterial/:id", protect, StudyMaterialAdminController.getStudyMaterialById);

// ==========================================
// 💰 ADMIN FEE MANAGEMENT
// ==========================================
router.post("/admin/fees", protect, restrictTo("admin"), FeeAdminController.addFeeInvoice);
router.get("/admin/fees/pending", protect, restrictTo("admin"), FeeAdminController.getPendingDues);
router.get("/fees", protect, FeeAdminController.getFees);
router.get("/fees/summary/:studentId", protect, FeeAdminController.getFeeSummary);
router.put("/admin/fees/:id", protect, restrictTo("admin"), FeeAdminController.updateFeeStatus);
router.delete("/admin/fees/:id", protect, restrictTo("admin"), FeeAdminController.deleteFee);

// ==========================================
// 📝 ADMIN RESULT MANAGEMENT
// ==========================================
router.post("/admin/results", protect, restrictTo("admin"), ResultAdminController.uploadResults);
router.get("/admin/results/rankings/:examName", protect, restrictTo("admin"), ResultAdminController.getExamRankings);
router.get("/results", protect, ResultAdminController.getResults);
router.get("/results/performance/:studentId", protect, ResultAdminController.getPerformanceSummary);
router.put("/admin/results/:id", protect, restrictTo("admin"), ResultAdminController.updateResult);
router.delete("/admin/results/:id", protect, restrictTo("admin"), ResultAdminController.deleteResult);

// ==========================================
// 📢 ADMIN NOTICE MANAGEMENT
// ==========================================
router.post("/admin/notices", protect, restrictTo("admin"), NoticeAdminController.createNotice);
router.get("/admin/notices/:id/send-email", protect, restrictTo("admin"), NoticeAdminController.sendNoticeEmail);
router.put("/admin/notices/:id", protect, restrictTo("admin"), NoticeAdminController.updateNotice);
router.delete("/admin/notices/:id", protect, restrictTo("admin"), NoticeAdminController.deleteNotice);
router.get("/notices", protect, NoticeAdminController.getNotices);
router.get("/notices/latest", protect, NoticeAdminController.getLatestNotices);
router.get("/notices/:id", protect, NoticeAdminController.getNoticeById);

// ==========================================
// 🕐 ADMIN TIMETABLE MANAGEMENT
// ==========================================
router.post("/admin/timetable", protect, restrictTo("admin"), TimetableAdminController.createTimetableEntry);
router.post("/admin/timetable/bulk", protect, restrictTo("admin"), TimetableAdminController.bulkUploadTimetable);
router.get("/admin/timetable", protect, TimetableAdminController.getTimetable);
router.get("/timetable/weekly", protect, TimetableAdminController.getWeeklyTimetable);
router.get("/timetable", protect, TimetableAdminController.getTimetable);
router.get("/timetable/:id", protect, TimetableAdminController.getTimetableById);
router.put("/admin/timetable/:id", protect, restrictTo("admin"), TimetableAdminController.updateTimetableEntry);
router.delete("/admin/timetable/:id", protect, restrictTo("admin"), TimetableAdminController.deleteTimetableEntry);

export default router;
