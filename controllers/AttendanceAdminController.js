import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

// Helper to generate daily report for a class
const generateDailyAttendanceReport = async (classLevel, batch, date) => {
  const students = await User.find({
    role: "student",
    classLevel,
    batch,
    accountStatus: true,
  }).select("_id name rollNumber");

  const attendanceRecords = await Attendance.find({ classLevel, batch, date });

  const report = students.map((student) => {
    const record = attendanceRecords.find((r) => r.studentId.equals(student._id));
    return {
      studentId: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      status: record ? record.status : "Absent",
      checkInTime: record?.checkInTime || "",
    };
  });

  return report;
};

// @desc    Mark attendance for class (Admin)
// @route   POST /api/admin/attendance/mark
// @access  Private (Admin)
export const markAttendance = async (req, res) => {
  const { date, classLevel, batch, attendanceRecords } = req.body;

  if (!date || !classLevel || !batch || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({
      success: false,
      message: "Please provide date, classLevel, batch, and attendance records",
    });
  }

  try {
    const savedRecords = [];

    for (const record of attendanceRecords) {
      const { studentId, status } = record;

      if (!studentId || !status) continue;

      // Check if record exists
      let attendance = await Attendance.findOne({ studentId, date });

      if (attendance) {
        // Update existing
        attendance.status = status;
        attendance.markedBy = req.user._id;
        attendance.method = "Manual";
      } else {
        // Create new
        attendance = new Attendance({
          studentId,
          date,
          status,
          classLevel,
          batch,
          markedBy: req.user._id,
          method: "Manual",
        });
      }

      await attendance.save();
      savedRecords.push(attendance);
    }

    res.status(200).json({
      success: true,
      message: `Attendance marked for ${savedRecords.length} student(s)`,
      data: savedRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update single attendance record (Admin)
// @route   PUT /api/admin/attendance/:id
// @access  Private (Admin)
export const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, checkInTime, checkOutTime } = req.body;

  try {
    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    if (status) attendance.status = status;
    if (checkInTime) attendance.checkInTime = checkInTime;
    if (checkOutTime) attendance.checkOutTime = checkOutTime;
    attendance.markedBy = req.user._id;
    attendance.method = "Manual";

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance records (Admin)
// @route   GET /api/admin/attendance
// @access  Private (Admin)
export const getAttendance = async (req, res) => {
  const { date, classLevel, batch, studentId, status } = req.query;
  let query = {};

  if (date) query.date = date;
  if (classLevel) query.classLevel = classLevel;
  if (batch) query.batch = batch;
  if (studentId) query.studentId = studentId;
  if (status) query.status = status;

  try {
    const records = await Attendance.find(query)
      .populate("studentId", "name rollNumber email")
      .populate("markedBy", "name")
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get daily attendance report (Admin)
// @route   GET /api/admin/attendance/daily-report
// @access  Private (Admin)
export const getDailyReport = async (req, res) => {
  const { date, classLevel, batch } = req.query;

  if (!date || !classLevel || !batch) {
    return res.status(400).json({
      success: false,
      message: "Please provide date, classLevel, and batch",
    });
  }

  try {
    const report = await generateDailyAttendanceReport(classLevel, batch, date);

    const totalStudents = report.length;
    const presentCount = report.filter((r) => r.status === "Present").length;
    const absentCount = report.filter((r) => r.status === "Absent").length;
    const lateCount = report.filter((r) => r.status === "Late").length;

    res.status(200).json({
      success: true,
      data: {
        date,
        classLevel,
        batch,
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        attendancePercentage: totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(2) : 0,
        records: report,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get monthly attendance report (Admin)
// @route   GET /api/admin/attendance/monthly-report
// @access  Private (Admin)
export const getMonthlyReport = async (req, res) => {
  const { classLevel, batch, month, year } = req.query;

  if (!classLevel || !batch || !month || !year) {
    return res.status(400).json({
      success: false,
      message: "Please provide classLevel, batch, month, and year",
    });
  }

  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${daysInMonth}`;

    const students = await User.find({
      role: "student",
      classLevel: parseInt(classLevel),
      batch,
      accountStatus: true,
    }).select("_id name rollNumber");

    const attendanceRecords = await Attendance.find({
      classLevel: parseInt(classLevel),
      batch,
      date: { $gte: startDate, $lte: endDate },
    });

    const report = students.map((student) => {
      const studentRecords = attendanceRecords.filter((r) => r.studentId.equals(student._id));

      const presentCount = studentRecords.filter((r) => r.status === "Present").length;
      const absentCount = studentRecords.filter((r) => r.status === "Absent").length;
      const lateCount = studentRecords.filter((r) => r.status === "Late").length;
      const attendancePercentage = daysInMonth > 0 ? ((presentCount / daysInMonth) * 100).toFixed(2) : 0;

      return {
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        presentCount,
        absentCount,
        lateCount,
        attendancePercentage,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        classLevel,
        batch,
        totalStudents: students.length,
        students: report,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete attendance record (Admin)
// @route   DELETE /api/admin/attendance/:id
// @access  Private (Admin)
export const deleteAttendance = async (req, res) => {
  const { id } = req.params;

  try {
    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    await Attendance.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
