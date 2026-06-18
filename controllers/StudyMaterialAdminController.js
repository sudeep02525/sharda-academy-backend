import StudyMaterial from "../models/StudyMaterial.js";
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

// @desc    Upload study material (Admin)
// @route   POST /api/admin/studymaterial
// @access  Private (Admin)
export const uploadStudyMaterial = async (req, res) => {
  const { title, subject, classLevel, batch, materialType, attachmentName, attachmentData, description, pages, fileSize } = req.body;

  if (!title || !subject || !classLevel) {
    return res.status(400).json({
      success: false,
      message: "Please provide title, subject, and classLevel",
    });
  }

  try {
    const studyMaterial = await StudyMaterial.create({
      title,
      subject,
      classLevel,
      batch: batch || "All Batches",
      materialType: materialType || "Notes",
      attachmentName: attachmentName || "",
      attachmentData: attachmentData ? saveBase64File(attachmentData, attachmentName) : "",
      description: description || "",
      pages: pages || "",
      fileSize: fileSize || "",
    });

    res.status(201).json({
      success: true,
      message: "Study material uploaded successfully",
      data: studyMaterial,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update study material (Admin)
// @route   PUT /api/admin/studymaterial/:id
// @access  Private (Admin)
export const updateStudyMaterial = async (req, res) => {
  const { id } = req.params;
  const { title, subject, classLevel, batch, materialType, attachmentName, attachmentData, description, pages, fileSize } = req.body;

  try {
    const studyMaterial = await StudyMaterial.findById(id);

    if (!studyMaterial) {
      return res.status(404).json({ success: false, message: "Study material not found" });
    }

    if (title) studyMaterial.title = title;
    if (subject) studyMaterial.subject = subject;
    if (classLevel) studyMaterial.classLevel = classLevel;
    if (batch) studyMaterial.batch = batch;
    if (materialType) studyMaterial.materialType = materialType;
    if (attachmentName) studyMaterial.attachmentName = attachmentName;
    if (attachmentData) {
      studyMaterial.attachmentData = saveBase64File(attachmentData, attachmentName);
    }
    if (description !== undefined) studyMaterial.description = description;
    if (pages) studyMaterial.pages = pages;
    if (fileSize) studyMaterial.fileSize = fileSize;

    await studyMaterial.save();

    res.status(200).json({
      success: true,
      message: "Study material updated successfully",
      data: studyMaterial,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get study materials (Admin/Student)
// @route   GET /api/studymaterial
// @access  Private (Admin/Student)
export const getStudyMaterial = async (req, res) => {
  const { classLevel, batch, subject, materialType } = req.query;
  let query = {};

  if (req.user.role === "student") {
    query.classLevel = req.user.classLevel;
  } else {
    if (classLevel) query.classLevel = classLevel;
    if (batch) query.batch = batch;
  }

  if (subject) query.subject = subject;
  if (materialType) query.materialType = materialType;

  try {
    const materials = await StudyMaterial.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single study material (Admin/Student)
// @route   GET /api/studymaterial/:id
// @access  Private (Admin/Student)
export const getStudyMaterialById = async (req, res) => {
  const { id } = req.params;

  try {
    const material = await StudyMaterial.findById(id);

    if (!material) {
      return res.status(404).json({ success: false, message: "Study material not found" });
    }

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete study material (Admin)
// @route   DELETE /api/admin/studymaterial/:id
// @access  Private (Admin)
export const deleteStudyMaterial = async (req, res) => {
  const { id } = req.params;

  try {
    const studyMaterial = await StudyMaterial.findById(id);

    if (!studyMaterial) {
      return res.status(404).json({ success: false, message: "Study material not found" });
    }

    // Delete file if exists
    if (studyMaterial.attachmentData && studyMaterial.attachmentData.startsWith("/uploads/")) {
      const filePath = path.join(".", studyMaterial.attachmentData);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await StudyMaterial.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Study material deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
