import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MONGODB_URI = process.env.MONGODB_URI;

const frontendPublicDir = path.join(process.cwd(), '../sharda-academy-main/public');
const backendUploadsDir = path.join(process.cwd(), 'uploads/images');

const urlMap = {};

const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    return null;
  }
};

const processDirectory = async (dirPath, folderName) => {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.match(/\.(png|jpe?g|gif|svg|webp)$/i)) {
      const filePath = path.join(dirPath, file);
      console.log(`Uploading ${file}...`);
      const url = await uploadToCloudinary(filePath, `sharda-academy/${folderName}`);
      if (url) {
        urlMap[`/${file}`] = url;
        urlMap[`/uploads/images/${file}`] = url;
      }
    }
  }
};

const replaceUrlsInObject = (obj) => {
  let modified = false;
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string' && urlMap[obj[i]]) {
        obj[i] = urlMap[obj[i]];
        modified = true;
      } else if (typeof obj[i] === 'object' && obj[i] !== null) {
        if (replaceUrlsInObject(obj[i])) modified = true;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (urlMap[obj[key]]) {
          obj[key] = urlMap[obj[key]];
          modified = true;
        }
      } else if (typeof obj[key] === 'object') {
        if (replaceUrlsInObject(obj[key])) modified = true;
      }
    }
  }
  return modified;
};

const migrateDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.collections();

    for (const collection of collections) {
      const collectionName = collection.collectionName;
      if (collectionName.startsWith('system.')) continue;
      
      const documents = await collection.find({}).toArray();
      let updatedCount = 0;

      for (const doc of documents) {
        // Create a deep copy to avoid modifying the _id directly during check
        const originalDoc = JSON.parse(JSON.stringify(doc));
        if (replaceUrlsInObject(doc)) {
          // Remove _id from doc so we can update
          const { _id, ...updateFields } = doc;
          await collection.updateOne({ _id: originalDoc._id }, { $set: updateFields });
          updatedCount++;
        }
      }
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} documents in collection: ${collectionName}`);
      }
    }
    console.log("Database migration completed.");
  } catch (error) {
    console.error("Database migration error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

const run = async () => {
  console.log("Starting Cloudinary migration...");
  await processDirectory(frontendPublicDir, 'frontend');
  await processDirectory(backendUploadsDir, 'uploads');
  
  console.log("Uploads completed. URL Mapping:");
  console.log(JSON.stringify(urlMap, null, 2));

  fs.writeFileSync('cloudinary-map.json', JSON.stringify(urlMap, null, 2));
  console.log("Map saved to cloudinary-map.json");

  console.log("Starting database migration...");
  await migrateDatabase();
  console.log("All done!");
};

run();
