import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import ActivityLog from "../models/ActivityLog.js";

// @desc    Sync biometric attendance from hardware
// @route   POST /api/sams/biometric-sync
// @access  Public (Hardware device)
export const syncBiometric = async (req, res, next) => {
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
    next(error);
  }
};
