import Timetable from "../models/Timetable.js";

// @desc    Create timetable entry (Admin)
// @route   POST /api/admin/timetable
// @access  Private (Admin)
export const createTimetableEntry = async (req, res) => {
  const { classLevel, batch, subject, teacherName, day, startTime, endTime, room } = req.body;

  if (!classLevel || !batch || !subject || !teacherName || !day || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  try {
    const entry = await Timetable.create({
      classLevel,
      batch,
      subject,
      teacherName,
      day,
      startTime,
      endTime,
      room: room || "Classroom 101",
    });

    res.status(201).json({
      success: true,
      message: "Timetable entry created successfully",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update timetable entry (Admin)
// @route   PUT /api/admin/timetable/:id
// @access  Private (Admin)
export const updateTimetableEntry = async (req, res) => {
  const { id } = req.params;
  const { subject, teacherName, startTime, endTime, room } = req.body;

  try {
    const entry = await Timetable.findById(id);

    if (!entry) {
      return res.status(404).json({ success: false, message: "Timetable entry not found" });
    }

    if (subject) entry.subject = subject;
    if (teacherName) entry.teacherName = teacherName;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (room) entry.room = room;

    await entry.save();

    res.status(200).json({
      success: true,
      message: "Timetable entry updated successfully",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get timetable (Admin/Student)
// @route   GET /api/timetable
// @access  Private (Admin/Student)
export const getTimetable = async (req, res) => {
  const { classLevel, batch, day } = req.query;
  let query = {};

  if (req.user.role === "student") {
    query.classLevel = req.user.classLevel;
    query.batch = req.user.batch;
  } else {
    if (classLevel) query.classLevel = classLevel;
    if (batch) query.batch = batch;
  }

  if (day) query.day = day;

  try {
    const entries = await Timetable.find(query).sort({ day: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get weekly timetable (Admin/Student)
// @route   GET /api/timetable/weekly
// @access  Private (Admin/Student)
export const getWeeklyTimetable = async (req, res) => {
  const { classLevel, batch } = req.query;

  let query = {};

  if (req.user.role === "student") {
    query.classLevel = req.user.classLevel;
    query.batch = req.user.batch;
  } else {
    if (classLevel) query.classLevel = classLevel;
    if (batch) query.batch = batch;
  }

  try {
    const entries = await Timetable.find(query).sort({ day: 1, startTime: 1 });

    // Group by day
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const timetable = {};

    days.forEach((day) => {
      timetable[day] = entries.filter((e) => e.day === day);
    });

    res.status(200).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single timetable entry (Admin/Student)
// @route   GET /api/timetable/:id
// @access  Private (Admin/Student)
export const getTimetableById = async (req, res) => {
  const { id } = req.params;

  try {
    const entry = await Timetable.findById(id);

    if (!entry) {
      return res.status(404).json({ success: false, message: "Timetable entry not found" });
    }

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete timetable entry (Admin)
// @route   DELETE /api/admin/timetable/:id
// @access  Private (Admin)
export const deleteTimetableEntry = async (req, res) => {
  const { id } = req.params;

  try {
    const entry = await Timetable.findById(id);

    if (!entry) {
      return res.status(404).json({ success: false, message: "Timetable entry not found" });
    }

    await Timetable.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Timetable entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk upload timetable (Admin)
// @route   POST /api/admin/timetable/bulk
// @access  Private (Admin)
export const bulkUploadTimetable = async (req, res) => {
  const { classLevel, batch, entries } = req.body;

  if (!classLevel || !batch || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide classLevel, batch, and array of entries",
    });
  }

  try {
    // Delete existing entries for this class/batch
    await Timetable.deleteMany({ classLevel, batch });

    // Insert new entries
    const savedEntries = await Timetable.insertMany(
      entries.map((entry) => ({
        ...entry,
        classLevel,
        batch,
      }))
    );

    res.status(201).json({
      success: true,
      message: `Timetable uploaded for ${savedEntries.length} slot(s)`,
      data: savedEntries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
