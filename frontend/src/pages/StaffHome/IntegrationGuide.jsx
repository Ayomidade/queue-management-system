import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./StaffHome.module.css";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const GUIDE_SECTIONS = [
  {
    id: "auth",
    title: "Authentication",
    content: `
### API Key Header

All v1 integration endpoints require an API key passed in the \`X-API-Key\` header:

\`\`\`
X-API-Key: cue_abcdef1234567890...
\`\`\`

The key format is \`cue_\` followed by 48 hex characters.

### Two Auth Paths

| Path | Auth Method | Use Case |
|------|-------------|----------|
| \`/api/v1/*\` | API Key (\`X-API-Key\`) | Bank systems, external integrations |
| \`/api/admin/*\` | JWT Bearer token | Bank admin dashboard (this UI) |
| \`/api/platform/*\` | JWT Bearer token | Superadmin platform console |

> **Key point:** The Cue dashboard uses your JWT login. The API key is for your **bank's own systems** (core banking, mobile app backend, etc.) to call Cue programmatically.
    `,
  },
  {
    id: "scopes",
    title: "Scopes & Permissions",
    content: `
Each API key carries a set of scopes that gate which endpoints it can call. Requestable scopes (bank admin can request):

| Scope | Grants Access To |
|-------|------------------|
| \`branches:read\` | Read branch info, queues, counters, public boards |
| \`branches:write\` | Create, update, and delete branches |
| \`tickets:read\` | Read ticket status, position, ETA |
| \`tickets:write\` | Create/cancel tickets (kiosk, appointments) |
| \`staff:read\` | Read staff for this bank |
| \`staff:write\` | Provision and deactivate staff |
| \`queues:read\` / \`queues:write\` | Read or manage queues |
| \`counters:read\` / \`counters:write\` | Read or manage counters |
| \`analytics:read\` | Analytics, reports, daily summaries |
| \`webhooks:manage\` | Create/delete/toggle tenant webhooks |
| \`admin\` | **Superadmin only** — full access, cannot be requested by bank admins |

Endpoints enforce scopes via the \`requireScope\` middleware. The \`admin\` scope bypasses all checks.
    `,
  },
  {
    id: "rate-limits",
    title: "Rate Limits",
    content: `
### Per-Key Sliding Window (1 minute)

Each API key has a \`rateLimit\` (default 100 req/min, configurable up to 10,000). Limits are tracked **per key**, not per IP — so multiple servers sharing the same key share the same bucket.

### Response Headers

On every v1 response you receive:

| Header | Meaning |
|--------|---------|
| \`X-RateLimit-Limit\` | Max requests allowed this window |
| \`X-RateLimit-Remaining\` | Requests left in current window |
| \`X-RateLimit-Reset\` | Unix timestamp when window resets |

### Exceeded → 429

\`\`\`json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Max 100 requests per minute. Try again in 45s."
}
\`\`\`

The \`Retry-After\` header also indicates seconds until the next window.
    `,
  },
  {
    id: "bank-scoping",
    title: "Bank Scoping (Multi-Tenancy)",
    content: `
Every API key belongs to exactly one bank (\`bankName\`). All \`/api/v1/*\` calls are automatically filtered to that bank's data:

- \`GET /api/v1/branches\` → only branches where \`branch.bank === key.bankName\`
- \`GET /api/v1/queues\` → only queues in those branches
- \`POST /api/v1/tickets\` → ticket created in the key's bank

If a bank admin JWT is present **and** an API key is provided (e.g., admin testing), the \`tenantMatch\` middleware enforces \`admin.bank === key.bankName\` — 403 if they differ.
    `,
  },
  {
    id: "key-lifecycle",
    title: "Key Lifecycle",
    content: `
### Request → Approve → Reveal → Use

1. **Request** — Bank admin submits request via \`POST /api/admin/api-key-requests\` (JWT auth)
2. **Approve** — Superadmin reviews in \`/platform\` console → approves → key created
3. **Reveal** — Bank admin clicks **Reveal key** once → raw key shown in modal → staged ciphertext wiped
4. **Use** — Configure \`X-API-Key: cue_...\` in your systems; key works forever (only hash stored)

### States

| State | Meaning |
|-------|---------|
| \`pending\` | Awaiting superadmin review |
| \`approved\` | Key created, ready for reveal |
| \`rejected\` | Superadmin declined (with note) |

### Key Health (visible to bank admin)

| Status | Meaning |
|--------|---------|
| \`active\` | Key works for integration calls |
| \`suspended\` | Superadmin disabled it → 403 "API key has been disabled" |
| \`revoked\` | Superadmin deleted it → 401 "Invalid or revoked API key" |
| \`null\` | Not yet approved |

> **One-time reveal only.** After reveal, Cue only stores the bcrypt hash — the raw key is **gone forever**. Copy it at reveal time.
    `,
  },
  {
    id: "errors",
    title: "Error Cheat Sheet",
    content: `
| Code | Message | Cause | Fix |
|------|---------|-------|-----|
| 401 | "API key required. Pass it via the X-API-Key header." | Missing header | Add \`X-API-Key\` |
| 401 | "Invalid or revoked API key" | Key deleted or wrong | Check key; request new if revoked |
| 401 | "API key has expired" | \`expiresAt\` passed | Request new key |
| 401 | "API key has expired due to rotation. Use the new key." | Rotated, grace period over | Use new key from superadmin |
| 403 | "API key has been disabled. Contact support." | \`isActive = false\` | Superadmin must re-enable |
| 403 | "Missing required scope(s): X, Y. Your key has: Z" | Scope not granted | Superadmin adds scope or re-approves with more |
| 403 | "Admin bank does not match API key bank" | Tenant mismatch | Ensure key belongs to your bank |
| 429 | "Rate limit exceeded..." | Too many req/min | Back off; respect \`Retry-After\` |
    `,
  },
  {
    id: "workflow",
    title: "Sample Integration Workflow",
    content: `
### 3 Steps to Production

\`\`\`mermaid
sequenceDiagram
  participant Admin as Bank Admin
  participant Cue as Cue API
  participant Systems as Your Systems
  Admin->>Cue: POST /api/admin/api-key-requests (label, scopes)
  Cue-->>Superadmin: Review request
  Superadmin->>Cue: Approve → key created
  Cue-->>Admin: Approved, "Reveal key" available
  Admin->>Cue: GET /api/admin/api-key-requests/:id (reveal)
  Cue-->>Admin: Raw key (cue_...) — **copy once**
  Admin->>Systems: Configure X-API-Key header
  Systems->>Cue: GET /api/v1/branches (X-API-Key)
  Cue-->>Systems: Your bank's branches
\`\`\`

### Minimal Working Example

\`\`\`bash
# 1. Request key (via dashboard or API)
# 2. After approval, reveal & copy key
# 3. Test
curl -s -X GET "https://api.your-cue-instance.com/api/v1/branches" \\
  -H "X-API-Key: cue_yourkeyhere"

# Expected: 200 + your bank's branches array
\`\`\`
    `,
  },
  {
    id: "openapi",
    title: "OpenAPI / Swagger",
    content: `
### Interactive Docs

- **Swagger UI:** \`GET /api/docs\` — browse & try endpoints in browser
- **Raw OpenAPI JSON:** \`GET /api/docs/openapi.json\` — feed to codegen tools (OpenAPI Generator, swagger-codegen, etc.)

\`\`\`bash
# Generate a TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i https://your-cue-instance.com/api/docs/openapi.json \
  -g typescript-axios \
  -o ./cue-client
\`\`\`
    `,
  },
  {
    id: "testing",
    title: "Testing with Postman / Hoppscotch",
    content: `
1. **Create a collection** with base URL: \`https://your-cue-instance.com/api\`
2. **Add a global header:** \`X-API-Key: cue_yourkeyhere\`
3. **Test endpoints:**
   - \`GET /v1/branches\` — verify bank scoping
   - \`GET /v1/queues?branchId=...\` — list queues
   - \`POST /v1/tickets\` — create a ticket (needs \`tickets:write\`)
   - \`GET /v1/tickets/:id\` — check status

> Tip: Use environment variables for the key so you can swap dev/staging/prod keys easily.
    `,
  },
];

