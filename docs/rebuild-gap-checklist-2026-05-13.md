# WMS 365 Dispatch Rebuild Gap Checklist

Date: 2026-05-13

Source of truth used for this checklist:

- Old live Laravel app in [C:\livesite](/C:/livesite)
- Old live production behavior on `aesonretailsolutions.com`
- New Railway app on `dispatcher365-production.up.railway.app`
- Audit notes in [old-vs-new-audit-2026-05-12.md](/E:/aesonretailsolutions/modern-app/docs/old-vs-new-audit-2026-05-12.md)

## Status legend

- `[Done]` Carried over and usable
- `[Partial]` Exists but still differs from old flow or needs production-hardening
- `[Missing]` Not rebuilt yet
- `[Active]` In local build right now, not yet deployed

## Core operational workflow

- `[Done]` Sign in
- `[Done]` Tenant/company selection
- `[Done]` Packing Slip create/list workflow
- `[Done]` Grouped BOL generation from selected packing slips
- `[Done]` Legacy-style BOL print preview
- `[Partial]` BOL queue refresh and status-change parity
- `[Partial]` Truck Run create/list/manifest flow
- `[Partial]` Truck Run execution side screens:
  - `Assign`
  - `Jobs`
  - `History`
  - `Delivered history`
- `[Partial]` Delivered Orders / delivery event history
- `[Partial]` Print Label workflow

## Exact old-site features still missing

- `[Missing]` `BOL -> CHANGE ALL TO SHIPPED` action from the staged BOL screen
- `[Partial]` Old `Truck Run` side screens are rebuilt, but still need one more live parity pass for table density, actions, and role polish:
  - `Assign`
  - `Jobs`
  - `History`
  - `Delivered history`
- `[Missing]` Direct print-first label entry parity for all 3 old label routes:
  - `print-label-simple`
  - `print-label-item`
  - `print-label-item-case`
- `[Missing]` Excel import/export parity for:
  - packings
  - customers
  - carriers
  - cartons
  - sales reps
- `[Missing]` Multiple `Ship From` records as a dedicated module if we want exact legacy parity instead of one warehouse profile on the company

## Modern replacements that exist but still need work

- `[Partial]` Customer resolution is safer than old site, but still needs more invisible inline matching so operators get blocked less often
- `[Partial]` Truck Run page is richer than old site, but still needs a faster dispatch rhythm from BOL-created loads into a route
- `[Partial]` Users page exists, but still needs clearer internal-user vs carrier-portal-user separation in the UX
- `[Partial]` Company Manage exists, but still needs final warehouse/ship-from alignment and onboarding polish
- `[Partial]` BOL email send path exists, but needs reliable SMTP setup and real production validation
- `[Partial]` Manifest email send path exists, but needs reliable SMTP setup and real production validation

## Carrier / trucker / mobile expansion

- `[Done]` Carrier portal roles:
  - `CARRIER_ADMIN`
  - `CARRIER_DISPATCHER`
- `[Done]` Route assignment records with tracking numbers
- `[Done]` Carrier accept / decline flow
- `[Done]` Carrier assign-to-driver flow
- `[Done]` Driver location ping API foundation
- `[Done]` Assignment desk screen
- `[Partial]` Truck Run execution screens now sit on top of the assignment model, but still need another live parity pass with the old site
- `[Missing]` Public carrier sign-up / invite / approval flow
- `[Missing]` Driver mobile app
- `[Missing]` Real push notifications for offered loads and driver alerts
- `[Missing]` Background GPS and live dispatcher map/trail view
- `[Missing]` Offline mobile sync / retry behavior

## Proof of delivery and storage

- `[Partial]` Delivery events exist
- `[Missing]` Real proof photo upload pipeline
- `[Missing]` Real signature capture pipeline
- `[Missing]` Railway bucket/file storage integration for proof files and generated documents

## UX / operator-flow improvements still needed

- `[Missing]` Tenant-level landing preference so dispatch users can land in `Packing Slip` or their last-used module instead of always the dashboard
- `[Missing]` Compact nav mode for repeat operators
- `[Partial]` Packing Slip is much better, but still needs one more speed pass against the old form
- `[Partial]` BOL staging now matches the old interaction much better, but still needs the missing status action noted above
- `[Partial]` Truck Run needs a more direct `build from selected BOL-created batches` rhythm
- `[Partial]` Label module needs to feel print-first rather than queue-first

## Production-hardening and admin operations

- `[Partial]` Railway PostgreSQL is live and working
- `[Missing]` File storage is not wired for uploads yet
- `[Partial]` SMTP variables still need to be fully configured and proven in production
- `[Partial]` Issue reporting exists and is database-backed
- `[Missing]` Full regression pass for admin, tenant admin, dispatcher, carrier, and driver role visibility

## Current highest-priority build sequence

1. Add the missing `BOL -> CHANGE ALL TO SHIPPED` parity action.
2. Rework `Print Label` into the old direct-print workflow.
3. Rebuild import/export.
4. Finish carrier portal onboarding and driver mobile execution.
5. Run another old-vs-new live parity pass across the Truck Run execution screens.
