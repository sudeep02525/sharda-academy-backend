import mongoose from "mongoose";
import dotenv from "dotenv";
import SiteContent from "./models/SiteContent.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sharda-academy";

const seedContent = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await SiteContent.findOne();
    if (existing) {
      console.log("Site content already seeded.");
      process.exit(0);
    }

    const content = new SiteContent({
      settings: {
        siteTitle: "Sharda Academy",
        tagline: "Excellence in Education",
        adminEmail: "admin@sharda.com",
        phone: "+91 93244 44269",
        address: "Mankhurd-43, Mumbai"
      },
      hero: {
        title: "Nurturing Minds & Building Board Exam Toppers from Class 1st to 12th",
        highlight: "Board Exam Toppers",
        description: "Sharda Academy, Mankhurd-43 — Mumbai's most trusted coaching institute for academic excellence. We combine professional Board expert mentorship with high-tech smart classrooms and advanced biometric safety to deliver top Board results."
      },
      wings: [
        {
          tag: "ALL SUBJECTS",
          tc: "#0c46c4",
          bg: "#dbeafe",
          title: "Class 1st to 10th",
          sub: "Comprehensive Board Foundation",
          points: ["All Subjects Covered", "Dedicated Subject Mentors", "Weekly Practice & Tests"],
          link: "#admission"
        },
        {
          tag: "SCIENCE (PCM / PCB / PCMB)",
          tc: "#d97706",
          bg: "#fef3c7",
          title: "Class 11th & 12th Science",
          sub: "Academic Board & Concept Focused",
          points: ["Physics, Chemistry, Maths & Bio", "Concept-Based Learning Flow", "State-Board Pattern Focus"],
          link: "#admission"
        },
        {
          tag: "COMMERCE Stream",
          tc: "#dc2626",
          bg: "#fee2e2",
          title: "Class 11th & 12th Commerce",
          sub: "Professional Commercial Foundations",
          points: ["Accounts, OCM & Economics", "Expert Board Specialized Faculty", "Affordable Fee Structure"],
          link: "#admission"
        }
      ],
      facilities: [
        {
          img: "/facility_smart_panel.png",
          title: "Interactive Smart Panels",
          desc: "Our classrooms are equipped with high-definition digital smart boards enabling highly interactive and visual concepts representation.",
          icon: ""
        },
        {
          img: "/facility_ac_comfort.png",
          title: "Full Air-Conditioned Comfort",
          desc: "Acoustically insulated and climate-controlled classroom environments ensuring absolute focus and temperature comfort for your child.",
          icon: ""
        },
        {
          img: "/facility_biometric.png",
          title: "Biometric Attendance & Safety",
          desc: "Daily biometric check-in system that instantly logs students' attendance, sending real-time automated updates to parents.",
          icon: ""
        }
      ],
      benefits: [
        { title: "Experienced & Dedicated Faculty", desc: "Senior Board experts bringing a combined legacy of excellence.", icon: "faculty" },
        { title: "Personal Attention to Every Student", desc: "Focused attention to match each student's learning pace.", icon: "attention" },
        { title: "Small Batch Size Better Learning", desc: "Strictly limited batches for active classroom interaction.", icon: "batch" },
        { title: "Regular Tests & Assessments", desc: "Weekly mock tests to track performance under board conditions.", icon: "tests" },
        { title: "Doubt Solving Sessions", desc: "One-on-one session slots to resolve all academic questions.", icon: "doubts" },
        { title: "Complete Study Material", desc: "Curated workbooks, formula sheets, and past question banks.", icon: "material" },
        { title: "Board Exam Special Preparation", desc: "Targeted strategies to excel in Maharashtra SSC & HSC Exams.", icon: "board" },
        { title: "Parent Progress Updates", desc: "Real-time updates on attendance and monthly academic reports.", icon: "updates" }
      ],
      toppers: [
        {
          name: "Aditya Sharma",
          rank: "HSC Board Topper",
          exam: "HSC Board Exam Scorer",
          score: "99.2% Board Result",
          c: "#d97706",
          bg: "#fef3c7",
          avatar: "AS"
        },
        {
          name: "Priya Gupta",
          rank: "SSC Board Topper",
          exam: "SSC Board Exam Scorer",
          score: "98.8% Board Result",
          c: "#0c46c4",
          bg: "#dbeafe",
          avatar: "PG"
        },
        {
          name: "Aryan Khan",
          rank: "HSC Science Topper",
          exam: "HSC Board Exam Scorer",
          score: "98.4% Board Result",
          c: "#dc2626",
          bg: "#fee2e2",
          avatar: "AK"
        }
      ],
      mentors: [
        {
          name: "Dr. S. K. Roy",
          role: "Physics Head",
          exp: "Ph.D. in Physics, 15+ Yrs Exp.",
          text: "Senior Board Expert specializing in Physics board exam preparation."
        },
        {
          name: "Mrs. Priya Patil",
          role: "Mathematics lead",
          exp: "M.Sc. in Mathematics, 12+ Yrs Exp.",
          text: "Board Exam Expert guiding students to 100% conceptual clarity."
        }
      ],
      gallery: [
        { url: "/campus_moment_1.png", caption: "Campus Moment 1" },
        { url: "/campus_moment_2.png", caption: "Campus Moment 2" },
        { url: "/campus_moment_3.png", caption: "Campus Moment 3" },
        { url: "/campus_moment_4.png", caption: "Campus Moment 4" }
      ],
      testimonials: [
        {
          stars: 5,
          text: "The curriculum here is designed to make children critical thinkers. The biometric safety combined with the professional teaching style has been the key to my child's academic success.",
          author: "Mr. Suresh Patil",
          role: "Parent of Class 10th Topper",
          avatar: "SP"
        },
        {
          stars: 5,
          text: "Sharda Academy does not feel like an overcrowded classes. It is a personalized learning home where the mentors spend quality time explaining every single conceptual doubt with infinite patience.",
          author: "Mrs. Anjali Roy",
          role: "Parent of HSC Science Achiever",
          avatar: "AR"
        },
        {
          stars: 5,
          text: "The conceptual sheets and weekly mock exams prepared by board specialists transformed my daughter's confidence. She scored 98.8% in her board exams. The biometric tracking alerts are incredibly reassuring.",
          author: "Mr. Rajesh Gupta",
          role: "Parent of SSC Board Topper",
          avatar: "RG"
        }
      ]
    });

    await content.save();
    console.log("Successfully seeded default Site Content.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding content:", error);
    process.exit(1);
  }
};

seedContent();
