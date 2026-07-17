import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import bcryptjs from "bcryptjs";

// @desc    Change own password
// @route   POST /api/sams/user/change-password
// @access  Private (All Roles)
export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current and new passwords are required" });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    // Verify current password
    const isMatch = bcryptjs.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid current password" });
    }
    // Hash and save new password
    const salt = bcryptjs.genSaltSync(10);
    user.password = bcryptjs.hashSync(newPassword, salt);
    await user.save();
    
    await new ActivityLog({ action: `${user.role} '${user.name}' changed their security password` }).save();
    return res.status(200).json({ success: true, message: "Your security password has been changed successfully!" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/sams/user/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/sams/user/profile
// @access  Private (All Roles)
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.file) user.profilePhoto = req.file.path; // multer-storage-cloudinary gives path/secure_url

    await user.save();
    
    // Log activity
    await new ActivityLog({ action: `User ${user.name} updated their profile` }).save();

    res.status(200).json({ success: true, message: "Profile updated successfully", data: { phone: user.phone, profilePhoto: user.profilePhoto } });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// Admin: Register User
export const registerUser = async (req, res, next) => {
  const { 
    name, email, phone, role, password, rollNumber, classLevel, batch, stream, subjects, biometricId, parentEmail,
    dob, gender, bloodGroup, aadhaarNo, homeAddress, fatherName, fatherPhone, fatherEmail, motherName, motherPhone, motherEmail,
    status
  } = req.body;

  if (!name || !email || !phone || !role) {
    return res.status(400).json({ success: false, message: "Name, email, phone, and role indicators are required" });
  }

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: "An account with this email is already registered" });
    }

    let savedPhotoUrl = "";
    if (req.file) {
      savedPhotoUrl = req.file.path;
    }

    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password || "12345678", salt);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone,
      role,
      password: hashedPassword,
      rollNumber,
      classLevel: classLevel ? parseInt(classLevel) : null,
      batch,
      stream,
      subjects,
      biometricId: biometricId || null,
      parentEmail: parentEmail ? parentEmail.toLowerCase() : "",
      dob: dob || "",
      gender: gender || "",
      bloodGroup: bloodGroup || "",
      aadhaarNo: aadhaarNo || "",
      homeAddress: homeAddress || "",
      fatherName: fatherName || "",
      fatherPhone: fatherPhone || "",
      fatherEmail: fatherEmail || "",
      motherName: motherName || "",
      motherPhone: motherPhone || "",
      motherEmail: motherEmail || "",
      profilePhoto: savedPhotoUrl,
      status: status || "Active"
    });

    await newUser.save();
    await new ActivityLog({ action: `Registered new ${role} profile: '${name}'` }).save();
    return res.status(201).json({ success: true, message: `Account registered successfully for '${name}' as '${role}'`, user: newUser });
  } catch (error) {
    next(error);
  }
};

// Admin: Modify/Update User details
export const updateUser = async (req, res, next) => {
  const userId = req.params.id;
  const updates = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Target account not found" });
    }

    if (req.file) {
      user.profilePhoto = req.file.path;
    } else if (updates.profilePhoto === "") {
      user.profilePhoto = "";
    }

    Object.keys(updates).forEach((key) => {
      if (key === "profilePhoto") return;
      if (updates[key] !== undefined && updates[key] !== "") {
        if (key === "email" || key === "parentEmail") {
          user[key] = updates[key].toLowerCase();
        } else if (key === "password") {
          const salt = bcryptjs.genSaltSync(10);
          user.password = bcryptjs.hashSync(updates.password, salt);
        } else {
          user[key] = updates[key];
        }
      }
    });

    await user.save();
    await new ActivityLog({ action: `Modified student record for '${user.name}'` }).save();
    return res.status(200).json({ success: true, message: "Account record updated successfully", user });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete User account
export const deleteUser = async (req, res, next) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Target account not found" });
    }
    await User.findByIdAndDelete(userId);
    await new ActivityLog({ action: `Deleted student record of '${user.name}'` }).save();
    return res.status(200).json({ success: true, message: `Account record for '${user.name}' has been deleted successfully` });
  } catch (error) {
    next(error);
  }
};
