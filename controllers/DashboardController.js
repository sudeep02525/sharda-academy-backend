import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Notice from "../models/Notice.js";
import Timetable from "../models/Timetable.js";
import Fee from "../models/Fee.js";
import Result from "../models/Result.js";
import Homework from "../models/Homework.js";
import StudyMaterial from "../models/StudyMaterial.js";
import Inquiry from "../models/Inquiry.js";
import ActivityLog from "../models/ActivityLog.js";

// @desc    Get student dashboard data
// @route   GET /api/sams/student/dashboard
// @access  Private (Student)
export const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    // 1. Fetch personal details first (needed for classLevel filters)
    const studentDetails = await User.findById(studentId).select("-password");

    if (!studentDetails) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

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
    next(error);
  }
};

// @desc    Get admin analytics and dashboards
// @route   GET /api/sams/admin/analytics
// @access  Private (Admin)
export const getAdminAnalytics = async (req, res, next) => {
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
    next(error);
  }
};
