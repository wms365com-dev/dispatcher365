const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const express = require("express");
const dotenv = require("dotenv");
const { execa } = require("execa");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json({ limit: "1mb" }));

const BOT_STARTED_AT = Date.now();
const BOT_ROOT = __dirname;
const LOG_DIR = path.join(BOT_ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "commands.log");
const LAST_CODEX_OUTPUT_FILE = path.join(LOG_DIR, "last-codex-output.txt");
const LAST_CODEX_META_FILE = path.join(LOG_DIR, "last-codex-meta.json");
const DEFAULT_WEBHOOK_PATH = "/telegram/webhook";
const TELEGRAM_API_BASE = "https://api.telegram.org";
const DEPLOY_CONFIRM_WINDOW_MS = 5 * 60 * 1000;
const CODEX_TIMEOUT_MS = 15 * 60 * 1000;
const DEPLOY_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MESSAGE_LIMIT = 3500;

const REQUIRED_ENV_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_URL",
  "ALLOWED_TELEGRAM_USER_ID",
  "ALLOWED_TELEGRAM_CHAT_ID",
  "PROJECT_NAME",
  "PROJECT_ROOT",
  "DEPLOY_COMMAND"
];

const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
  telegramWebhookUrl: process.env.TELEGRAM_WEBHOOK_URL?.trim() ?? "",
  allowedTelegramUserId: process.env.ALLOWED_TELEGRAM_USER_ID?.trim() ?? "",
  allowedTelegramChatId: process.env.ALLOWED_TELEGRAM_CHAT_ID?.trim() ?? "",
  projectName: process.env.PROJECT_NAME?.trim() ?? "ship365",
  projectRoot: process.env.PROJECT_ROOT?.trim() ?? "",
  deployCommand: process.env.DEPLOY_COMMAND?.trim() ?? "",
  port: Number(process.env.PORT ?? 8080)
};

const runtimeState = {
  pendingDeploy: null,
  codexRun: null
};

ensureRuntimeFiles();
validateConfiguration();

const webhookPath = getWebhookPath(config.telegramWebhookUrl);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    project: config.projectName,
    webhookPath,
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.post(webhookPath, async (req, res) => {
  res.sendStatus(200);

  try {
    const message = req.body?.message;

    if (!message || typeof message.text !== "string") {
      logEvent({
        kind: "ignored",
        status: "ignored",
        reason: "No text message in update"
      });
      return;
    }

    await handleTelegramMessage(message);
  } catch (error) {
    logEvent({
      kind: "error",
      status: "failed",
      message: error?.message ?? String(error),
      stack: error?.stack
    });
  }
});

app.listen(config.port, () => {
  const message = `Telegram controller listening on port ${config.port} for ${config.projectName}`;
  console.log(message);
  logEvent({
    kind: "startup",
    status: "ok",
    message,
    webhookPath
  });
});

async function handleTelegramMessage(message) {
  const chatId = String(message.chat?.id ?? "");
  const userId = String(message.from?.id ?? "");
  const rawText = message.text.trim();
  const { command, args, normalizedText } = parseTelegramCommand(rawText);

  if (!isAuthorized(chatId, userId)) {
    logEvent({
      kind: "auth",
      status: "rejected",
      command,
      text: normalizedText,
      chatId,
      userId,
      reason: "Unauthorized chat or user"
    });
    return;
  }

  const context = {
    chatId,
    userId,
    command,
    args,
    text: normalizedText
  };

  switch (command) {
    case "/start":
      await respond(context, buildStartMessage());
      return;
    case "/help":
      await respond(context, buildHelpMessage());
      return;
    case "/status":
      await handleStatus(context);
      return;
    case "/gitstatus":
      await handleGitStatus(context);
      return;
    case "/codex":
      await handleCodex(context);
      return;
    case "/deploy":
      await handleDeployRequest(context);
      return;
    case "/confirmdeploy":
      await handleDeployConfirm(context);
      return;
    case "/logs":
      await handleLogs(context);
      return;
    case "/last":
      await handleLastResult(context);
      return;
    case "/cancel":
      await handleCancel(context);
      return;
    default:
      await respond(
        context,
        `Unknown command for ${config.projectName}.\n\nUse /help to see the approved command set.`
      );
  }
}

