import Fee from "../models/Fee.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import { sendFeeReminderEmail } from "../utils/mailer.js";

// Helper to generate invoice number
const generateInvoiceNumber = async () => {
  const latestFee = await Fee.findOne().sort({ createdAt: -1 }).select("invoiceId");
  if (!latestFee || !latestFee.invoiceId) {
    return "INV-00001";
  }
  const lastNumber = parseInt(latestFee.invoiceId.split("-")[1]);
  return `INV-${String(lastNumber + 1).padStart(5, "0")}`;
};

// @desc    Add fee invoice (Admin)
// @route   POST /api/admin/fees
// @access  Private (Admin)
export const addFeeInvoice = async (req, res) => {
  const { studentId, amount, dueDate, description, classStandard, batch, paymentMethod } = req.body;

  if (!studentId || !amount || !dueDate) {
    return res.status(400).json({
      success: false,
      message: "Please provide studentId, amount, and dueDate",
    });
  }

  try {
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const invoiceId = await generateInvoiceNumber();

    const fee = await Fee.create({
      studentId,
      invoiceId,
      amount,
      dueDate,
      description: description || "Monthly Coaching Tuition Fees",
      classStandard: classStandard || student.classLevel,
      batch: batch || student.batch,
      paymentMethod: paymentMethod || "",
      generatedBy: req.user._id,
      status: "Unpaid",
    });

    // Emit real-time notification to students
    const io = req.app.get("io");
    if (io) {
      io.emit("new_fee", fee);
    }

    res.status(201).json({
      success: true,
      message: "Fee invoice created successfully",
      data: fee,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update fee status (Admin)
// @route   PUT /api/admin/fees/:id
// @access  Private (Admin)
export const updateFeeStatus = async (req, res) => {
  const { id } = req.params;
  const { status, paymentDate, paymentMethod, amount, description, amountPaid } = req.body;

  try {
    const fee = await Fee.findById(id);

    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    if (amountPaid !== undefined) {
      fee.amountPaid = (fee.amountPaid || 0) + Number(amountPaid);
      if (fee.amountPaid >= fee.amount) {
        fee.status = "Paid";
      } else if (fee.amountPaid > 0) {
        fee.status = "Partial";
      }
    } else if (status) {
      fee.status = status;
      if (status === "Paid") {
        fee.amountPaid = fee.amount;
      }
    }

    if (paymentDate) fee.paymentDate = paymentDate;
    if (paymentMethod) fee.paymentMethod = paymentMethod;
    if (amount) fee.amount = amount;
    if (description) fee.description = description;

    await fee.save();

    // Update student fee status
    if (fee.status === "Paid") {
      const unpaidCount = await Fee.countDocuments({ studentId: fee.studentId, status: { $in: ["Unpaid", "Partial", "Pending"] } });
      if (unpaidCount === 0) {
        await User.findByIdAndUpdate(fee.studentId, { feeStatus: "Paid" });
      }
    } else {
      await User.findByIdAndUpdate(fee.studentId, { feeStatus: fee.status || "Unpaid" });
    }

    // Emit real-time notification to all connected clients (student and admin)
    const io = req.app.get("io");
    if (io) {
      io.emit("fee_paid", fee);
    }

    res.status(200).json({
      success: true,
      message: "Fee status updated successfully",
      data: fee,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get fee records (Admin/Student)
// @route   GET /api/fees
// @access  Private (Admin/Student)
export const getFees = async (req, res) => {
  const { studentId, status, classStandard, batch } = req.query;
  let query = {};

  if (req.user.role === "student") {
    query.studentId = req.user._id;
  } else {
    if (studentId) query.studentId = studentId;
    if (classStandard) query.classStandard = classStandard;
    if (batch) query.batch = batch;
  }

  if (status) query.status = status;

  try {
    const fees = await Fee.find(query)
      .populate("studentId", "name email rollNumber phone")
      .populate("generatedBy", "name")
      .sort({ dueDate: -1 });

    res.status(200).json({
      success: true,
      count: fees.length,
      data: fees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending dues by class (Admin)
// @route   GET /api/admin/fees/pending
// @access  Private (Admin)
export const getPendingDues = async (req, res) => {
  const { classStandard, batch } = req.query;

  try {
    const query = { status: { $in: ["Unpaid", "Pending", "Partial"] } };

    if (classStandard) query.classStandard = classStandard;
    if (batch) query.batch = batch;

    const pendingFees = await Fee.find(query)
      .populate("studentId", "name email rollNumber")
      .sort({ dueDate: 1 });

    const totalPending = pendingFees.reduce((sum, fee) => sum + (fee.amount - (fee.amountPaid || 0)), 0);
    const totalRecords = pendingFees.length;

    res.status(200).json({
      success: true,
      count: totalRecords,
      totalAmount: totalPending,
      data: pendingFees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get fee summary for a student (Admin/Student)
// @route   GET /api/fees/summary/:studentId
// @access  Private (Admin/Student)
export const getFeeSummary = async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === "student" && req.user._id.toString() !== studentId) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  try {
    const fees = await Fee.find({ studentId }).sort({ createdAt: -1 });

    const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const paidAmount = fees.reduce((sum, fee) => sum + (fee.amountPaid || 0), 0);
    const unpaidAmount = fees.reduce((sum, fee) => sum + (fee.amount - (fee.amountPaid || 0)), 0);
    const pendingAmount = fees.filter((f) => f.status === "Pending").reduce((sum, fee) => sum + (fee.amount - (fee.amountPaid || 0)), 0);

    res.status(200).json({
      success: true,
      data: {
        totalAmount,
        paidAmount,
        unpaidAmount,
        pendingAmount,
        totalRecords: fees.length,
        fees: fees,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete fee record (Admin)
// @route   DELETE /api/admin/fees/:id
// @access  Private (Admin)
export const deleteFee = async (req, res, next) => {
  const { id } = req.params;

  try {
    const fee = await Fee.findById(id);

    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    await Fee.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Fee record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger transactional fee payment reminder email to parent and student
// @route   POST /api/admin/fees/remind/:id
// @access  Private (Admin)
export const remindFeePayment = async (req, res, next) => {
  try {
    const feeInvoice = await Fee.findById(req.params.id);
    if (!feeInvoice) {
      return res.status(404).json({ success: false, message: "Invoice record not found" });
    }
    const student = await User.findById(feeInvoice.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Associated student not found" });
    }

    const emails = [student.email, student.parentEmail].filter(Boolean);
    if (emails.length > 0) {
      for (const email of emails) {
        try {
          await sendFeeReminderEmail(email, student.name, feeInvoice.invoiceId, feeInvoice.amount, feeInvoice.dueDate);
        } catch (mailErr) {
          console.error(`⚠️ Fee email alert failed for ${email}:`, mailErr.message);
        }
      }
    }

    await new ActivityLog({ action: `Sent fee invoice payment reminder for '${feeInvoice.invoiceId}' to student/parent` }).save();
    return res.status(200).json({ success: true, message: `Fee payment reminder sent successfully to student and parent` });
  } catch (err) {
    next(err);
  }
};
