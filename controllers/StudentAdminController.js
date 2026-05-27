import User from "../models/User.js";
import bcrypt from "bcryptjs";

// @desc    Add a new student (Admin)
// @route   POST /api/admin/students
// @access  Private (Admin)
export const addStudent = async (req, res) => {
  const {
    name,
    email,
    phone,
    parentPhoneNumber,
    classLevel,
    batch,
    rollNumber,
    address,
    password,
    parentEmail,
    profilePhoto,
  } = req.body;

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || "12345678", 10);

    // Create new student
    const student = await User.create({
      name,
      email,
      phone,
      parentPhoneNumber,
      classLevel,
      batch,
      rollNumber,
      address,
      password: hashedPassword,
      parentEmail: parentEmail || "",
      profilePhoto: profilePhoto || "",
      role: "student",
      accountStatus: true,
    });

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        rollNumber: student.rollNumber,
        classLevel: student.classLevel,
        batch: student.batch,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student details (Admin)
// @route   PUT /api/admin/students/:id
// @access  Private (Admin)
export const updateStudent = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    parentPhoneNumber,
    classLevel,
    batch,
    rollNumber,
    address,
    parentEmail,
    profilePhoto,
  } = req.body;

  try {
    const student = await User.findById(id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Update fields
    if (name) student.name = name;
    if (email) student.email = email;
    if (phone) student.phone = phone;
    if (parentPhoneNumber) student.parentPhoneNumber = parentPhoneNumber;
    if (classLevel) student.classLevel = classLevel;
    if (batch) student.batch = batch;
    if (rollNumber) student.rollNumber = rollNumber;
    if (address) student.address = address;
    if (parentEmail) student.parentEmail = parentEmail;
    if (profilePhoto) student.profilePhoto = profilePhoto;

    await student.save();

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all students (Admin)
// @route   GET /api/admin/students
// @access  Private (Admin)
export const getAllStudents = async (req, res) => {
  const { classLevel, batch, search } = req.query;

  try {
    let query = { role: "student" };

    if (classLevel) query.classLevel = classLevel;
    if (batch) query.batch = batch;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(query).select("-password").sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single student by ID (Admin)
// @route   GET /api/admin/students/:id
// @access  Private (Admin)
export const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await User.findById(id).select("-password");

    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Deactivate student account (Admin)
// @route   PUT /api/admin/students/:id/deactivate
// @access  Private (Admin)
export const deactivateStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await User.findById(id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.accountStatus = false;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Student account deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate student account (Admin)
// @route   PUT /api/admin/students/:id/activate
// @access  Private (Admin)
export const activateStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await User.findById(id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.accountStatus = true;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Student account activated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset student password (Admin)
// @route   PUT /api/admin/students/:id/reset-password
// @access  Private (Admin)
export const resetStudentPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ success: false, message: "New password is required" });
  }

  try {
    const student = await User.findById(id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Student password reset successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete student (Admin)
// @route   DELETE /api/admin/students/:id
// @access  Private (Admin)
export const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await User.findById(id);

    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    await User.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