function buildStartMessage() {
  return [
    `Ship365 Telegram controller is online for ${config.projectName}.`,
    "",
    "Available commands:",
    "/start",
    "/help",
    "/status",
    "/gitstatus",
    "/codex [task description]",
    "/deploy",
    "/confirmdeploy",
    "/logs",
    "/last",
    "/cancel"
  ].join("\n");
}

function buildHelpMessage() {
  return [
    `Ship365 controller commands for ${config.projectName}:`,
    "",
    "/start",
    "Show project name and available commands.",
    "",
    "/status",
    "Show project root, git branch, last commit, server uptime, and bot status.",
    "",
    "/gitstatus",
    "Run git status inside the approved Ship365 project root only.",
    "",
    "/codex compare ship365.co layout with aesonretailsolutions.com and improve the UI to match the original project while making it cleaner and easier to use",
    "Run a Codex task only inside the approved Ship365 project root.",
    "",
    "/deploy",
    "Request a deploy confirmation window.",
    "",
    "/confirmdeploy",
    "Run the approved deploy command only after /deploy and only within 5 minutes.",
    "",
    "/logs",
    "Show the latest 50 log lines from telegram-bot/logs/commands.log.",
    "",
    "/last",
    "Show the last Codex task result saved by the bot.",
    "",
    "/cancel",
    "Cancel the current pending deploy confirmation."
  ].join("\n");
}

async function handleStatus(context) {
  const [branchResult, commitResult] = await Promise.all([
    runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: config.projectRoot,
      timeout: 30000
    }),
    runCommand("git", ["log", "-1", "--pretty=format:%h %s (%ci)"], {
      cwd: config.projectRoot,
      timeout: 30000
    })
  ]);

  const statusMessage = [
    `Project: ${config.projectName}`,
    `Project root: ${config.projectRoot}`,
    `Current git branch: ${branchResult.ok ? branchResult.output : "Unavailable"}`,
    `Last commit: ${commitResult.ok ? commitResult.output : "Unavailable"}`,
    `Server uptime: ${formatDuration(Date.now() - BOT_STARTED_AT)}`,
    `Bot status: online${runtimeState.codexRun ? " | Codex task running" : ""}`
  ].join("\n");

  await respond(context, statusMessage);
}

async function handleGitStatus(context) {
  const result = await runCommand("git", ["status", "--short", "--branch"], {
    cwd: config.projectRoot,
    timeout: 30000
  });

  if (!result.ok) {
    await respond(context, formatFailure("git status", result));
    return;
  }

  await respond(
    context,
    `Git status for ${config.projectName}:\n\n${result.output || "Working tree clean."}`
  );
}

async function handleCodex(context) {
  const task = context.args.trim();

  if (!task) {
    await respond(
      context,
      "Please include a task after /codex.\n\nExample:\n/codex review ship365.co sign-in page spacing and improve the parity with aesonretailsolutions.com"
    );
    return;
  }

  if (runtimeState.codexRun) {
    await respond(
      context,
      `Codex is already running a task for ${config.projectName}. Wait for that result before starting another one.`
    );
    return;
  }

  runtimeState.codexRun = {
    task,
    startedAt: Date.now(),
    userId: context.userId
  };

  await respond(
    context,
    [
      `Starting Codex task for ${config.projectName}.`,
      "",
      `Task: ${task}`,
      "",
      `Timeout: ${Math.round(CODEX_TIMEOUT_MS / 60000)} minutes`
    ].join("\n")
  );

  const outputFile = path.join(LOG_DIR, `codex-last-message-${Date.now()}.txt`);

  try {
    const result = await runCommand(
      "codex",
      [
        "exec",
        "--cd",
        config.projectRoot,
        "--ask-for-approval",
        "never",
        "--sandbox",
        "workspace-write",
        "--output-last-message",
        outputFile,
        task
      ],
      {
        cwd: BOT_ROOT,
        timeout: CODEX_TIMEOUT_MS
      }
    );

    const finalMessage = readOptionalFile(outputFile) || result.output || "Codex completed with no final message.";
    writeLastCodexResult({
      task,
      completedAt: new Date().toISOString(),
      ok: result.ok,
      output: finalMessage
    });

    if (!result.ok) {
      await respond(
        context,
        formatFailure("Codex task", {
          ...result,
          output: finalMessage || result.output
        })
      );
      return;
    }

    await respond(
      context,
      [
        `Codex task finished for ${config.projectName}.`,
        "",
        `Task: ${task}`,
        "",
        "Result:",
        finalMessage
      ].join("\n")
    );
  } catch (error) {
    const output = readOptionalFile(outputFile);
    writeLastCodexResult({
      task,
      completedAt: new Date().toISOString(),
      ok: false,
      output: output || (error?.shortMessage ?? error?.message ?? String(error))
    });

    await respond(
      context,
      [
        `Codex task failed for ${config.projectName}.`,
        "",
        formatThrowable(error),
        output ? `\nLast captured output:\n${output}` : ""
      ].join("\n")
    );
  } finally {
    runtimeState.codexRun = null;
    safeUnlink(outputFile);
  }
}

