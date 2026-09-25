import crypto from "crypto";

export const hashPublicToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createPublicToken = () => crypto.randomBytes(32).toString("base64url");

export const safeEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const publicTicket = (ticket, extra = {}) => {
  const queue = ticket.queue && typeof ticket.queue === "object" ? ticket.queue : null;
  const branch = ticket.branch && typeof ticket.branch === "object" ? ticket.branch : null;
  return {
    id: ticket._id,
    ticketId: ticket._id,
    kioskId: ticket.kioskId,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    priority: ticket.priority,
    guestName: ticket.guestName,
    queue: queue ? { id: queue._id, serviceName: queue.serviceName } : ticket.queue,
    branch: branch ? { id: branch._id, name: branch.name, location: branch.location } : ticket.branch,
    position: ticket.position,
    estimatedWaitMinutes: ticket.estimatedWaitMinutes,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    ...extra,
  };
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const csvField = (value) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export const isPrivateHostname = (hostname) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const ipv4 = normalized.replace(/^::ffff:/, "").match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = ipv4.slice(1).map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

export const validateWebhookUrl = async (value) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, message: "Webhook URL must be a valid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, message: "Webhook URL must use HTTPS" };
  }
  if (isPrivateHostname(parsed.hostname)) {
    return { valid: false, message: "Webhook URL must not target a private network" };
  }
  try {
    const records = await dnsLookup(parsed.hostname);
    if (records.some(({ address }) => isPrivateHostname(address))) {
      return { valid: false, message: "Webhook URL resolves to a private network" };
    }
  } catch {
    return { valid: false, message: "Webhook hostname could not be resolved" };
  }
  return { valid: true, url: parsed.toString() };
};

const dnsLookup = (hostname) =>
  new Promise((resolve, reject) => {
    import("node:dns").then(({ promises }) => promises.lookup(hostname, { all: true })).then(resolve, reject);
  });
