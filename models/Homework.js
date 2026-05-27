import mongoose from "mongoose";

const HomeworkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    classLevel: {
      type: Number, // 1 to 12
      required: true,
      min: 1,
      max: 12,
    },
    batch: {
      type: String, // e.g. "Batch A", "Batch B", "NEET Premium"
      required: true,
      trim: true,
    },
    dueDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    attachmentName: {
      type: String,
      default: "",
    },
    attachmentData: {
      type: String, // Base64 encoding or local asset URL for PDF/image
      default: "",
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Homework = mongoose.model("Homework", HomeworkSchema);
export default Homework;
