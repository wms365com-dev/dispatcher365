# Ship365 Review Automation

This workflow gives us a repeatable parity check between:

- the legacy live site: `https://www.aesonretailsolutions.com`
- the new branded site: `https://ship365.co`
- the canonical app host: `https://app.ship365.co`

## What it does

Every review cycle the script:

1. Opens both sites in Chromium with Playwright
2. Signs in when credentials are available
3. Captures desktop and mobile screenshots
4. Checks the current operator-critical pages:
   - public entry
   - sign in
   - customer create/list
   - BOL
   - truck run create/list
5. Re-tests Truck Run double-click staging
6. Logs console/page errors
7. Writes:
   - `result.json`
   - `summary.md`
   - screenshot artifacts

## Local run

From [E:\aesonretailsolutions\modern-app](/E:/aesonretailsolutions/modern-app):

```powershell
$env:LEGACY_SITE_EMAIL="..."
$env:LEGACY_SITE_PASSWORD="..."
$env:NEW_SITE_EMAIL="..."
$env:NEW_SITE_PASSWORD="..."
npm run review:sites
```

Artifacts land in:

- [E:\aesonretailsolutions\modern-app\artifacts\site-review](/E:/aesonretailsolutions/modern-app/artifacts/site-review)

The latest completed run is copied to:

- [E:\aesonretailsolutions\modern-app\artifacts\site-review\latest](/E:/aesonretailsolutions/modern-app/artifacts/site-review/latest)

## Scheduled run

The GitHub Actions workflow runs on:

```text
0 */3 * * *
```

and can also be started manually with `workflow_dispatch`.

## Required GitHub secrets

Add these to the repository before expecting the scheduled run to log in:

- `LEGACY_SITE_EMAIL`
- `LEGACY_SITE_PASSWORD`
- `NEW_SITE_EMAIL`
- `NEW_SITE_PASSWORD`

Optional overrides:

- `OLD_SITE_URL`
- `NEW_SITE_URL`
- `NEW_APP_URL`
- `REVIEW_TENANT_NAME`

## Important note

The scheduled workflow safely produces review artifacts and recommendations.
It does **not** auto-edit production code on its own. We should keep code changes in a normal human-reviewed loop so we do not introduce layout regressions or break working tenant flows.
