# Ship365 Telegram Controller

This folder contains a project-specific Telegram webhook controller for [ship365.co](https://ship365.co).

It is intentionally narrow:
- one bot
- one approved Telegram user
- one approved Telegram group chat
- one approved project root
- one approved deploy command

It does **not** allow raw shell commands from Telegram.

## What It Does

The bot supports:
- `/start`
- `/help`
- `/status`
- `/gitstatus`
- `/codex [task description]`
- `/deploy`
- `/confirmdeploy`
- `/logs`
- `/last`
- `/cancel`

## 1. Create a Telegram Bot with BotFather

1. Open Telegram.
2. Start a chat with [@BotFather](https://t.me/BotFather).
3. Run `/newbot`.
4. Follow the prompts for:
   - bot display name
   - bot username
5. Copy the bot token that BotFather returns.
6. Put that token in `TELEGRAM_BOT_TOKEN` inside your local `.env` file.

## 2. Add the Bot to the Private Telegram Group

1. Add the bot to your private Telegram group.
2. Make sure the bot can read messages in that group.
3. If Telegram privacy mode blocks command visibility, disable privacy mode in BotFather with:
   - `/setprivacy`
   - choose your bot
   - select `Disable`

## 3. Get Your Telegram User ID

You can get your Telegram user ID in either of these ways:

### Option A: Use a Telegram ID helper bot
1. Open a bot like [@userinfobot](https://t.me/userinfobot).
2. Send any message.
3. Copy the numeric user ID it returns.
4. Put it into `ALLOWED_TELEGRAM_USER_ID`.

### Option B: Read it from an update payload
1. Start this Ship365 Telegram controller locally.
2. Send a message to the bot from Telegram.
3. Inspect the incoming update or add temporary debug logging if needed.
4. Copy `message.from.id`.

## 4. Get the Telegram Group Chat ID

### Option A: Use `getUpdates`
1. Add the bot to the private group.
2. Send a test message in that group.
3. Open this URL in your browser:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

4. Look for:

```json
message.chat.id
```

5. Use that value in `ALLOWED_TELEGRAM_CHAT_ID`.

For private groups this ID is usually a negative number.

## 5. Create the `.env` File

Copy `.env.example` to `.env` inside this folder:

```powershell
cd C:\ship365-work\telegram-bot
Copy-Item .env.example .env
```

Fill in:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=https://your-public-domain.example/telegram/webhook
ALLOWED_TELEGRAM_USER_ID=
ALLOWED_TELEGRAM_CHAT_ID=
PROJECT_NAME=ship365
PROJECT_ROOT=C:\ship365-work
DEPLOY_COMMAND=git push origin main
PORT=8080
```

Notes:
- `PROJECT_ROOT` must be the real Ship365 project path.
- `DEPLOY_COMMAND` must be an approved internal deploy command only.
- Do not put secrets anywhere except `.env`.

## 6. Install Dependencies

From this folder:

```powershell
cd C:\ship365-work\telegram-bot
npm install
```

## 7. Start the Bot

```powershell
cd C:\ship365-work\telegram-bot
npm run start
```

Health check:

```text
GET /health
```

## 8. Set the Webhook

After your server is reachable from the internet, set the webhook with:

```powershell
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<TELEGRAM_WEBHOOK_URL>"
```

Example:

```powershell
curl "https://api.telegram.org/bot123456:ABCDEF/setWebhook?url=https://your-domain.example/telegram/webhook"
```

To confirm the webhook:

```powershell
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 9. Test Commands

From the approved Telegram group and approved user account:

```text
/start
/help
/status
/gitstatus
/codex compare ship365.co layout with aesonretailsolutions.com and improve the UI to match the original project while making it cleaner and easier to use
/deploy
/confirmdeploy
/logs
/last
/cancel
```

## Command Notes

### `/status`
Returns:
- project name
- project root
- current git branch
- last commit
- bot uptime
- bot status

### `/gitstatus`
Runs `git status --short --branch` inside `PROJECT_ROOT` only.

### `/codex [task]`
Runs Codex non-interactively inside `PROJECT_ROOT` only.

Safety behavior:
- one Codex task at a time
- 15 minute timeout
- output captured and logged

### `/deploy`
Does not deploy immediately.

It opens a 5 minute confirmation window for the approved user only.

### `/confirmdeploy`
Runs `DEPLOY_COMMAND` only when:
- `/deploy` was requested first
- the same approved user confirms
- the same approved chat confirms
- the confirmation is within 5 minutes

### `/logs`
Shows the latest 50 lines from:

```text
telegram-bot/logs/commands.log
```

### `/last`
Shows the most recent Codex task result saved by the controller.

### `/cancel`
Cancels the current pending deploy confirmation.

## Security Rules Built In

- Rejects all messages outside the approved Telegram group.
- Rejects all messages from unapproved Telegram users.
- Never runs raw shell commands from Telegram text.
- Only runs the fixed approved command set.
- Keeps secrets in `.env`.
- Never sends `.env` values back to Telegram.
- Logs commands and response previews to `logs/commands.log`.

## Files

- [server.js](/C:/ship365-work/telegram-bot/server.js)
- [package.json](/C:/ship365-work/telegram-bot/package.json)
- [.env.example](/C:/ship365-work/telegram-bot/.env.example)
- [logs/commands.log](/C:/ship365-work/telegram-bot/logs/commands.log)
