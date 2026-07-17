import StudyMaterial from "../models/StudyMaterial.js";
import fs from "fs";
import path from "path";

import cloudinary from "../config/cloudinary.js";

// Helper to save Base64 file to Cloudinary
const saveBase64File = async (base64String, originalName) => {
  if (!base64String || !base64String.startsWith("data:")) {
    return base64String || "";
  }
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: "sharda-academy/studymaterial",
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (err) {
    console.error("Failed to save file to Cloudinary:", err.message);
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
    const attachmentUrl = attachmentData ? await saveBase64File(attachmentData, attachmentName) : "";

    const studyMaterial = await StudyMaterial.create({
      title,
      subject,
      classLevel,
      batch: batch || "All Batches",
      materialType: materialType || "Notes",
      attachmentName: attachmentName || "",
      attachmentData: attachmentUrl,
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
      studyMaterial.attachmentData = await saveBase64File(attachmentData, attachmentName);
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
    if (studyMaterial.attachmentData && studyMaterial.attachmentData.includes("cloudinary.com")) {
      const publicIdMatch = studyMaterial.attachmentData.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (publicIdMatch && publicIdMatch[1]) {
         await cloudinary.uploader.destroy(publicIdMatch[1], { resource_type: "raw" }).catch(e => console.error("Cloudinary delete error:", e));
         await cloudinary.uploader.destroy(publicIdMatch[1], { resource_type: "image" }).catch(e => console.error("Cloudinary delete error:", e));
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
