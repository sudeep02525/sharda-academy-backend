import mongoose from "mongoose";

const FeeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invoiceId: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "Monthly Coaching Tuition Fees",
    },
    amount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    paymentDate: {
      type: String, // Format: YYYY-MM-DD
      default: null,
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid", "Pending", "Partial"],
      default: "Unpaid",
    },
    paymentMethod: {
      type: String,
      default: "", // "UPI", "Credit Card", "Cash", "Cheque", etc.
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
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Fee = mongoose.model("Fee", FeeSchema);
export default Fee;

