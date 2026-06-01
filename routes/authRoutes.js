import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import User from "../models/User.js";
import { sendOTPEmail } from "../utils/mailer.js";

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
        message: "Your online account is not registered yet. Please contact administration.",
      });
    }

    // Verify account is active
    if (user.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated by Sharda Academy administration. Please contact the registrar desk.",
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
// 📝 2. STUDENT ONLINE REGISTRATION / ACTIVATION (DISABLED)
// ==========================================

router.post("/register-request", async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Public student registration is disabled. Please contact the Sharda Academy Registrar to set up your portal account."
  });
});

router.post("/register-verify", async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Public student registration is disabled."
  });
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
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    console.log(`\n==============================================`);
    console.log(`📧 [PASSWORD RECOVERY] OTP generated for: ${email}`);
    console.log(`🔑 Recovery Code: ${otp}`);
    console.log(`⏳ Code expires in 5 minutes`);
    console.log(`==============================================\n`);

    // Send real email
    try {
      await sendOTPEmail(email.toLowerCase(), otp, "recovery");
    } catch (mailErr) {
      console.error("⚠️ Email send failed (OTP in console):", mailErr.message);
      console.log(`🔑 FALLBACK OTP for ${email}: ${otp}`);
    }

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
