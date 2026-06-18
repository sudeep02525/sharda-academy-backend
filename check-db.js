import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sharda-sams-db")
  .then(async () => {
    const fee = await mongoose.connection.db.collection('fees').find().sort({createdAt: -1}).limit(5).toArray();
    console.log("FEES:");
    console.log(fee.map(f => f.invoiceId));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
