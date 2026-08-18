import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Database Connection Error", error);
    process.exit(1); // stops server if DB fails
  }
};

export default connectDB;