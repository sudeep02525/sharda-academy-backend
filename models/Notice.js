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
    sendEmail: {
      type: Boolean,
      default: false,
    },
    sendDashboardNotification: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
