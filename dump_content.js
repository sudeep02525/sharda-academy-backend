import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteContent from './models/SiteContent.js';
dotenv.config();

async function dump() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const content = await SiteContent.findOne();
        console.log(JSON.stringify(content, null, 2));
    } catch(err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
}
dump();
