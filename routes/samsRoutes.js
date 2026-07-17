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
import * as PaymentController from "../controllers/PaymentController.js";
import * as BiometricController from "../controllers/BiometricController.js";
import * as DashboardController from "../controllers/DashboardController.js";
import * as InquiryController from "../controllers/InquiryController.js";
import * as UserController from "../controllers/UserController.js";

import * as CourseAdminController from "../controllers/CourseAdminController.js";
import * as SystemController from "../controllers/SystemController.js";
import * as SiteContentController from "../controllers/SiteContentController.js";
import { CmsController } from '../controllers/CmsController.js';

const router = express.Router();



// ==========================================
// 📶 1. BIOMETRIC ATTENDANCE HARDWARE SYNC API
// ==========================================

router.post("/biometric-sync", BiometricController.syncBiometric);

// ==========================================
// 🛡️ 2. PORTALS GATEWAY INTERACTIVE APIS
// ==========================================

// --- STUDENT PORTAL ---
router.get("/student/dashboard", protect, restrictTo("student"), DashboardController.getStudentDashboard);

// User: Change own password (Student/Teacher/Admin)
router.post("/user/change-password", protect, UserController.changePassword);

// @desc    Get user profile
// @route   GET /api/sams/user/profile
// @access  Private
router.get("/user/profile", protect, UserController.getProfile);

// @desc    Update user profile
// @route   PUT /api/sams/user/profile
// @access  Private (All Roles)
router.put("/user/profile", protect, uploadProfilePhoto, UserController.updateProfile);

// ==========================================
// 📥 3. PUBLIC ADMISSIONS INQUIRY WEBHOOK
// ==========================================
router.post("/admissions-inquiry", InquiryController.submitInquiry);

// --- ADMIN PORTAL CRITICAL METRICS & USER CONTROLS ---

// Admin: Analytics & Dashboards
router.get("/admin/analytics", protect, restrictTo("admin"), DashboardController.getAdminAnalytics);

// Admin: Get all users
router.get("/admin/users", protect, restrictTo("admin"), UserController.getAllUsers);

// Admin: Register a Student or Admin
router.post("/admin/users", protect, restrictTo("admin"), uploadProfilePhoto, UserController.registerUser);

// Admin: Modify/Update User details
router.put("/admin/users/:id", protect, restrictTo("admin"), uploadProfilePhoto, UserController.updateUser);

// Admin: Delete User account
router.delete("/admin/users/:id", protect, restrictTo("admin"), UserController.deleteUser);

// Admin: Issue Tuition Fee Invoices — handled by FeeAdminController below

// Admin: Mark Tuition invoices as Paid — handled by FeeAdminController below

// Student: Pay tuition invoice online
router.put("/fees/:id", protect, restrictTo("student"), PaymentController.processManualPayment);

// Student: Razorpay Payment Flow
router.post("/student/fees/:id/razorpay-order", protect, restrictTo("student"), PaymentController.createRazorpayOrder);
router.post("/student/fees/:id/razorpay-verify", protect, restrictTo("student"), PaymentController.verifyRazorpayPayment);

// Admin: Schedule Timetable routines — handled by TimetableAdminController below

// Admin: Upload Results — handled by ResultAdminController below (supports bulk upload)

// Admin: Broadcast Notices — handled by NoticeAdminController below

// Admin: Approve Online Admission Inquiry
router.put("/admin/admissions/:id", protect, restrictTo("admin"), InquiryController.approveInquiry);

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
router.post("/admin/fees/remind/:id", protect, restrictTo("admin"), FeeAdminController.remindFeePayment);

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

// ==========================================
// 🏫 ADMIN COURSES MANAGEMENT
// ==========================================
router.post("/admin/courses", protect, restrictTo("admin"), CourseAdminController.createCourse);
router.get("/admin/courses", protect, restrictTo("admin"), CourseAdminController.getCourses);
router.put("/admin/courses/:id", protect, restrictTo("admin"), CourseAdminController.updateCourse);
router.delete("/admin/courses/:id", protect, restrictTo("admin"), CourseAdminController.deleteCourse);

// ==========================================
// ⚙️ SYSTEM SETTINGS & BACKUP
// ==========================================
router.get("/admin/system/backup", protect, restrictTo("admin"), SystemController.getDatabaseBackup);
router.put("/admin/system/roles/:userId", protect, restrictTo("admin"), SystemController.updateUserRole);

// ==========================================
// 🌐 WEBSITE CONTENT MANAGEMENT
// ==========================================
// Modular CMS Routes (Public)
router.get("/hero", CmsController.getHero);
router.get("/about", CmsController.getAbout);
router.get("/courses", CmsController.getCourses);
router.get("/facilities", CmsController.getFacilities);
router.get("/faculty", CmsController.getFaculty);
router.get("/gallery", CmsController.getGallery);
router.get("/toppers", CmsController.getToppers);
router.get("/testimonials", CmsController.getTestimonials);
router.get("/settings", CmsController.getSettings);

// Modular CMS Routes (Admin)
router.post("/admin/upload-media", protect, restrictTo("admin"), uploadProfilePhoto, SiteContentController.uploadSiteMedia);
router.put("/admin/hero", protect, restrictTo("admin"), CmsController.updateHero);
router.put("/admin/about", protect, restrictTo("admin"), CmsController.updateAbout);
router.put("/admin/settings", protect, restrictTo("admin"), CmsController.updateSettings);

router.post("/admin/courses", protect, restrictTo("admin"), CmsController.createCourse);
router.put("/admin/courses/:id", protect, restrictTo("admin"), CmsController.updateCourse);
router.delete("/admin/courses/:id", protect, restrictTo("admin"), CmsController.deleteCourse);

router.post("/admin/facilities", protect, restrictTo("admin"), CmsController.createFacility);
router.put("/admin/facilities/:id", protect, restrictTo("admin"), CmsController.updateFacility);
router.delete("/admin/facilities/:id", protect, restrictTo("admin"), CmsController.deleteFacility);

router.post("/admin/faculty", protect, restrictTo("admin"), CmsController.createFaculty);
router.put("/admin/faculty/:id", protect, restrictTo("admin"), CmsController.updateFaculty);
router.delete("/admin/faculty/:id", protect, restrictTo("admin"), CmsController.deleteFaculty);

router.post("/admin/gallery", protect, restrictTo("admin"), CmsController.createGallery);
router.delete("/admin/gallery/:id", protect, restrictTo("admin"), CmsController.deleteGallery);

router.post("/admin/toppers", protect, restrictTo("admin"), CmsController.createTopper);
router.put("/admin/toppers/:id", protect, restrictTo("admin"), CmsController.updateTopper);
router.delete("/admin/toppers/:id", protect, restrictTo("admin"), CmsController.deleteTopper);

router.post("/admin/testimonials", protect, restrictTo("admin"), CmsController.createTestimonial);
router.put("/admin/testimonials/:id", protect, restrictTo("admin"), CmsController.updateTestimonial);
router.delete("/admin/testimonials/:id", protect, restrictTo("admin"), CmsController.deleteTestimonial);

export default router;
