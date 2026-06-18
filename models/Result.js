import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    marks: [
      {
        subject: { type: String, required: true },
        obtained: { type: Number, required: true },
        max: { type: Number, required: true, default: 100 },
        passingMarks: { type: Number, required: true, default: 35 },
      },
    ],
    percentage: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      default: "A",
    },
  },
  {
    timestamps: true,
  }
);

// Calculate percentage & grade before saving
ResultSchema.pre("save", function () {
  if (this.marks && this.marks.length > 0) {
    let totalObtained = 0;
    let totalMax = 0;
    let hasFailed = false;

    this.marks.forEach((m) => {
      totalObtained += m.obtained;
      totalMax += m.max;
      if (m.obtained < (m.passingMarks || 35)) {
        hasFailed = true;
      }
    });
    this.percentage = parseFloat(((totalObtained / totalMax) * 100).toFixed(2));

    if (hasFailed) {
      this.grade = "Fail";
    } else {
      if (this.percentage >= 90) this.grade = "A+";
      else if (this.percentage >= 80) this.grade = "A";
      else if (this.percentage >= 70) this.grade = "B";
      else if (this.percentage >= 60) this.grade = "C";
      else if (this.percentage >= 50) this.grade = "D";
      else this.grade = "Fail";
    }
  }
});

const Result = mongoose.model("Result", ResultSchema);
export default Result;

