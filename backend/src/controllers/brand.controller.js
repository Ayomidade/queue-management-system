import { getBrand } from "../config/brand.config.js";
import { sendSuccess } from "../utils/response.js";

/**
 * Brand Controller
 *
 * GET /api/brand — Returns brand config from environment variables.
 * No update endpoint — branding is configured via .env files.
 */

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
