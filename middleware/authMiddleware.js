import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify user authentication via token
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "sharda_academy_super_secret_key_2026_sams");
      
      req.user = await User.findById(decoded.id).select("-password -otp");
      if (!req.user) {
        return res.status(401).json({ success: false, message: "User not found or authorization failed" });
      }
      next();
    } catch (error) {
      console.error("JWT Error:", error);
      return res.status(401).json({ success: false, message: "Invalid or expired authorization token" });
    }
  } else {
    return res.status(401).json({ success: false, message: "No authorization token provided" });
  }
};

// Gatekeeper for role validations
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted for the '${req.user?.role || "anonymous"}' role`,
      });
    }
    next();
  };
};
