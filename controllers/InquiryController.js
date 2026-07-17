import Inquiry from "../models/Inquiry.js";
import ActivityLog from "../models/ActivityLog.js";

// @desc    Submit public admissions inquiry
// @route   POST /api/sams/admissions-inquiry
// @access  Public
export const submitInquiry = async (req, res, next) => {
  const { name, parentName, classLevel, phone, email } = req.body;

  if (!name || !parentName || !classLevel || !phone || !email) {
    return res.status(400).json({ success: false, message: "All admissions parameters are required" });
  }

  try {
    const inquiry = new Inquiry({
      name,
      parentName,
      classLevel,
      phone,
      email,
    });
    await inquiry.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Online Admission Inquiry submitted for student '${name}' (Std ${classLevel})` }).save();

    return res.status(201).json({
      success: true,
      message: "Online admission inquiry submitted successfully!",
      inquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve online admission inquiry
// @route   PUT /api/sams/admin/admissions/:id
// @access  Private (Admin)
export const approveInquiry = async (req, res, next) => {
  const inquiryId = req.params.id;
  const { status } = req.body;

  try {
    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Admission inquiry not found" });
    }

    inquiry.status = status || "Approved";
    await inquiry.save();

    // Audit Log Activity
    await new ActivityLog({ action: `Admissions status marked as '${inquiry.status}' for candidate '${inquiry.name}'` }).save();

    return res.status(200).json({
      success: true,
      message: `Inquiry status successfully updated to '${inquiry.status}'`,
      inquiry,
    });
  } catch (error) {
    next(error);
  }
};
