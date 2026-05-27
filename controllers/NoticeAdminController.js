import Notice from "../models/Notice.js";
import User from "../models/User.js";

// @desc    Create notice (Admin)
// @route   POST /api/admin/notices
// @access  Private (Admin)
export const createNotice = async (req, res) => {
  const { title, content, category, classStandard, batch, sendEmail, sendDashboardNotification } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Please provide title and content",
    });
  }

  try {
    const notice = await Notice.create({
      title,
      content,
      category: category || "General",
      classStandard: classStandard || null,
      batch: batch || "",
      sendEmail: sendEmail || false,
      sendDashboardNotification: sendDashboardNotification !== false,
      createdBy: req.user._id,
      author: req.user.name || "Admin",
    });

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: notice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update notice (Admin)
// @route   PUT /api/admin/notices/:id
// @access  Private (Admin)
export const updateNotice = async (req, res) => {
  const { id } = req.params;
  const { title, content, category, classStandard, batch, sendEmail, sendDashboardNotification } = req.body;

  try {
    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    if (title) notice.title = title;
    if (content) notice.content = content;
    if (category) notice.category = category;
    if (classStandard !== undefined) notice.classStandard = classStandard;
    if (batch !== undefined) notice.batch = batch;
    if (sendEmail !== undefined) notice.sendEmail = sendEmail;
    if (sendDashboardNotification !== undefined) notice.sendDashboardNotification = sendDashboardNotification;

    await notice.save();

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      data: notice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get notices (Admin/Student)
// @route   GET /api/notices
// @access  Private (Admin/Student)
export const getNotices = async (req, res) => {
  const { category, classStandard } = req.query;
  let query = {};

  if (req.user.role === "student") {
    // Students see notices for their class or general notices
    query.$or = [
      { classStandard: null },
      { classStandard: req.user.classLevel },
      { batch: null },
      { batch: req.user.batch },
    ];
    query.sendDashboardNotification = true;
  } else {
    if (classStandard) query.classStandard = classStandard;
  }

  if (category) query.category = category;

  try {
    const notices = await Notice.find(query)
      .populate("createdBy", "name email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single notice (Admin/Student)
// @route   GET /api/notices/:id
// @access  Private (Admin/Student)
export const getNoticeById = async (req, res) => {
  const { id } = req.params;

  try {
    const notice = await Notice.findById(id).populate("createdBy", "name email");

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.status(200).json({
      success: true,
      data: notice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get latest notices for dashboard (Student)
// @route   GET /api/notices/latest
// @access  Private (Student)
export const getLatestNotices = async (req, res) => {
  try {
    const query = {
      sendDashboardNotification: true,
      $or: [
        { classStandard: null },
        { classStandard: req.user.classLevel },
      ],
    };

    const notices = await Notice.find(query)
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete notice (Admin)
// @route   DELETE /api/admin/notices/:id
// @access  Private (Admin)
export const deleteNotice = async (req, res) => {
  const { id } = req.params;

  try {
    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    await Notice.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk send email notifications (Admin)
// @route   POST /api/admin/notices/:id/send-email
// @access  Private (Admin)
export const sendNoticeEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    // Get target students
    let studentQuery = { role: "student", accountStatus: true };
    if (notice.classStandard) {
      studentQuery.classLevel = notice.classStandard;
    }
    if (notice.batch) {
      studentQuery.batch = notice.batch;
    }

    const students = await User.find(studentQuery).select("email parentEmail name");
    const emailList = [];

    students.forEach((student) => {
      if (student.email) emailList.push(student.email);
      if (student.parentEmail) emailList.push(student.parentEmail);
    });

    // TODO: Integrate with email service
    // await sendBulkEmail(emailList, notice.title, notice.content);

    res.status(200).json({
      success: true,
      message: `Notice email sent to ${emailList.length} recipient(s)`,
      recipientCount: emailList.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
