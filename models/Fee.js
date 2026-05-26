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
    dueDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid", "Pending"],
      default: "Unpaid",
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      default: "", // "Biometric Card Sync Wallet", "UPI", "Credit Card", "Cash"
    },
  },
  {
    timestamps: true,
  }
);

const Fee = mongoose.model("Fee", FeeSchema);
export default Fee;
