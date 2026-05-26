import mongoose from "mongoose";

const TimetableSchema = new mongoose.Schema(
  {
    classLevel: {
      type: Number, // 1 to 12
      required: true,
      min: 1,
      max: 12,
    },
    batch: {
      type: String, // e.g. "Batch A", "NEET Premium"
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    teacherName: {
      type: String,
      required: true,
    },
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    startTime: {
      type: String, // Format: HH:MM AM/PM
      required: true,
    },
    endTime: {
      type: String, // Format: HH:MM AM/PM
      required: true,
    },
    room: {
      type: String,
      default: "Classroom 101",
    },
  },
  {
    timestamps: true,
  }
);

const Timetable = mongoose.model("Timetable", TimetableSchema);
export default Timetable;