/**
 * IntegrationGuide — full integration documentation for bank admins.
 * Mounted at /integration under ProtectedRoute for admin role.
 */
const IntegrationGuide = () => {
  const [openSection, setOpenSection] = useState("auth");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={styles.integrationGuide}
    >
      <header className={styles.guideHeader}>
        <h1>Integration Guide</h1>
        <p className={styles.guideSubtitle}>
          Everything you need to integrate Cue into your bank's systems.
        </p>
        <div className={styles.guideMeta}>
          <span>Base URL: <code>{BASE_URL}</code></span>
          <span>Version: v1</span>
        </div>
      </header>

      <nav className={styles.guideSidebar} aria-label="Guide sections">
        <ul>
          {GUIDE_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                className={openSection === s.id ? styles.guideLinkActive : styles.guideLink}
                onClick={() => setOpenSection(s.id)}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.guideSidebarFooter}>
          <a
            href={`${BASE_URL.replace("/api", "")}/api/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.guideExternalLink}
          >
            ↗ Open Swagger UI
          </a>
        </div>
      </nav>

      <main className={styles.guideContent}>
        {GUIDE_SECTIONS.map((s) =>
          openSection === s.id && (
            <article key={s.id} className={styles.guideSection}>
              <h2>{s.title}</h2>
              <div className={styles.guideMarkdown}>
                {renderMarkdown(s.content)}
              </div>
            </article>
          )
        )}
      </main>
    </motion.div>
  );
};

function renderMarkdown(md) {
  // Minimal markdown → React: headings, code blocks, tables, lists, bold
  const lines = md.trim().split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
      i++;
      continue;
    }

    // Fenced code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={i} className={styles.guideCodeBlock}>
          <code className={lang ? `language-${lang}` : ""}>
            {codeLines.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    // Table
    if (line.startsWith("|") && lines[i + 1]?.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<TableRenderer key={i} lines={tableLines} />);
      continue;
    }

    // Bullet list
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={i}>{items}</ul>);
      continue;
    }

    // Paragraph
    if (line.trim()) {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
    i++;
  }

  return elements;
}

function renderInline(text) {
  // Handle **bold**, `inline code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={idx} className={styles.guideInlineCode}>{part.slice(1, -1)}</code>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function TableRenderer({ lines }) {
  const headers = lines[0].split("|").slice(1, -1).map((h) => h.trim());
  const rows = lines.slice(2).map((row, ri) => {
    const cells = row.split("|").slice(1, -1).map((c) => c.trim());
    return (
      <tr key={ri}>
        {cells.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}
      </tr>
    );
  });
  return (
    <div className={styles.guideTableWrapper}>
      <table>
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export default IntegrationGuide;