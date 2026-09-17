import Groq from "groq-sdk";
import { config } from "dotenv";
import { getBrandSync } from "../config/brand.config.js";

config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are ${getBrandSync().name}, an AI assistant for a bank queue management system. You help customers and staff with queue operations.

You have access to tools that interact with the queue system. Use them when the user asks about tickets, queues, wait times, branches, or analytics.

For customers:
- Help them check their active ticket status, position, and estimated wait time
- Explain how the queue system works
- Help them find branches and check queue lengths

For staff/managers/admins:
- Provide analytics summaries (queue lengths, tickets today, average wait, staff performance)
- Help them understand daily reports and trends
- Answer operational questions about branches and services

Be concise, helpful, and professional. If you don't have enough information to use a tool, ask clarifying questions.`;

const CUSTOMER_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_my_ticket",
      description:
        "Get the current user's active ticket status, position in queue, and estimated wait time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_branch_queues",
      description:
        "Get the current queue lengths and counter status for a specific branch",
      parameters: {
        type: "object",
        properties: {
          branchId: {
            type: "string",
            description: "The MongoDB ObjectId of the branch",
          },
        },
        required: ["branchId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_branches",
      description:
        "List all active branches with their current queue lengths",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

const STAFF_TOOLS = [
  ...CUSTOMER_TOOLS,
  {
    type: "function",
    function: {
      name: "get_branch_analytics",
      description:
        "Get live analytics for a branch: queue lengths, tickets today by status, average wait, counter status",
      parameters: {
        type: "object",
        properties: {
          branchId: {
            type: "string",
            description: "The MongoDB ObjectId of the branch",
          },
        },
        required: ["branchId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_report",
      description:
        "Get the end-of-day summary for a branch: total issued, completed, no-shows, cancelled, busiest service, staff performance",
      parameters: {
        type: "object",
        properties: {
          branchId: {
            type: "string",
            description: "The MongoDB ObjectId of the branch",
          },
          date: {
            type: "string",
            description:
              "Optional date in YYYY-MM-DD format. Defaults to today.",
          },
        },
        required: ["branchId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_staff_performance",
      description:
        "Get staff performance rankings for a branch today: tickets served per staff member",
      parameters: {
        type: "object",
        properties: {
          branchId: {
            type: "string",
            description: "The MongoDB ObjectId of the branch",
          },
        },
        required: ["branchId"],
      },
    },
  },
];

const ADMIN_TOOLS = [
  ...STAFF_TOOLS,
  {
    type: "function",
    function: {
      name: "list_all_branches",
      description:
        "List all branches in the system (admin only), including active status and queue counts",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

export const getToolsForRole = (role) => {
  if (role === "admin") return ADMIN_TOOLS;
  if (role === "manager" || role === "staff") return STAFF_TOOLS;
  return CUSTOMER_TOOLS;
};

export const chat = async ({ messages, tools, toolExecutors }) => {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? "auto" : undefined,
    temperature: 0.7,
    max_tokens: 1024,
  });

  const choice = response.choices[0];

  if (choice.message.tool_calls) {
    const toolResults = [];

    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      const executor = toolExecutors[fnName];
      let result;
      if (executor) {
        try {
          result = await executor(args);
        } catch (err) {
          result = { error: err.message };
        }
      } else {
        result = { error: `Unknown function: ${fnName}` };
      }

      toolResults.push({
        tool_call_id: toolCall.id,
        role: "tool",
        content: JSON.stringify(result),
      });
    }

    const followUp = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
        choice.message,
        ...toolResults,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    return {
      content: followUp.choices[0].message.content,
      toolCalls: choice.message.tool_calls.map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
    };
  }

  return { content: choice.message.content, toolCalls: [] };
};
