import mongoose from "mongoose";

const StudyMaterialSchema = new mongoose.Schema(
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
      type: String, // e.g. "Batch A", "Batch B", or "All Batches"
      default: "All Batches",
      trim: true,
    },
    materialType: {
      type: String,
      enum: ["Notes", "Worksheet", "Syllabus", "Other"],
      default: "Notes",
    },
    attachmentName: {
      type: String,
      default: "",
    },
    attachmentData: {
      type: String, // Base64 encoding or local asset URL for PDF/image
      default: "",
    },
    pages: {
      type: String, // e.g. "12 pages"
      default: "",
    },
    fileSize: {
      type: String, // e.g. "2.4 MB"
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const StudyMaterial = mongoose.model("StudyMaterial", StudyMaterialSchema);
export default StudyMaterial;

