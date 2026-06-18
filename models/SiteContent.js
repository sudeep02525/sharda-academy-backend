import mongoose from "mongoose";

const SiteContentSchema = new mongoose.Schema({
  settings: {
    siteTitle: { type: String, default: "Sharda Academy" },
    tagline: { type: String, default: "Excellence in Education" },
    adminEmail: { type: String, default: "sharda.academyofficial@gmail.com" },
    phone: { type: String, default: "+91 93244 44269" },
    address: { type: String, default: "Mankhurd-43, Mumbai" }
  },
  hero: {
    title: { type: String, default: "Nurturing Minds & Building Board Exam Toppers from Class 1st to 12th" },
    highlight: { type: String, default: "Board Exam Toppers" },
    description: { type: String, default: "Sharda Academy, Mankhurd-43 — Mumbai's most trusted coaching institute for academic excellence." },
    image: { type: String, default: "/uploads/images/hero_student.png" }
  },
  stats: [{
    value: String,
    label: String
  }],
  wings: [{
    tag: String,
    tc: String,
    bg: String,
    title: String,
    sub: String,
    points: [String],
    link: String,
    image: String
  }],
  facilities: [{
    img: String,
    title: String,
    desc: String,
    icon: String // We might store SVG as string or just use the img field
  }],
  benefits: [{
    title: String,
    desc: String,
    icon: String, // SVG string
    image: String // Actual image upload fallback
  }],
  toppers: [{
    name: String,
    rank: String,
    exam: String,
    score: String,
    c: String,
    bg: String,
    avatar: String, // Initials
    image: String // Uploaded photo
  }],
  mentors: [{
    name: String,
    role: String,
    exp: String,
    text: String,
    image: String
  }],
  gallery: [{
    url: String,
    caption: String
  }],
  testimonials: [{
    stars: Number,
    text: String,
    author: String,
    role: String,
    avatar: String,
    image: String
  }]
}, { timestamps: true });

const SiteContent = mongoose.model("SiteContent", SiteContentSchema);
export default SiteContent;
