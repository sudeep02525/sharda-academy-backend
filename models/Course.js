import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  classLevel: {
    type: Number,
    required: true,
  },

  description: {
    type: String,
  },
}, { timestamps: true });

const Course = mongoose.model("Course", courseSchema);
export default Course;

