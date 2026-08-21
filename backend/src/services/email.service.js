import { Resend } from "resend";
import { config } from "dotenv";

config();
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || "Cue <onboarding@resend.dev>";

/**
 * Send an email via Resend.
 * @param {Object} opts
 * @param {string} opts.to      - recipient email
 * @param {string} opts.subject - email subject
 * @param {string} opts.html    - HTML body
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error.message);
      throw new Error(error.message);
    }

    console.log("Email sent:", data?.id);
    return data;
  } catch (error) {
    console.error("Email failed:", error.message);
    throw error;
  }
};
