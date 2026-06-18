import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const updateImage = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // update SiteContent where hero.image is the missing one
    const res = await db.collection("sitecontents").updateMany(
      { "hero.image": "/uploads/images/hero_student.png" },
      { $set: { "hero.image": "/hero_classroom.png" } }
    );
    
    console.log("Updated SiteContent image successfully. Modified count:", res.modifiedCount);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

updateImage();
