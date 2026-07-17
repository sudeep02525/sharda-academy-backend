import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hero from './models/cms/Hero.js';
import About from './models/cms/About.js';
import Course from './models/cms/Course.js';
import Facility from './models/cms/Facility.js';
import Faculty from './models/cms/Faculty.js';
import Gallery from './models/cms/Gallery.js';
import Topper from './models/cms/Topper.js';
import Testimonial from './models/cms/Testimonial.js';
import SiteSettings from './models/cms/SiteSettings.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for Seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  try {
    // Clear old data
    await Hero.deleteMany();
    await About.deleteMany();
    await Course.deleteMany();
    await Facility.deleteMany();
    await Faculty.deleteMany();
    await Gallery.deleteMany();
    await Topper.deleteMany();
    await Testimonial.deleteMany();
    await SiteSettings.deleteMany();

    // Hero
    await Hero.create({
      title: 'Nurturing Minds & Building Board Exam Toppers from Class 1st to 12th',
      highlight: 'Board Exam Toppers',
      description: "Sharda Academy, Mankhurd-43 — Mumbai's most trusted coaching institute for academic excellence.",
      image: '/uploads/images/hero_student.png',
      buttons: [
        { label: 'Apply Online', link: '/admission' },
        { label: 'Counselling', link: '/contact' }
      ]
    });

    // About
    await About.create({
      heading: 'About Sharda Academy',
      description: 'Sharda Academy provides quality education, professional training, and skill development programs designed to help students achieve academic excellence, practical knowledge, and career success.',
      image: '/uploads/images/hero_classroom.png'
    });

    // Facilities
    await Facility.insertMany([
      { title: 'Modern Classrooms', description: 'Air-conditioned and smart classrooms for better learning.', image: '/uploads/images/hero_classroom.png' },
      { title: 'Library', description: 'Vast collection of books and quiet study space.', image: '/uploads/images/hero_student.png' }
    ]);

    // Faculty
    await Faculty.insertMany([
      { name: 'John Doe', qualification: 'M.Sc. Mathematics', experience: '10 Years', image: '/uploads/images/hero_student.png' },
      { name: 'Jane Smith', qualification: 'Ph.D. Physics', experience: '12 Years', image: '/uploads/images/hero_student.png' }
    ]);

    // Toppers
    await Topper.insertMany([
      { name: 'Rahul Kumar', marks: '98%', year: '2025', image: '/uploads/images/hero_student.png' },
      { name: 'Sneha Patel', marks: '96%', year: '2025', image: '/uploads/images/hero_student.png' }
    ]);

    // Testimonials
    await Testimonial.insertMany([
      { name: 'Amit Singh', review: 'Excellent faculty and study material.', rating: 5 },
      { name: 'Priya Sharma', review: 'Highly recommend for board preparation.', rating: 5 }
    ]);

    // Settings
    await SiteSettings.create({
      phone: '+91 93244 44269',
      email: 'sharda.academyofficial@gmail.com',
      address: 'Mankhurd-43, Mumbai',
      socialLinks: {
        facebook: 'https://facebook.com',
        instagram: 'https://instagram.com',
        youtube: 'https://youtube.com'
      }
    });

    console.log('Modular CMS Data Seeded Successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding data', error);
    process.exit(1);
  }
};

seedData();
