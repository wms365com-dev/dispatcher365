# Legacy Live Walkthrough: Packing Slip -> Grouped BOL

Date: 2026-05-12
System: `https://www.aesonretailsolutions.com`
Company used: `Healtea`

## What was tested live

Two full live loops were run against the legacy system:

1. Create 3 new packing slips, group them into 1 BOL.
2. Create 2 more packing slips, group them again, and test `CHANGE ALL TO SHIPPED`.

## Packing Slip creation: minimum required fields

The live page allows a very small required-entry workflow.

Required fields used successfully:

- `Customer Number`
- `Customer PO`
- `Order Number`

Live customer used:

- `FarmboyKenway`

Fresh live test slips created:

- `1058306` -> `QA-PO-20260512-A` / `QA-SO-20260512-A`
- `1058307` -> `QA-PO-20260512-B` / `QA-SO-20260512-B`
- `1058308` -> `QA-PO-20260512-C` / `QA-SO-20260512-C`
- `1058309` -> `QA-PO-20260512-D` / `QA-SO-20260512-D`
- `1058310` -> `QA-PO-20260512-E` / `QA-SO-20260512-E`

Observed live behavior:

- Submit shows a success toast: `Batch #<id> was added.`
- Newly created slips appear immediately in the BOL source list.
- New slips appear with status `PICK COMPLETE`.

## BOL screen: actual operator behavior

Legacy BOL page:

- route: `/bol`
- left panel: `Enter Batch ID`
- right panel: `Packing Slip was choosed`
- bottom panel: `All Packing Slip`

### Key live interaction

The grouped BOL flow is a 2-step process:

1. Double-click the `Batch ID` in the `All Packing Slip` table.
2. Click `Show Data`.

Double-click does **not** create the BOL by itself.

What double-click actually does:

- appends the selected `Batch ID` into the left-side batch input array
- increments the `Use` count automatically
- does not yet load the chosen slips on the right side

What `Show Data` does:

- loads the selected packing slips into the `Packing Slip was choosed` table
- reveals:
  - `SHOW FORM`
  - `CHANGE ALL TO SHIPPED`

### First live grouped example

Selected by double-click:

- `1058308`
- `1058307`
- `1058306`

Observed live staging behavior:

- left-side input count became `4`
- the 3 selected batch IDs were staged
- `Show Data` loaded all 3 slips on the right
- `NODATA` disappeared
- `SHOW FORM` appeared

## How grouped BOL print is wired

Live DOM on the BOL page exposed the exact grouped print route format:

- `/bol/prints/1058310,1058309`

So the legacy grouped print URL is:

- `/bol/prints/{comma-separated-batch-ids}`

This matches the old Vue and Laravel code:

- `C:\livesite\resources\assets\js\components\Bol\Index.vue`
- `C:\livesite\resources\assets\js\components\Bol\ListPacking.vue`
- `C:\livesite\app\Http\Controllers\BolController.php`

## What `SHOW FORM` really does

Even though the browser automation runtime did not render the print page body cleanly, the live server-side effect was confirmed.

After grouped print generation for:

- `1058308`
- `1058307`
- `1058306`

the BOL source rows changed to:

- `BOL CREATED`

That confirms the old system behavior:

- grouped print route marks the selected packing slips as `BOL CREATED`

## What `CHANGE ALL TO SHIPPED` really does

Second live grouped example used:

- `1058310`
- `1058309`

Observed behavior:

1. Double-click both rows.
2. Click `Show Data`.
3. Click `CHANGE ALL TO SHIPPED`.

Live results:

- success toast: `Status was changed`
- right-side chosen table changed those selected slips to `SHIPPED`
- lower `All Packing Slip` table did not immediately refresh its own copy of the data

This is important:

- the chosen/staged table updates immediately
- the source list below can lag until the page is refreshed or reloaded

## Important rebuild takeaways

The new system should mirror these exact behaviors:

1. BOL is created from existing packing slips, not from a blank BOL form.
2. Users must be able to add multiple slips into one grouped BOL quickly from the source list.
3. Double-click-to-stage is a real legacy behavior and should be preserved or intentionally replaced with something equally fast.
4. `Show Data` is the review/staging step before BOL generation.
5. `SHOW FORM` should generate one grouped BOL from all staged slips.
6. Grouped BOL generation should update shipment status to `BOL CREATED`.
7. Status changes on selected slips should be visible immediately in the staged table.
8. The source list should refresh after status changes in the rebuild so it behaves better than the legacy app.

## Recommended new-system implementation

For parity with a better UX:

1. Keep the source packing list on the BOL page.
2. Support both:
   - double-click row to add to staged BOL
   - checkbox select for keyboard/mouse flexibility
3. Keep a staged `Selected Packing Slips` panel above the source list.
4. Preserve the legacy action order:
   - add batches
   - review selected slips
   - generate grouped BOL
5. Refresh the source list immediately after grouped BOL generation or status change.
6. Keep the grouped print URL/data model based on a multi-shipment selection, not a single-shipment record.
