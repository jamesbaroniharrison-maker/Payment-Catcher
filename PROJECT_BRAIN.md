# PROJECT BRAIN: Payment Catcher

**Path:** D:\Work\AI Projects\Payment Catcher
**Repo:** https://github.com/jamesbaroniharrison-maker/Payment-Catcher.git (remote being linked 2026-10-03)
**Status:** Experimental (Stage 1 mostly built in the working tree, **uncommitted**)
**Last updated:** 2026-10-03
**Last synced commit:** 66bfdc8

> Almost all of the code is uncommitted. HEAD is still "Initial commit from Create Next App". This Brain describes the **working tree** as of 2026-10-03.

## 1. Summary
A SaaS app that recovers failed subscription payments for Skool community owners. A creator connects their Stripe account. A per-connection webhook catches `payment failed` events and classifies the decline code into retry-now vs wait-and-email, then runs a day1/day3/final recovery email sequence with retries. Recovered revenue is counted, and on the 1st of each month the creator is billed **20% of what was recovered**. Plan and rationale: `full-build-breakdown.md` (Stage 1: 9 pieces; Stage 2: 8 extras).

## 2. Stack & Entry Points
- Next.js 16.3 (App Router; see `AGENTS.md`, which says this Next version has breaking changes, so read `node_modules\next\dist\docs\`), React 19, TypeScript, Tailwind 4, Auth.js v5 beta (`next-auth` + Prisma adapter, credentials with bcryptjs), Prisma 7 + `@prisma/adapter-pg` (Postgres), Stripe SDK 22, Resend (email), zod. Hosted on Vercel (crons in `vercel.json`).
- Run (PowerShell):
  ```powershell
  npm install
  npx prisma migrate dev        # client generated into src\generated\prisma (gitignored in working tree)
  npm run dev                   # http://localhost:3000
  ```
- Crons (`vercel.json`): `/api/cron/recovery-sequence` daily 13:00, `/api/cron/monthly-billing` 14:00 on the 1st (guarded by `CRON_SECRET`).
- Key files: `src\auth.ts`, `src\lib\webhook-handlers.ts`, `decline-classification.ts`, `recovery-sequence.ts`, `email.ts`, `billing.ts`, `monthly-billing.ts`, `platform-stripe.ts`, `crypto.ts`, `prisma.ts`; routes under `src\app\api\` (signup, auth, stripe connect/disconnect/webhook-secret, `webhooks\stripe\[connectionId]`, billing setup/callback, cron); UI `src\app\dashboard\`, `login\`, `signup\`.
- Prisma models: `User`, `PlatformCustomer`, `BillingInvoice`, `StripeConnection`, `StripeWebhookEvent`, `FailedPayment`, `Account`, `Session`, `VerificationToken`. 5 migrations (2026-08-17 to 08-19).
- Env vars: `DATABASE_URL`, `SHADOW_DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ENCRYPTION_KEY` (64 hex chars), `CRON_SECRET`, `RESEND_API_KEY`, `RECOVERY_EMAIL_FROM`. `.env` is gitignored (`.env*`).

## 3. Shared Assets I OWN (other projects may consume)
| Asset | Path | What it is | Format/schema | How others should use it |
|---|---|---|---|---|
| Plain-language build plan template | `full-build-breakdown.md` | Staged MVP plan (pieces with "what / what the program does / why"), plus a rule for when to move to Stage 2 | Markdown | Copy-and-modify as a template for planning any new product |
| Decline-code classification | `src\lib\decline-classification.ts` | Stripe decline codes -> `IMMEDIATE_RETRY` / `WAIT_AND_EMAIL` | TS map + function | Copy |

## 4. Assets I CONSUME (owned elsewhere)
| Asset | Owner | Path | How it is used here |
|---|---|---|---|
| none | | | No ! Branding use yet |

## 5. Copy-Paste Components
| Component | File -> symbol | In -> Out | Deps | Changes on reuse |
|---|---|---|---|---|
| AES-256-GCM field encryption | `src\lib\crypto.ts` -> `encrypt`, `decrypt` | string <-> `iv:tag:ciphertext` hex | node crypto, `ENCRYPTION_KEY` | none |
| Per-connection Stripe webhook | `src\app\api\webhooks\stripe\[connectionId]\route.ts` + `webhook-handlers.ts` -> `handlePaymentFailed`, `handlePaymentSucceeded`, `handleCardUpdated` | Stripe event -> DB records, retries | stripe | event types |
| Webhook idempotency | Prisma `StripeWebhookEvent` model | event id stored once | Prisma | none |
| Recovery email sequence | `recovery-sequence.ts` -> `runRecoverySequence`; `email.ts` -> `sendRecoveryEmail` (stages day1/day3/final; console fallback when no Resend key) | due failures -> emails/retries | Resend | copy text |
| Revenue-share billing | `billing.ts` -> `getMonthlyRecoveredCents`; `monthly-billing.ts` -> `runMonthlyBilling` | month -> invoice for 20% | Stripe | percentage |
| Credentials auth on Auth.js v5 + Prisma | `src\auth.ts`, `src\app\api\signup\route.ts`, `src\types\next-auth.d.ts` | email/password -> session | next-auth beta, bcryptjs | none |
| Prisma 7 pg-adapter singleton | `src\lib\prisma.ts` | -> `prisma` client | @prisma/adapter-pg | none |

## 6. Reusable Processes & Workflows
1. **Failed-payment flow:** webhook -> save `FailedPayment` with decline reason -> classify -> retry immediately or start the email sequence -> on `payment succeeded`, mark it recovered -> monthly 20% invoice.
2. **Staged build rule** (`full-build-breakdown.md`): finish and prove Stage 1 with paying users before any Stage 2 extra.

## 7. Link-Don't-Copy
- READ DIRECTLY from here: `full-build-breakdown.md` as the planning template.
- Breaks if moved/renamed: nothing known (no consumers; not deployed yet [UNVERIFIED]).

## 8. Prompts & Instructions Inventory
| Path | Purpose | Variables | Model | Generic vs personal |
|---|---|---|---|---|
| `AGENTS.md` (via `CLAUDE.md` `@AGENTS.md`) | Next.js agent rules (auto-written by `next dev`) | none | Claude | Generic |
| `src\lib\email.ts` | Recovery email copy (day1/day3/final) | amount, currency | none (templated) | Generic |
No LLM prompts in this project.

## 9. Client Transfer Playbook
(A SaaS product, not a per-client build. "Transfer" means selling or handing over the codebase.)
### 9a. REMOVE
`PROJECT_BRAIN.md`, `.claude\commands\brain-sync.md`, `.claude\settings.local.json`, the Brain line in `CLAUDE.md`; `.env`; `.windsurf\`, `.agents\`, `skills-lock.json` (tooling); grep `James`, `D:\\Work`. Git history is just the Next.js scaffold, so it's safe.
### 9b. REPLACE
| Item | Where | Needed |
|---|---|---|
| Stripe platform account + Connect settings | `.env`, Stripe dashboard | Their Stripe keys |
| Email sender | `RESEND_API_KEY`, `RECOVERY_EMAIL_FROM` | Verified domain |
| Database | `DATABASE_URL` | Postgres |
| Fee | `billing.ts`/`monthly-billing.ts` | Revenue share % |
| Landing copy | `src\app\page.tsx` | Brand |
### 9c. KEEP
All of `src\lib\`, API routes, Prisma schema and migrations, dashboard.
### 9d. Onboarding Steps
1. `npm install`; fill `.env`. 2. `npx prisma migrate deploy`. 3. Set up Stripe Connect and create a test connected account. 4. Use `stripe trigger invoice.payment_failed` against the connection's webhook. 5. Call both cron routes by hand with `CRON_SECRET`. 6. Deploy to Vercel.

## 10. Known Issues, Gotchas & Lessons Learned
- **Nothing beyond the scaffold is committed.** A remote is being linked (see Repo), but a push only sends committed work, so the app code (`src\`, `prisma\`, etc.) stays local-only until it is committed.
- `.gitignore` working-tree change adds `/src/generated/prisma` (generated client); not yet committed.
- Next.js 16 / Auth.js v5 beta / Prisma 7 are all newer than most training data, so check `node_modules` docs.
- Prisma CLI doesn't auto-load `.env`; `prisma.config.ts` handles it.

## 11. Changelog
- 2026-10-03 | cf407c6 | First Brain, describing the uncommitted working tree.
- 2026-10-03 | 66bfdc8 | Repo set to the GitHub URL. No code changes since last sync. All paths in Sections 3-8 re-verified, none missing.
