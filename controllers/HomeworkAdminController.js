import Homework from "../models/Homework.js";
import User from "../models/User.js";
import fs from "fs";
import path from "path";

// Helper to save Base64 file
const saveBase64File = (base64String, originalName) => {
  if (!base64String || !base64String.startsWith("data:")) {
    return base64String || "";
  }
  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64String;
    }
    const fileBuffer = Buffer.from(matches[2], "base64");
    const ext = path.extname(originalName) || ".pdf";
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const uniqueName = `${baseName}_${Date.now()}${ext}`;

    const uploadsDir = "./uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    fs.writeFileSync(path.join(uploadsDir, uniqueName), fileBuffer);
    return `/uploads/${uniqueName}`;
  } catch (err) {
    console.error("Failed to save file:", err.message);
    return "";
  }
};

// @desc    Upload homework (Admin)
// @route   POST /api/admin/homework
// @access  Private (Admin)
export const uploadHomework = async (req, res) => {
  const { title, subject, classLevel, batch, dueDate, description, attachmentName, attachmentData } = req.body;

  if (!title || !subject || !classLevel || !dueDate) {
    return res.status(400).json({
      success: false,
      message: "Please provide title, subject, classLevel, and dueDate",
    });
  }

  try {
    const homework = await Homework.create({
      title,
      subject,
      classLevel,
      batch: batch || "All Batches",
      dueDate,
      description: description || "",
      attachmentName: attachmentName || "",
      attachmentData: attachmentData ? saveBase64File(attachmentData, attachmentName) : "",
    });

    // Emit real-time notification to students
    const io = req.app.get("io");
    if (io) {
      io.emit("new_homework", homework);
    }

    res.status(201).json({
      success: true,
      message: "Homework uploaded successfully",
      data: homework,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update homework (Admin)
// @route   PUT /api/admin/homework/:id
// @access  Private (Admin)
export const updateHomework = async (req, res) => {
  const { id } = req.params;
  const { title, subject, classLevel, batch, dueDate, description, attachmentName, attachmentData } = req.body;

  try {
    const homework = await Homework.findById(id);

    if (!homework) {
      return res.status(404).json({ success: false, message: "Homework not found" });
    }

    if (title) homework.title = title;
    if (subject) homework.subject = subject;
    if (classLevel) homework.classLevel = classLevel;
    if (batch) homework.batch = batch;
    if (dueDate) homework.dueDate = dueDate;
    if (description !== undefined) homework.description = description;
    if (attachmentName) homework.attachmentName = attachmentName;
    if (attachmentData) {
      homework.attachmentData = saveBase64File(attachmentData, attachmentName);
    }

    await homework.save();

    res.status(200).json({
      success: true,
      message: "Homework updated successfully",
      data: homework,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get homework (Admin/Student)
// @route   GET /api/homework
// @access  Private (Admin/Student)
export const getHomework = async (req, res) => {
  const { classLevel, batch, subject, studentId } = req.query;
  let query = {};

  if (req.user.role === "student") {
    query.classLevel = req.user.classLevel;
  } else {
    if (classLevel) query.classLevel = classLevel;
    if (batch) query.batch = batch;
  }

  if (subject) query.subject = subject;

  try {
    const homeworks = await Homework.find(query).sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: homeworks.length,
      data: homeworks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single homework (Admin/Student)
// @route   GET /api/homework/:id
// @access  Private (Admin/Student)
export const getHomeworkById = async (req, res) => {
  const { id } = req.params;

  try {
    const homework = await Homework.findById(id);

    if (!homework) {
      return res.status(404).json({ success: false, message: "Homework not found" });
    }

    res.status(200).json({
      success: true,
      data: homework,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete homework (Admin)
// @route   DELETE /api/admin/homework/:id
// @access  Private (Admin)
export const deleteHomework = async (req, res) => {
  const { id } = req.params;

  try {
    const homework = await Homework.findById(id);

    if (!homework) {
      return res.status(404).json({ success: false, message: "Homework not found" });
    }

    // Delete file if exists
    if (homework.attachmentData && homework.attachmentData.startsWith("/uploads/")) {
      const filePath = path.join(".", homework.attachmentData);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Homework.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Homework deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
