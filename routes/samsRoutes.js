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
import { uploadProfilePhoto } from "../middleware/uploadMiddleware.js";
import * as StudentAdminController from "../controllers/StudentAdminController.js";

// Helper to delete old upload files safely from disk
const deleteUploadedFile = (filePath) => {
  if (!filePath) return;
  try {
    const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const absolutePath = path.resolve(normalizedPath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`Successfully deleted old file: ${absolutePath}`);
    }
  } catch (err) {
    console.error("Failed to delete file:", err.message);
  }
};
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

    // 1. Fetch personal details first (needed for classLevel filters)
    const studentDetails = await User.findById(studentId).select("-password");

    // 2. Run independent queries concurrently for faster dashboard load
    const [
      attendanceLogs,
      notices,
      timetable,
      feeBills,
      examResults,
      homework,
      studyMaterials
    ] = await Promise.all([
      Attendance.find({ studentId }).sort({ date: -1 }).limit(30),
      Notice.find({ category: { $in: ["General", "Student"] } }).sort({ date: -1 }).limit(10),
      Timetable.find({
        classLevel: studentDetails.classLevel,
        $or: [{ batch: studentDetails.batch }, { batch: "All Batches" }, { batch: "" }, { batch: "All" }],
      }),
      Fee.find({ studentId }).sort({ dueDate: -1 }),
      Result.find({ studentId }).sort({ createdAt: -1 }),
      Homework.find({
        classLevel: studentDetails.classLevel,
        $or: [{ batch: studentDetails.batch }, { batch: "All Batches" }, { batch: "" }, { batch: "All" }],
      }).sort({ dueDate: 1 }),
      StudyMaterial.find({
        classLevel: studentDetails.classLevel,
        $or: [{ batch: studentDetails.batch }, { batch: "All Batches" }, { batch: "" }, { batch: "All" }],
      }).sort({ createdAt: -1 })
    ]);

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

