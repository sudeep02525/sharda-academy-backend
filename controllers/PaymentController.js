import Razorpay from "razorpay";
import crypto from "crypto";
import Fee from "../models/Fee.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";

// Initialize Razorpay instance
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const createRazorpayOrder = async (req, res) => {
  const { id } = req.params; // Fee ID
  const { amountToPay } = req.body; // Custom amount student wants to pay

  try {
    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    if (fee.status === "Paid") {
      return res.status(400).json({ success: false, message: "Fee is already paid" });
    }

    const remainingBalance = fee.amount - (fee.amountPaid || 0);
    const paymentAmount = amountToPay && amountToPay > 0 && amountToPay <= remainingBalance ? amountToPay : remainingBalance;

    const minAllowed = Math.min(4000, remainingBalance);
    if (paymentAmount < minAllowed) {
      return res.status(400).json({ success: false, message: `Minimum payment amount is ₹${minAllowed}` });
    }

    if (paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount" });
    }

    const rzp = getRazorpayInstance();
    const options = {
      amount: Math.round(paymentAmount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `rcpt_${fee._id.toString().substring(0,10)}_${Date.now().toString().slice(-5)}`,
    };

    const order = await rzp.orders.create(options);

    res.status(200).json({
      success: true,
      order: order,
      keyId: process.env.RAZORPAY_KEY_ID,
      fee: fee,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ success: false, message: error.description || error.message || JSON.stringify(error) });
  }
};

export const processManualPayment = async (req, res, next) => {
  const feeId = req.params.id;
  const { status, paymentMethod } = req.body;

  try {
    const feeInvoice = await Fee.findById(feeId);
    if (!feeInvoice) {
      return res.status(404).json({ success: false, message: "Invoice record not found" });
    }

    // Verify this student owns the fee record
    if (feeInvoice.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access forbidden: Unauthorized fee payment" });
    }

    feeInvoice.status = status || "Paid";
    if (feeInvoice.status === "Paid") {
      feeInvoice.paymentDate = new Date();
      feeInvoice.paymentMethod = paymentMethod || "UPI Checkout Portal";
    }

    await feeInvoice.save();

    const student = await User.findById(feeInvoice.studentId);
    if (student) {
      student.feeStatus = feeInvoice.status;
      await student.save();
    }

    // Audit Log Activity
    // Assuming ActivityLog is imported, need to import it at top of file
    // I will add import in next step if not present
    return res.status(200).json({ success: true, message: "Tuition fee invoice paid successfully via online checkout", fee: feeInvoice });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  const { id } = req.params; // Fee ID
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is successful. Fetch the order to know the exact amount paid.
      const rzp = getRazorpayInstance();
      const orderData = await rzp.orders.fetch(razorpay_order_id);
      const paidAmount = orderData.amount / 100;

      fee.amountPaid = (fee.amountPaid || 0) + paidAmount;
      fee.paymentDate = new Date();
      fee.paymentMethod = "Razorpay";
      fee.transactionId = razorpay_payment_id;

      if (fee.amountPaid >= fee.amount) {
        fee.status = "Paid";
      } else {
        fee.status = "Partial";
      }
      
      await fee.save();

      // Update student overall fee status
      const unpaidCount = await Fee.countDocuments({ studentId: fee.studentId, status: { $in: ["Unpaid", "Partial", "Pending"] } });
      if (unpaidCount === 0) {
        await User.findByIdAndUpdate(fee.studentId, { feeStatus: "Paid" });
      } else {
        await User.findByIdAndUpdate(fee.studentId, { feeStatus: "Partial" });
      }

      // Emit real-time notification to admin
      const io = req.app.get("io");
      if (io) {
        io.emit("fee_paid", fee);
      }

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: fee,
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