async function handleDeployRequest(context) {
  runtimeState.pendingDeploy = {
    requestedAt: Date.now(),
    userId: context.userId,
    chatId: context.chatId
  };

  await respond(
    context,
    `Confirm deploy for ${config.projectName}? Reply /confirmdeploy within 5 minutes.`
  );
}

async function handleDeployConfirm(context) {
  const pending = runtimeState.pendingDeploy;

  if (!pending) {
    await respond(
      context,
      `There is no pending deploy confirmation for ${config.projectName}. Use /deploy first.`
    );
    return;
  }

  const expired = Date.now() - pending.requestedAt > DEPLOY_CONFIRM_WINDOW_MS;
  const wrongSender = pending.userId !== context.userId || pending.chatId !== context.chatId;

  if (expired || wrongSender) {
    runtimeState.pendingDeploy = null;
    await respond(
      context,
      `The deploy confirmation window is no longer valid for ${config.projectName}. Run /deploy again.`
    );
    return;
  }

  runtimeState.pendingDeploy = null;

  await respond(
    context,
    `Deploy confirmed for ${config.projectName}. Running the approved deploy command now.`
  );

  const parsedDeployCommand = tokenizeCommand(config.deployCommand);

  if (!parsedDeployCommand.length) {
    await respond(
      context,
      `DEPLOY_COMMAND is empty for ${config.projectName}. Update telegram-bot/.env before retrying.`
    );
    return;
  }

  const [command, ...args] = parsedDeployCommand;
  const result = await runCommand(command, args, {
    cwd: config.projectRoot,
    timeout: DEPLOY_TIMEOUT_MS
  });

  if (!result.ok) {
    await respond(context, formatFailure("deploy", result));
    return;
  }

  await respond(
    context,
    `Deploy completed for ${config.projectName}.\n\n${result.output || "Deploy command finished successfully."}`
  );
}

async function handleLogs(context) {
  const lines = readLatestLogLines(50);

  await respond(
    context,
    lines.length
      ? `Latest log lines for ${config.projectName}:\n\n${lines.join("\n")}`
      : `No command logs found yet for ${config.projectName}.`
  );
}

async function handleLastResult(context) {
  const lastResult = readLastCodexResult();

  if (!lastResult) {
    await respond(
      context,
      `No Codex task result has been recorded yet for ${config.projectName}.`
    );
    return;
  }

  await respond(
    context,
    [
      `Last Codex task for ${config.projectName}:`,
      `Completed: ${lastResult.completedAt}`,
      `Success: ${lastResult.ok ? "yes" : "no"}`,
      "",
      `Task: ${lastResult.task}`,
      "",
      "Result:",
      lastResult.output
    ].join("\n")
  );
}

async function handleCancel(context) {
  if (!runtimeState.pendingDeploy) {
    await respond(
      context,
      `There is no pending deploy confirmation to cancel for ${config.projectName}.`
    );
    return;
  }

  runtimeState.pendingDeploy = null;
  await respond(context, `Pending deploy confirmation cancelled for ${config.projectName}.`);
}

async function respond(context, message) {
  const safeMessage = clipText(message);

  await sendTelegramText(context.chatId, safeMessage);

  logEvent({
    kind: "command",
    status: "ok",
    command: context.command,
    args: context.args,
    chatId: context.chatId,
    userId: context.userId,
    responsePreview: safeMessage
  });
}

