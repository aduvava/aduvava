# Educhi Hybrid Support Chat – deploy and security runbook

## What it does

- Uses an Educhi logged-in user's database ID for ownership checks; each user sees only their own conversations.
- Calls OpenAI Responses API with `store: false` and recent text context only. No Google account, email, student profile or password is sent to the model.
- Auto-escalates account/payment complaints, failed AI requests and exhausted AI budgets to the Admin inbox at `/admin/support`.
- Users can click **Nhờ Admin** at any time. Admin can reply and resolve each thread.
- Chat transcript stored in PostgreSQL until the operator manages its retention/deletion. Do not claim live human presence or instant support.

## Before enabling on VPS

1. Back up PostgreSQL and uploads. Never commit real API keys.
2. Deploy the latest GitHub `main` code.
3. Apply the additive migration **before** switching the web container: `20261114090000_hybrid_support_chat`.
4. In the *private VPS .env*, set:

```dotenv
OPENAI_API_KEY="your-real-secret-api-key"
EDUCHI_AI_ENABLED="true"
EDUCHI_AI_DAILY_LIMIT="10"
EDUCHI_AI_MONTHLY_BUDGET_USD="5"
```

5. Deploy safely:

```bash
git pull --ff-only origin main
docker compose build web
docker compose run --rm web npx prisma migrate deploy
docker compose up -d --no-deps --no-build web
docker compose ps
```

Run inside the VPS project directory that contains docker-compose.yml and .env.
If Admin is a separate deployed service, its navigation does not need changes; the new support inbox lives in the Next.js website /admin panel.

## Security and costs

- Never put OPENAI_API_KEY in `NEXT_PUBLIC_*`, GitHub or browser JavaScript.
- The default OpenAI model is GPT-6 Luna; code keeps conservative pricing estimates of $0.10 input / $0.50 output per 1M tokens. Model/price changes must be reviewed together in `src/lib/support-ai.ts`.
- The application reserves $0.02 in a database transaction-safe monthly budget ledger *before* each request. Unused reservation is released or settled with estimated token usage. By default, the application refuses new AI calls beyond a $5 calendar-month cap and allows 10 AI calls per user per rolling 24 hours.
- Actual charges may differ (for example timeouts where upstream billed but response was not received). Also configure a project-level budget/alerts in the OpenAI Platform and reconcile the billing dashboard; an app-side cap is not a guaranteed provider hard stop.
- The AI is optional and off unless explicitly enabled and OPENAI_API_KEY is present. The site can still accept Admin support messages without a key, after the database migration.
- Write endpoints check the request Origin and server-side NextAuth/Prisma identity. Admin list/reply endpoints require an active Admin role. POSTs have size caps and database-backed rate limits.
- The chat widget never asks for OTPs or passwords. Add a user-facing privacy notice and establish a retention/deletion policy for student messages before large-scale launch.

## Acceptance checklist

- Student A chats; only A's messages show for A.
- Student B cannot read A's conversation using a guessed ID.
- A asks a knowledge question: with API enabled, AI answers and the costs show in Admin.
- A asks about a bank transfer not activating VIP: status becomes WAITING_ADMIN; Admin sees it in /admin/support.
- Admin responds; A reloads/open chat and sees a message marked Admin. Admin can mark resolved.
- Disable API or exhaust quota: no billable call occurs; student is routed to Admin.
- Confirm mobile chat fits above the bottom navigation and no orange detached close button appears.
