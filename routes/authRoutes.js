import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==========================================
// 🔐 1. LOGIN API (STANDARD EMAIL + PASSWORD)
// ==========================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email address or password" });
    }

    // If student record exists but has no password set (unverified online account activation)
    if (user.role === "student" && (!user.password || user.password === "")) {
      return res.status(403).json({
        success: false,
        message: "Your online account is not registered yet. Please click 'Register Online' to activate it.",
      });
    }

    // Verify hashed password
    const isMatch = bcryptjs.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email address or password" });
    }

    // Create JWT Session token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "sharda_academy_super_secret_key_2026_sams",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Session authenticated successfully",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classLevel: user.classLevel,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error occurred during login" });
  }
});

// ==========================================
// 📝 2. STUDENT ONLINE REGISTRATION / ACTIVATION
// ==========================================

// Step 1: Send OTP to registered student email
router.post("/register-request", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Exact requested error banner if student email does not exist in database
    if (!user || user.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student account not found. Please contact institute administration.",
      });
    }

    // If already registered
    if (user.password && user.password !== "") {
      return res.status(400).json({
        success: false,
        message: "Account already registered and active. Please sign in.",
      });
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    console.log(`\n==============================================`);
    console.log(`📧 [EMAIL REGISTRATION] Dispatched OTP to: ${email}`);
    console.log(`🔑 Student Activation Verification Code: ${otp}`);
    console.log(`⏳ Code expires in 10 minutes`);
    console.log(`==============================================\n`);

    return res.status(200).json({
      success: true,
      message: "A 6-digit registration code has been dispatched to your email",
    });
  } catch (error) {
    console.error("Register Request Error:", error);
    return res.status(500).json({ success: false, message: "Failed to dispatch registration OTP" });
  }
});

// Step 2: Confirm OTP, hash password, and activate account
router.post("/register-verify", async (req, res) => {
  const { email, password, otp } = req.body;

  if (!email || !password || !otp) {
    return res.status(400).json({ success: false, message: "All parameters (email, password, otp) are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase(), role: "student" });
    if (!user) {
      return res.status(404).json({ success: false, message: "Student account not found" });
    }

    // Verify OTP and expiry
    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    // Securely hash password using bcryptjs
    const salt = bcryptjs.genSaltSync(10);
    user.password = bcryptjs.hashSync(password, salt);
    
    // Clear OTP fields
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Create JWT Session token immediately
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "sharda_academy_super_secret_key_2026_sams",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Online student account activated successfully!",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classLevel: user.classLevel,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error("Register Verify Error:", error);
    return res.status(500).json({ success: false, message: "Failed to activate student account" });
  }
});

// ==========================================
// 🔑 3. PASSWORD RECOVERY Flow (FORGOT & RESET)
// ==========================================

// Request OTP for recovery
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email" });
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    console.log(`\n==============================================`);
    console.log(`📧 [PASSWORD RECOVERY] Dispatched OTP to: ${email}`);
    console.log(`🔑 Recovery Password Reset Verification Code: ${otp}`);
    console.log(`⏳ Code expires in 10 minutes`);
    console.log(`==============================================\n`);

    return res.status(200).json({
      success: true,
      message: "A 6-digit recovery code has been dispatched to your email",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ success: false, message: "Failed to dispatch recovery code" });
  }
});

// Reset password using recovery OTP
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: "All parameters are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired recovery code" });
    }

    // Securely hash new password
    const salt = bcryptjs.genSaltSync(10);
    user.password = bcryptjs.hashSync(newPassword, salt);
    
    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your password has been successfully reset! You can now log in.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

export default router;