// Student: Change own password
router.post("/student/change-password", protect, restrictTo("student"), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current and new passwords are required" });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Student account not found" });
    }
    // Verify current password
    const isMatch = bcryptjs.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid current password" });
    }
    // Hash and save new password
    const salt = bcryptjs.genSaltSync(10);
    user.password = bcryptjs.hashSync(newPassword, salt);
    await user.save();
    
    await new ActivityLog({ action: `Student '${user.name}' changed their security password` }).save();
    return res.status(200).json({ success: true, message: "Your security password has been changed successfully!" });
  } catch (error) {
    console.error("Change Password Backend Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update password" });
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
    // Run admin queries concurrently
    const [
      usersCount,
      studentsCount,
      adminCount,
      inquiryCount,
      recentNotices,
      recentSyncLogs,
      invoiceBills,
      allUsers,
      admissionsInquiries,
      activityAudits
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "admin" }),
      Inquiry.countDocuments(),
      Notice.find().sort({ date: -1 }).limit(10),
      Attendance.find().populate("studentId", "name rollNumber classLevel").sort({ createdAt: -1 }).limit(30),
      Fee.find().populate("studentId", "name rollNumber"),
      User.find().select("-password"),
      Inquiry.find().sort({ createdAt: -1 }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(30)
    ]);

    const unpaidFees = invoiceBills.filter((bill) => bill.status === "Unpaid").reduce((sum, bill) => sum + bill.amount, 0);
    const paidFees = invoiceBills.filter((bill) => bill.status === "Paid").reduce((sum, bill) => sum + bill.amount, 0);

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
router.post("/admin/users", protect, restrictTo("admin"), uploadProfilePhoto, async (req, res) => {
  const { 
    name, email, phone, role, password, rollNumber, classLevel, batch, biometricId, parentEmail,
    dob, gender, bloodGroup, aadhaarNo, homeAddress, fatherName, fatherPhone, motherName, motherPhone,
    status
  } = req.body;

  if (!name || !email || !phone || !role) {
    if (req.file) {
      deleteUploadedFile(`/uploads/images/${req.file.filename}`);
    }
    return res.status(400).json({ success: false, message: "Name, email, phone, and role indicators are required" });
  }

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      if (req.file) {
        deleteUploadedFile(`/uploads/images/${req.file.filename}`);
      }
      return res.status(400).json({ success: false, message: "An account with this email is already registered" });
    }

    let savedPhotoUrl = "";
    let photoFilename = "";
    if (req.file) {
      savedPhotoUrl = `/uploads/images/${req.file.filename}`;
      photoFilename = req.file.filename;
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
      classLevel: classLevel ? parseInt(classLevel) : null,
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
      profilePhotoFilename: photoFilename,
      status: status || "Active"
    });

    await newUser.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Registered new ${role} profile: '${name}'` }).save();

    return res.status(201).json({ success: true, message: `Account registered successfully for '${name}' as '${role}'`, user: newUser });
  } catch (error) {
    if (req.file) {
      deleteUploadedFile(`/uploads/images/${req.file.filename}`);
    }
    console.error("Register User Error:", error);
    return res.status(500).json({ success: false, message: "Internal failure creating user record" });
  }
});

// Admin: Modify/Update User details
router.put("/admin/users/:id", protect, restrictTo("admin"), uploadProfilePhoto, async (req, res) => {
  const userId = req.params.id;
  const updates = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      if (req.file) {
        deleteUploadedFile(`/uploads/images/${req.file.filename}`);
      }
      return res.status(404).json({ success: false, message: "Target account not found" });
    }

    if (req.file) {
      if (user.profilePhoto) {
        deleteUploadedFile(user.profilePhoto);
      }
      user.profilePhoto = `/uploads/images/${req.file.filename}`;
      user.profilePhotoFilename = req.file.filename;
    } else if (updates.profilePhoto === "") {
      if (user.profilePhoto) {
        deleteUploadedFile(user.profilePhoto);
      }
      user.profilePhoto = "";
      user.profilePhotoFilename = "";
    }

    Object.keys(updates).forEach((key) => {
      // Skip profilePhoto since it is handled separately
      if (key === "profilePhoto") return;
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
    if (req.file) {
      deleteUploadedFile(`/uploads/images/${req.file.filename}`);
    }
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

// Admin: Issue Tuition Fee Invoices — handled by FeeAdminController below

// Admin: Mark Tuition invoices as Paid — handled by FeeAdminController below

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

// Admin: Schedule Timetable routines — handled by TimetableAdminController below

// Admin: Upload Results — handled by ResultAdminController below (supports bulk upload)

// Admin: Broadcast Notices — handled by NoticeAdminController below

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
// NOTE: Homework routes are handled by HomeworkAdminController below.

// ==========================================
// 📓 4. NEW STUDY MATERIAL MANAGEMENT ENDPOINTS
// ==========================================
// NOTE: Study material routes are handled by StudyMaterialAdminController below.

// ==========================================
// 🖊️ 5. NEW MANUAL ATTENDANCE MANAGEMENT ENDPOINTS
// ==========================================
// NOTE: Attendance routes are handled by AttendanceAdminController below.

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
router.post("/admin/students", protect, restrictTo("admin"), uploadProfilePhoto, StudentAdminController.addStudent);
router.get("/admin/students", protect, restrictTo("admin"), StudentAdminController.getAllStudents);
router.get("/admin/students/:id", protect, restrictTo("admin"), StudentAdminController.getStudentById);
router.put("/admin/students/:id", protect, restrictTo("admin"), uploadProfilePhoto, StudentAdminController.updateStudent);
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
router.post("/admin/study-materials", protect, restrictTo("admin"), StudyMaterialAdminController.uploadStudyMaterial);
router.put("/admin/studymaterial/:id", protect, restrictTo("admin"), StudyMaterialAdminController.updateStudyMaterial);
router.put("/admin/study-materials/:id", protect, restrictTo("admin"), StudyMaterialAdminController.updateStudyMaterial);
router.delete("/admin/studymaterial/:id", protect, restrictTo("admin"), StudyMaterialAdminController.deleteStudyMaterial);
router.delete("/admin/study-materials/:id", protect, restrictTo("admin"), StudyMaterialAdminController.deleteStudyMaterial);
router.get("/admin/study-materials", protect, restrictTo("admin"), StudyMaterialAdminController.getStudyMaterial);
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
