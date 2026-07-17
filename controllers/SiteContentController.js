import SiteContent from "../models/SiteContent.js";
import ActivityLog from "../models/ActivityLog.js";

// @desc    Get website content
// @route   GET /api/sams/content
// @access  Public
export const getSiteContent = async (req, res) => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      // Return empty if not seeded yet, though seed.js should handle it
      content = new SiteContent();
    }
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update website content
// @route   PUT /api/sams/admin/content
// @access  Private (Admin)
export const updateSiteContent = async (req, res) => {
  try {
    let content = await SiteContent.findOne();
    if (!content) {
      content = new SiteContent();
    }

    const updates = req.body;
    
    // Basic validation
    if (updates.seo && updates.seo.title && updates.seo.title.length > 100) {
      return res.status(400).json({ success: false, message: "SEO title cannot exceed 100 characters" });
    }
    
    // Update fields
    if (updates.settings) content.settings = { ...content.settings, ...updates.settings };
    if (updates.seo) content.seo = { ...content.seo, ...updates.seo };
    if (updates.hero) content.hero = { ...content.hero, ...updates.hero };
    if (updates.stats) content.stats = updates.stats;
    if (updates.wings) content.wings = updates.wings;
    if (updates.facilities) content.facilities = updates.facilities;
    if (updates.benefits) content.benefits = updates.benefits;
    if (updates.toppers) content.toppers = updates.toppers;
    if (updates.mentors) content.mentors = updates.mentors;
    if (updates.gallery) content.gallery = updates.gallery;
    if (updates.testimonials) content.testimonials = updates.testimonials;

    await content.save();

    await new ActivityLog({ action: `Admin updated main website content` }).save();

    res.status(200).json({ success: true, message: "Website content updated successfully", data: content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload media for website (gallery/facilities)
// @route   POST /api/sams/admin/upload-media
// @access  Private (Admin)
export const uploadSiteMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    // req.file.path is provided by CloudinaryStorage
    const fileUrl = req.file.path;
    
    await new ActivityLog({ action: `Admin uploaded new media file: ${req.file.originalname || 'image'}` }).save();

    res.status(200).json({ success: true, message: "Media uploaded successfully", url: fileUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
