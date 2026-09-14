import mongoose from "mongoose";

const brandConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "brand",
    },
    values: {
      name: { type: String, trim: true },
      primaryColor: { type: String, trim: true },
      accentColor: { type: String, trim: true },
      alertColor: { type: String, trim: true },
      supportEmail: { type: String, trim: true },
      emailFromName: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

const BrandConfig = mongoose.model("BrandConfig", brandConfigSchema);
export default BrandConfig;
