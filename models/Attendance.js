import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      default: "Present",
    },
    classStandard: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    batch: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      enum: ["Biometric", "Manual"],
      default: "Biometric",
    },
    checkInTime: {
      type: String, // Format: HH:MM AM/PM
      default: "",
    },
    checkOutTime: {
      type: String, // Format: HH:MM AM/PM
      default: "",
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin who marked attendance
      default: null,
    },
    deviceName: {
      type: String,
      default: "Biometric Gate Sync",
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique attendance record per student per day
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);
export default Attendance;
