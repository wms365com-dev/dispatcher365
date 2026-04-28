# WMS 365 Dispatch Modern App

This folder contains the first working phase of the Next.js + TypeScript rebuild for WMS 365 Dispatch.

## What is included

- App Router shell and dispatch workspace
- Workbook-informed pages for packing slips, customers, carriers, BOLs, labels, routes, and freight
- Tenant-aware PostgreSQL/Prisma data layer with automatic demo tenant seeding
- Server actions for creating customers, carriers, drivers, shipments, BOLs, and route runs
- Formula conversion utilities in `src/lib/workbook/formulas.ts`
- API routes backed by the same services used by the UI
- Prisma schema configured for PostgreSQL, which matches the Railway production target

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npm run db:push`.
4. Run `npm run dev`.
5. Open `http://localhost:3000/sign-in`.

## Demo access

- Email: `dispatch@wms365.co`
- Password: `Dispatch123!`

## Railway deployment

Deploy the app from [modern-app](/E:/aesonretailsolutions/modern-app) as the project root.

Required Railway variables:

- `DATABASE_URL`
- `AUTH_SECRET` or `JWT_SECRET`
- `ENABLE_DEMO_SEED`

Recommended Railway env values:

- `DATABASE_URL=<Railway Postgres connection string>`
- `AUTH_SECRET=<long-random-secret>`
- `ENABLE_DEMO_SEED=true`

Useful endpoints after deploy:

- `/sign-in`
- `/dispatch`
- `/api/health`

## Notes

- The core dispatch pages now read and write real PostgreSQL data through Prisma.
- The app auto-seeds a demo tenant (`wms365-demo`) and dispatch user on first run so the workflow can be tested immediately.
- Demo seeding is controlled by `ENABLE_DEMO_SEED`; leave it on locally and turn it off in production.
- Sign-in is now session-based, so the dispatch workspace redirects to `/sign-in` until a valid session exists.
- Labels, print templates, auth, and the mobile driver workflow are still the next phases.
- Keep all tenant filtering on the server side.
