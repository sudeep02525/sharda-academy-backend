import mongoose from "mongoose";

const NoticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["General", "Student", "Teacher", "Parent"],
      default: "General",
    },
    author: {
      type: String,
      default: "Academy Administration",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Notice = mongoose.model("Notice", NoticeSchema);
export default Notice;