async function sendTelegramText(chatId, text) {
  const chunks = splitMessage(text, DEFAULT_MESSAGE_LIMIT);

  for (const chunk of chunks) {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${config.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram sendMessage failed with ${response.status}: ${body}`);
    }
  }
}

async function runCommand(command, args, options) {
  try {
    const result = await execa(command, args, {
      cwd: options.cwd,
      timeout: options.timeout,
      all: true
    });

    return {
      ok: true,
      output: clipText(normalizeOutput(result.all || result.stdout || result.stderr || "")),
      exitCode: result.exitCode
    };
  } catch (error) {
    return {
      ok: false,
      output: clipText(
        normalizeOutput(
          error?.all || error?.stdout || error?.stderr || error?.shortMessage || error?.message || String(error)
        )
      ),
      exitCode: error?.exitCode ?? null,
      timedOut: Boolean(error?.timedOut)
    };
  }
}

function formatFailure(label, result) {
  if (result.timedOut) {
    return `${label} timed out for ${config.projectName}.\n\n${result.output || "No output was captured before timeout."}`;
  }

  return `${label} failed for ${config.projectName}.\n\n${result.output || "No output captured."}`;
}

function formatThrowable(error) {
  if (!error) {
    return "Unknown error.";
  }

  if (error.timedOut) {
    return `The operation timed out after ${Math.round(CODEX_TIMEOUT_MS / 60000)} minutes.`;
  }

  return error.shortMessage || error.message || String(error);
}

function parseTelegramCommand(text) {
  const trimmed = text.trim();
  const firstSpace = trimmed.indexOf(" ");
  const rawCommand = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const args = firstSpace === -1 ? "" : trimmed.slice(firstSpace + 1).trim();
  const command = rawCommand.split("@")[0].toLowerCase();

  return {
    command,
    args,
    normalizedText: trimmed
  };
}

function isAuthorized(chatId, userId) {
  return chatId === config.allowedTelegramChatId && userId === config.allowedTelegramUserId;
}

function getWebhookPath(url) {
  try {
    return new URL(url).pathname || DEFAULT_WEBHOOK_PATH;
  } catch {
    return DEFAULT_WEBHOOK_PATH;
  }
}

function tokenizeCommand(commandText) {
  const matches = commandText.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];

  return matches.map((token) => token.replace(/^['"]|['"]$/g, ""));
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function clipText(value, limit = DEFAULT_MESSAGE_LIMIT) {
  const normalized = normalizeOutput(value);

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 28)}\n\n[output truncated for Telegram]`;
}

function splitMessage(value, limit = DEFAULT_MESSAGE_LIMIT) {
  if (value.length <= limit) {
    return [value];
  }

  const chunks = [];
  let remaining = value;

  while (remaining.length > limit) {
    let splitIndex = remaining.lastIndexOf("\n", limit);

    if (splitIndex < Math.floor(limit * 0.5)) {
      splitIndex = limit;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function normalizeOutput(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function ensureRuntimeFiles() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "", "utf8");
  }
}

function validateConfiguration() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!fs.existsSync(config.projectRoot)) {
    throw new Error(`PROJECT_ROOT does not exist: ${config.projectRoot}`);
  }
}

function logEvent(event) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    host: os.hostname(),
    project: config.projectName,
    ...event
  });

  fs.appendFileSync(LOG_FILE, `${line}\n`, "utf8");
}

function readLatestLogLines(maxLines) {
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }

  const lines = fs
    .readFileSync(LOG_FILE, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);

  return lines.slice(-maxLines);
}

function writeLastCodexResult(result) {
  fs.writeFileSync(LAST_CODEX_META_FILE, JSON.stringify(result, null, 2), "utf8");
  fs.writeFileSync(LAST_CODEX_OUTPUT_FILE, result.output ?? "", "utf8");

  logEvent({
    kind: "codex",
    status: result.ok ? "ok" : "failed",
    task: result.task,
    completedAt: result.completedAt,
    responsePreview: clipText(result.output ?? "")
  });
}

function readLastCodexResult() {
  if (fs.existsSync(LAST_CODEX_META_FILE)) {
    return JSON.parse(fs.readFileSync(LAST_CODEX_META_FILE, "utf8"));
  }

  return null;
}

function readOptionalFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return "";
  }

  return clipText(fs.readFileSync(filePath, "utf8"));
}

function safeUnlink(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
