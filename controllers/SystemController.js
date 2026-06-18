import User from "../models/User.js";
import Course from "../models/Course.js";
import Homework from "../models/Homework.js";
import Attendance from "../models/Attendance.js";
import Result from "../models/Result.js";
import Fee from "../models/Fee.js";
import Notice from "../models/Notice.js";
import ActivityLog from "../models/ActivityLog.js";

// @desc    Download full database backup
// @route   GET /api/sams/admin/system/backup
// @access  Private (Admin)
export const getDatabaseBackup = async (req, res) => {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      users: await User.find({}),
      courses: await Course.find({}),
      homework: await Homework.find({}),
      attendance: await Attendance.find({}),
      results: await Result.find({}),
      fees: await Fee.find({}),
      notices: await Notice.find({}),
      logs: await ActivityLog.find({})
    };

    res.status(200).json({
      success: true,
      message: "Backup generated successfully",
      data: backup
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate backup: " + error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/sams/admin/system/roles/:userId
// @access  Private (Admin)
export const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !["admin", "student"].includes(role)) {
    return res.status(400).json({ success: false, message: "Valid role is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Cannot change your own role" });
    }

    user.role = role;
    await user.save();

    await new ActivityLog({ action: `Admin '${req.user.name}' updated role for '${user.name}' to '${role}'` }).save();

    res.status(200).json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
