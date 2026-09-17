import { config } from "dotenv";
config();

const TIMEOUT_MS = 10000;

export const sendNotification = async ({ webhookUrl, message }) => {
  if (!webhookUrl) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
      signal: controller.signal,
    });

    clearTimeout(timer);
  } catch {
    // fire-and-forget
  }
};

export const buildTicketCalledMessage = (ticketNumber, branchName, serviceName) =>
  `**Ticket #${String(ticketNumber).padStart(4, "0")}** is now being served at **${branchName}** — ${serviceName}`;

export const buildQueueThresholdMessage = (branchName, serviceName, count) =>
  `**Queue alert:** ${branchName} — ${serviceName} queue has reached **${count}** waiting customers`;

export const buildDayClosedMessage = (branchName, ticketsCompleted) =>
  `**${branchName}** day closed — ${ticketsCompleted} tickets completed`;

export const buildDayOpenedMessage = (branchName) =>
  `**${branchName}** is now open for business`;
