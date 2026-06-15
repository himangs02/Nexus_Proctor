import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    console.log("Dropping existing studentId and facultyId indexes...");
    
    try {
      await collection.dropIndex("studentId_1");
      console.log("Dropped studentId_1");
    } catch (e) {
      console.log("studentId_1 index not found or already dropped.");
    }

    try {
      await collection.dropIndex("facultyId_1");
      console.log("Dropped facultyId_1");
    } catch (e) {
      console.log("facultyId_1 index not found or already dropped.");
    }

    console.log("Creating new sparse unique indexes...");
    await collection.createIndex({ studentId: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ facultyId: 1 }, { unique: true, sparse: true });
    
    console.log("✅ Indexes fixed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing indexes:", err);
    process.exit(1);
  }
};

fixIndexes();
