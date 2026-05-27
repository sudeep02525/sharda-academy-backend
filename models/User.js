import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    parentPhoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      default: "", // Optional password backup
    },
    role: {
      type: String,
      required: true,
      enum: ["student", "admin"],
      default: "student",
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    // Student Details
    rollNumber: {
      type: String,
      trim: true,
      default: "",
    },
    classLevel: {
      type: Number, // 1 to 12
      min: 1,
      max: 12,
      default: null,
    },
    batch: {
      type: String,
      trim: true,
      default: "",
    },
    biometricId: {
      type: String, // RFID / Fingerprint card ID
      trim: true,
      sparse: true,
      default: null,
    },
    feeStatus: {
      type: String,
      enum: ["Paid", "Unpaid", "Pending"],
      default: "Unpaid",
    },
    parentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    dob: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      default: "",
    },
    bloodGroup: {
      type: String,
      default: "",
    },
    aadhaarNo: {
      type: String,
      default: "",
    },
    homeAddress: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    fatherName: {
      type: String,
      default: "",
    },
    fatherPhone: {
      type: String,
      default: "",
    },
    motherName: {
      type: String,
      default: "",
    },
    motherPhone: {
      type: String,
      default: "",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    profilePhotoFilename: {
      type: String,
      default: "",
    },
    accountStatus: {
      type: Boolean,
      default: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
