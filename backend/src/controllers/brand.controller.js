import { getBrand, invalidateBrandCache } from "../config/brand.config.js";
import BrandConfig from "../models/brandConfig.model.js";
import { sendSuccess } from "../utils/response.js";

export const getBrandConfig = async (req, res, next) => {
  try {
    const brand = await getBrand();
    return sendSuccess(res, {
      statusCode: 200,
      message: "Brand config",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBrandConfig = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "primaryColor",
      "accentColor",
      "alertColor",
      "supportEmail",
      "emailFromName",
    ];
    const values = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) values[key] = req.body[key];
    }

    const doc = await BrandConfig.findOneAndUpdate(
      { key: "brand" },
      { key: "brand", values },
      { upsert: true, returnDocument: "after" },
    );

    invalidateBrandCache();
    const brand = await getBrand();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Brand config updated",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};
