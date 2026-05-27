import Result from "../models/Result.js";
import User from "../models/User.js";

// @desc    Upload exam results (Admin)
// @route   POST /api/admin/results
// @access  Private (Admin)
export const uploadResults = async (req, res) => {
  const { examName, classLevel, batch, results } = req.body;

  if (!examName || !classLevel || !batch || !Array.isArray(results)) {
    return res.status(400).json({
      success: false,
      message: "Please provide examName, classLevel, batch, and results",
    });
  }

  try {
    const savedResults = [];

    for (const studentResult of results) {
      const { studentId, marks } = studentResult;

      if (!studentId || !marks) continue;

      // Check if result exists for this student and exam
      let result = await Result.findOne({ studentId, examName });

      if (result) {
        result.marks = marks;
      } else {
        result = new Result({
          studentId,
          examName,
          marks,
        });
      }

      await result.save();
      savedResults.push(result);
    }

    res.status(200).json({
      success: true,
      message: `Results uploaded for ${savedResults.length} student(s)`,
      data: savedResults,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student result (Admin)
// @route   PUT /api/admin/results/:id
// @access  Private (Admin)
export const updateResult = async (req, res) => {
  const { id } = req.params;
  const { marks } = req.body;

  if (!marks) {
    return res.status(400).json({
      success: false,
      message: "Please provide marks",
    });
  }

  try {
    const result = await Result.findById(id);

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    result.marks = marks;
    await result.save();

    res.status(200).json({
      success: true,
      message: "Result updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get results (Admin/Student)
// @route   GET /api/results
// @access  Private (Admin/Student)
export const getResults = async (req, res) => {
  const { studentId, examName } = req.query;
  let query = {};

  if (req.user.role === "student") {
    query.studentId = req.user._id;
  } else {
    if (studentId) query.studentId = studentId;
  }

  if (examName) query.examName = examName;

  try {
    const results = await Result.find(query)
      .populate("studentId", "name rollNumber email classLevel batch")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get exam rankings (Admin)
// @route   GET /api/admin/results/rankings/:examName
// @access  Private (Admin)
export const getExamRankings = async (req, res) => {
  const { examName } = req.params;
  const { classLevel, batch } = req.query;

  try {
    const results = await Result.find({ examName })
      .populate({
        path: "studentId",
        match: {
          ...(classLevel && { classLevel: parseInt(classLevel) }),
          ...(batch && { batch }),
        },
        select: "name rollNumber email classLevel batch",
      })
      .sort({ percentage: -1 });

    // Filter out null studentId entries (failed population)
    const filteredResults = results.filter((r) => r.studentId !== null);

    const rankings = filteredResults.map((result, index) => ({
      rank: index + 1,
      studentId: result.studentId._id,
      name: result.studentId.name,
      rollNumber: result.studentId.rollNumber,
      percentage: result.percentage,
      grade: result.grade,
      totalMarks: result.marks.reduce((sum, m) => sum + m.obtained, 0),
    }));

    res.status(200).json({
      success: true,
      examName,
      totalStudents: rankings.length,
      data: rankings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student performance summary (Admin/Student)
// @route   GET /api/results/performance/:studentId
// @access  Private (Admin/Student)
export const getPerformanceSummary = async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === "student" && req.user._id.toString() !== studentId) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  try {
    const results = await Result.find({ studentId }).sort({ createdAt: -1 });

    const averagePercentage = results.length > 0 ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(2) : 0;

    const bestExam = results.length > 0 ? results.reduce((best, current) => (current.percentage > best.percentage ? current : best)) : null;

    const lowestExam = results.length > 0 ? results.reduce((lowest, current) => (current.percentage < lowest.percentage ? current : lowest)) : null;

    res.status(200).json({
      success: true,
      data: {
        totalExams: results.length,
        averagePercentage,
        bestExam: bestExam ? { examName: bestExam.examName, percentage: bestExam.percentage } : null,
        lowestExam: lowestExam ? { examName: lowestExam.examName, percentage: lowestExam.percentage } : null,
        allResults: results,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete result (Admin)
// @route   DELETE /api/admin/results/:id
// @access  Private (Admin)
export const deleteResult = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Result.findById(id);

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    await Result.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Result deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
