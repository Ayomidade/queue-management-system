// controllers/email.controller.jsimport { sendEmail } from "../services/email.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const sendWelcomeEmail = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return sendError(res, {
        statusCode: 400,
        message: "Name and email are required",
      });
    }

    await sendEmail({
      to: email,
      subject: "Welcome to the Smart Queue System!",
      html: `<p>Hello <strong>${name}</strong>, welcome to the Smart Queue System!</p>`,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Welcome email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};
