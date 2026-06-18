import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      await mongoose.connection.db.collection('fees').dropIndex("invoiceNumber_1");
      console.log("Dropped invoiceNumber_1 index successfully.");
    } catch(err) {
      console.error("Drop index error:", err.message);
    }
    process.exit(0);
  });
