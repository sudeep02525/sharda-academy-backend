import Course from "../models/Course.js";
import User from "../models/User.js";

// @desc    Create a new course
// @route   POST /api/sams/admin/courses
// @access  Private (Admin)
export const createCourse = async (req, res) => {
  const { name, classLevel, description } = req.body;
  if (!name || !classLevel) {
    return res.status(400).json({ success: false, message: "Course name and Class Level are required" });
  }

  try {
    const course = await Course.create({
      name,
      classLevel,
      description,
    });

    res.status(201).json({ success: true, data: course, message: "Course created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all courses
// @route   GET /api/sams/admin/courses
// @access  Private (Admin)
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ classLevel: 1, name: 1 });
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// @desc    Update course
// @route   PUT /api/sams/admin/courses/:id
// @access  Private (Admin)
export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { name, classLevel, description } = req.body;

  try {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (name) course.name = name;
    if (classLevel) course.classLevel = classLevel;
    if (description !== undefined) course.description = description;

    await course.save();
    res.status(200).json({ success: true, data: course, message: "Course updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/sams/admin/courses/:id
// @access  Private (Admin)
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    await course.deleteOne();
    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
