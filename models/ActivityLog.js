import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    adminName: {
      type: String,
      default: "Admin Director",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
export default ActivityLog;
