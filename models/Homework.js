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
    classLevel: { type: String, default: null },
    batch: {
      type: String, // e.g. "Batch A", "Batch B", "NEET Premium"
      default: "All Batches",
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
  },
  {
    timestamps: true,
  }
);

const Homework = mongoose.model("Homework", HomeworkSchema);
export default Homework;

