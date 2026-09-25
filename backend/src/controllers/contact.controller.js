import { sendSuccess } from "../utils/response.js";
import { sendEmail } from "../services/email.service.js";
import { escapeHtml } from "../utils/security.js";
import { getBrandSync } from "../config/brand.config.js";

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, organization, branches, message } = req.body;

    const html = `
      <h2>New Demo Request</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Organization:</strong> ${escapeHtml(organization)}</p>
      <p><strong>Branches:</strong> ${escapeHtml(branches)}</p>
      ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ""}
    `;

    sendEmail({
      to: process.env.CONTACT_EMAIL || process.env.RESEND_FROM || "admin@example.com",
      subject: `${getBrandSync().name} Demo Request — ${organization}`,
      html,
    }).catch(() => {});

    return sendSuccess(res, {
      statusCode: 201,
      message: "Request received. We'll be in touch within one business day.",
      data: { reference: `R${Date.now().toString(36).toUpperCase()}` },
    });
  } catch (error) {
    next(error);
  }
};
