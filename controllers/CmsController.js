import SiteContent from "../models/SiteContent.js";
import ActivityLog from "../models/ActivityLog.js";

export class CmsController {
  // --- Public GET endpoints ---

  static async getHero(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.hero });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAbout(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: { stats: content.stats, benefits: content.benefits } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getCourses(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.wings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getFacilities(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.facilities });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getFaculty(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.mentors });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getGallery(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.gallery });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getToppers(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.toppers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTestimonials(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: content.testimonials });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSettings(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      res.status(200).json({ success: true, data: { settings: content.settings, seo: content.seo } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- Admin PUT endpoints (Single objects) ---

  static async updateHero(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.hero = { ...content.hero, ...req.body };
      await content.save();
      await new ActivityLog({ action: "Admin updated Hero section" }).save();
      res.status(200).json({ success: true, message: "Hero updated successfully", data: content.hero });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateAbout(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      if (req.body.stats) content.stats = req.body.stats;
      if (req.body.benefits) content.benefits = req.body.benefits;
      await content.save();
      await new ActivityLog({ action: "Admin updated About section" }).save();
      res.status(200).json({ success: true, message: "About section updated successfully", data: { stats: content.stats, benefits: content.benefits } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateSettings(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      if (req.body.settings) content.settings = { ...content.settings, ...req.body.settings };
      if (req.body.seo) content.seo = { ...content.seo, ...req.body.seo };
      await content.save();
      await new ActivityLog({ action: "Admin updated Settings" }).save();
      res.status(200).json({ success: true, message: "Settings updated successfully", data: { settings: content.settings, seo: content.seo } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- Admin CRUD for Arrays ---

  // Courses (wings)
  static async createCourse(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.wings.push(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin added a Course" }).save();
      res.status(201).json({ success: true, message: "Course added successfully", data: content.wings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateCourse(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      const item = content.wings.id(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: "Course not found" });
      item.set(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin updated a Course" }).save();
      res.status(200).json({ success: true, message: "Course updated successfully", data: content.wings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteCourse(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      content.wings.pull(req.params.id);
      await content.save();
      await new ActivityLog({ action: "Admin deleted a Course" }).save();
      res.status(200).json({ success: true, message: "Course deleted successfully", data: content.wings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Facilities
  static async createFacility(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.facilities.push(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin added a Facility" }).save();
      res.status(201).json({ success: true, message: "Facility added successfully", data: content.facilities });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateFacility(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      const item = content.facilities.id(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: "Facility not found" });
      item.set(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin updated a Facility" }).save();
      res.status(200).json({ success: true, message: "Facility updated successfully", data: content.facilities });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteFacility(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      content.facilities.pull(req.params.id);
      await content.save();
      await new ActivityLog({ action: "Admin deleted a Facility" }).save();
      res.status(200).json({ success: true, message: "Facility deleted successfully", data: content.facilities });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Faculty (mentors)
  static async createFaculty(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.mentors.push(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin added Faculty" }).save();
      res.status(201).json({ success: true, message: "Faculty added successfully", data: content.mentors });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateFaculty(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      const item = content.mentors.id(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: "Faculty not found" });
      item.set(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin updated Faculty" }).save();
      res.status(200).json({ success: true, message: "Faculty updated successfully", data: content.mentors });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteFaculty(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      content.mentors.pull(req.params.id);
      await content.save();
      await new ActivityLog({ action: "Admin deleted Faculty" }).save();
      res.status(200).json({ success: true, message: "Faculty deleted successfully", data: content.mentors });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Gallery
  static async createGallery(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.gallery.push(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin added to Gallery" }).save();
      res.status(201).json({ success: true, message: "Gallery item added successfully", data: content.gallery });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteGallery(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      content.gallery.pull(req.params.id);
      await content.save();
      await new ActivityLog({ action: "Admin deleted from Gallery" }).save();
      res.status(200).json({ success: true, message: "Gallery item deleted successfully", data: content.gallery });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Toppers
  static async createTopper(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.toppers.push(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin added a Topper" }).save();
      res.status(201).json({ success: true, message: "Topper added successfully", data: content.toppers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateTopper(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      const item = content.toppers.id(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: "Topper not found" });
      item.set(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin updated a Topper" }).save();
      res.status(200).json({ success: true, message: "Topper updated successfully", data: content.toppers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteTopper(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      content.toppers.pull(req.params.id);
      await content.save();
      await new ActivityLog({ action: "Admin deleted a Topper" }).save();
      res.status(200).json({ success: true, message: "Topper deleted successfully", data: content.toppers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Testimonials
  static async createTestimonial(req, res) {
    try {
      const content = await SiteContent.findOne() || new SiteContent();
      content.testimonials.push(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin added a Testimonial" }).save();
      res.status(201).json({ success: true, message: "Testimonial added successfully", data: content.testimonials });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateTestimonial(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      const item = content.testimonials.id(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: "Testimonial not found" });
      item.set(req.body);
      await content.save();
      await new ActivityLog({ action: "Admin updated a Testimonial" }).save();
      res.status(200).json({ success: true, message: "Testimonial updated successfully", data: content.testimonials });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteTestimonial(req, res) {
    try {
      const content = await SiteContent.findOne();
      if (!content) return res.status(404).json({ success: false, message: "Content not found" });
      content.testimonials.pull(req.params.id);
      await content.save();
      await new ActivityLog({ action: "Admin deleted a Testimonial" }).save();
      res.status(200).json({ success: true, message: "Testimonial deleted successfully", data: content.testimonials });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
