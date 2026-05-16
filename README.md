# Ship365 Dispatch Modern App

This folder contains the first working phase of the Next.js + TypeScript rebuild for Ship365 Dispatch.

## What is included

- App Router shell and dispatch workspace
- Workbook-informed pages for packing slips, customers, carriers, BOLs, labels, routes, and freight
- Tenant-aware PostgreSQL/Prisma data layer with automatic demo tenant seeding
- Server actions for creating customers, carriers, drivers, shipments, BOLs, route runs, issue reports, and manifest/BOL email sends
- Public signup, billing, and password-reset flows
- Formula conversion utilities in `src/lib/workbook/formulas.ts`
- API routes backed by the same services used by the UI
- Prisma schema configured for PostgreSQL, which matches the Railway production target

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npm run db:push`.
4. Run `npm run dev`.
5. Open `http://localhost:3000/sign-in`.

New public pages:

- `http://localhost:3000/sign-up`
- `http://localhost:3000/forgot-password`
- `http://localhost:3000/billing`

## Demo access

- Email: `dispatch@ship365.co`
- Password: `Dispatch123!`

## Railway deployment

Deploy the app from [modern-app](/E:/aesonretailsolutions/modern-app) as the project root.

Required Railway variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENABLE_DEMO_SEED`
- `NEXT_PUBLIC_APP_URL`

Optional but needed for outbound email:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FROM`
- `SMTP_USER`
- `SMTP_PASS`

Optional but needed for subscription billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_STARTER`
- `STRIPE_PRICE_ID_GROWTH`

Recommended Railway env values:

- `DATABASE_URL=<Railway Postgres connection string>`
- `AUTH_SECRET=<long-random-secret>`
- `ENABLE_DEMO_SEED=true`
- `NEXT_PUBLIC_APP_URL=https://app.ship365.co`
- `STRIPE_PRICE_ID_STARTER=<Stripe recurring starter price id>`
- `STRIPE_PRICE_ID_GROWTH=<Stripe recurring growth price id>`

Useful endpoints after deploy:

- `/sign-in`
- `/dispatch`
- `/billing`
- `/pricing`
- `/sign-up`
- `/dispatch/issues`
- `/dispatch/routes/:routeRunId/manifest`
- `/api/health`
- `/api/stripe/webhook`

## Legacy backfill

To inspect or import data from the old Laravel/MySQL system:

```powershell
npm run legacy:backfill -- --list-companies
npm run legacy:backfill -- --company "HDS Trading Corp" --dry-run
```

The importer script lives at [scripts/import-legacy-sql.mjs](/E:/aesonretailsolutions/modern-app/scripts/import-legacy-sql.mjs), and the migration notes are in [docs/legacy-backfill-plan-2026-05-15.md](/E:/aesonretailsolutions/modern-app/docs/legacy-backfill-plan-2026-05-15.md).

## Legacy mirror mode

To run the new app as a repeated mirror of the old system during cutover, place the newest `.sql` dump into:

- `E:\aesonretailsolutions\modern-app\legacy-drops`

Then run:

```powershell
npm run legacy:sync -- --dry-run
npm run legacy:sync -- --company "HDS Trading Corp" --apply
```

The sync runner uses the newest dump file in `legacy-drops` unless `--dump` is provided explicitly, and it writes logs to:

- `E:\aesonretailsolutions\modern-app\logs\legacy-sync`

The cutover/mirror operating notes are in [docs/legacy-mirror-cutover-plan-2026-05-15.md](/E:/aesonretailsolutions/modern-app/docs/legacy-mirror-cutover-plan-2026-05-15.md).

## Automated site review

The recurring site parity workflow is documented in [docs/site-review-automation-2026-05-16.md](/E:/aesonretailsolutions/modern-app/docs/site-review-automation-2026-05-16.md).

Run it locally with:

```powershell
$env:LEGACY_SITE_EMAIL="..."
$env:LEGACY_SITE_PASSWORD="..."
$env:NEW_SITE_EMAIL="..."
$env:NEW_SITE_PASSWORD="..."
npm run review:sites
```

The scheduled GitHub Actions workflow runs every 3 hours using:

```text
0 */3 * * *
```

## Notes

- The core dispatch pages now read and write real PostgreSQL data through Prisma.
- The app auto-seeds a demo tenant (`ship365-demo`) and dispatch user on first run so the workflow can be tested immediately.
- Demo seeding is controlled by `ENABLE_DEMO_SEED`; leave it on locally and turn it off in production.
- Sign-in is now session-based, so the dispatch workspace redirects to `/sign-in` until a valid session exists.
- BOL email send, truck run manifest print/email, and issue reporting are now wired into the real workflow.
- Mobile alert records are now created when a route is published so the future driver app can consume that queue.
- New tenants can self-register, start on a 14-day trial, and then move into a Stripe-hosted billing flow.
- Pricing is now tiered in the app with Starter, Growth, and Enterprise plan cards. Starter and Growth can map to separate Stripe prices.
- If a tenant subscription fails or the trial expires, the tenant is redirected to `/billing` and dispatch access is locked until billing recovers.
- Password reset emails now flow through the SMTP configuration and use one-time reset tokens stored in the database.
- Keep all tenant filtering on the server side.
