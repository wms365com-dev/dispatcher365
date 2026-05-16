# Old vs New Dispatch Audit

Date: 2026-05-12
Comparison target:

- Old: `https://www.aesonretailsolutions.com`
- New: `https://app.ship365.co`
- Tenant used: `Healtea`

Goal:

- Re-run the comparison multiple times
- log functional and UX differences
- use the log to improve operator flow, especially data entry

## Run 1: Login and landing flow

Old system:

- user signs in
- user chooses company
- app lands directly in the operational workflow, usually `Packing Slip`

New system:

- user signs in
- user chooses tenant
- app lands on `/dispatch` dashboard

Difference:

- old flow gets operators directly into work
- new flow adds one more decision step after tenant selection before data entry starts

Improvement required:

- add tenant-level landing preference
- default dispatch users into `Packing Slip` or their last-used module
- keep dashboard as an option, not the only landing

Priority: high

## Run 2: Left navigation density and ordering

Old system:

- terse left navigation
- little explanatory text
- operators scan menu quickly

New system:

- same core modules are present
- menu includes descriptive helper text under each item
- more screen space is spent on explanation

Difference:

- new nav is clearer for first-time users
- old nav is faster for repeat operators

Improvement required:

- keep current structure
- add a compact nav mode for daily dispatch users
- preserve old ordering exactly where practical

Priority: medium

## Run 3: Packing Slip data-entry layout

Old system:

- dense one-screen form
- minimal explanation
- import block is visible but secondary

New system before local improvement:

- denser than earlier versions, but still too descriptive
- extra instructional sections reduced focus during fast entry

Difference:

- old page is more operational
- new page was still a little too “walkthrough-like”

Improvement required:

- reduce explanatory copy
- keep form as the dominant visual element
- show exception-handling UI only when needed

Status:

- local improvement applied on 2026-05-12 in `app/dispatch/packing-slips/page.tsx`

Priority: high

## Run 4: Packing Slip exception handling

Old system:

- customer issues are mostly handled by knowledge or side navigation
- not much inline help

New system before local improvement:

- always-visible customer resolution/demo area
- helpful conceptually, but too noisy during routine entry

Difference:

- new app had better guardrails
- old app had less distraction

Improvement required:

- only show customer-resolution UI when a lookup problem actually occurs
- keep the main entry screen clean by default

Status:

- local improvement applied on 2026-05-12

Priority: high

## Run 5: BOL staging workflow

Old system:

- double-click `Batch ID` in `All Packing Slip`
- selected IDs get staged on the left
- click `Show Data`
- review selected slips on the right
- then `SHOW FORM`

New system on current live deploy:

- checkbox-based selection
- grouped BOL works, but staging interaction is different

Difference:

- old flow is faster for repeat users
- new flow is functional but not yet muscle-memory compatible

Improvement required:

- preserve old staging sequence
- support double-click to stage
- keep manual batch entry and `Show Data`

Status:

- local improvement applied on 2026-05-12 in:
  - `app/dispatch/bols/page.tsx`
  - `src/components/bol-staging-workspace.tsx`

Priority: critical

## Run 6: Grouped BOL generation and review

Old system:

- grouped BOL is created from staged packing slips
- selected rows change to `BOL CREATED`
- print route is tied to grouped batch IDs

New system:

- grouped BOL generation works
- print preview is much stronger than before
- current live page still needs the old staging behavior

Difference:

- grouped print logic is present in the new system
- staging/review rhythm needed to match legacy better

Improvement required:

- keep grouped print logic
- improve the pre-generation staging experience
- refresh queue state immediately after grouped generation

Status:

- partially improved locally; deployment still pending

Priority: critical

## Run 7: Truck Run create/list flow

Old system:

- create page and list page are split
- create flow is simple: carrier + batch IDs + delivery date
- list is operational-table-first

New system:

- route candidates, create form, route list, and stop preview are combined
- more powerful, but slightly heavier

Difference:

- new flow is richer
- old flow is more direct

Improvement required:

- add a faster “build from selected BOL candidates” interaction
- reduce explanatory copy
- let dispatchers move batches into route creation as fast as old BOL staging

Priority: high

## Run 8: Carrier assignment handoff

Old system:

- separate driver assignment step exists
- handoff is more hidden and less structured

New system:

- assignment desk exists
- tracking numbers and carrier workflow foundations exist
- still needs more operator polish

Difference:

- new system is architecturally better
- old system is more familiar in sequence

Improvement required:

- make route publish -> carrier assignment -> driver assignment feel like one guided dispatch flow
- show tracking number and assignment state more prominently in route screens

Priority: high

## Run 9: Print Label workflow

Old system:

- direct label input screen
- order-number-driven entry
- explicit print/email actions
- 3 variants are visible from the legacy menu

New system:

- queue-based label module
- 3 variants are represented
- still feels more like a job queue than a print operator screen

Difference:

- new model is cleaner internally
- old model is more intuitive for quick print tasks

Improvement required:

- add direct label-entry mode
- emphasize order or batch lookup first
- keep queue as secondary, not primary

Priority: medium-high

## Run 10: Customer master data flow

Old system:

- large form with billing + ship-to in one place
- list sits close to form

New system:

- same data model is present
- current screen is clearer and safer
- labels and copy still feel slightly more modern than legacy

Difference:

- new app is better structured
- old page is more compact and blunt

Improvement required:

- keep the new data safety
- trim more descriptive copy
- preserve list-near-form scanning behavior

Priority: medium

## Highest-value improvements from this audit

1. Match the old BOL staging flow exactly.
2. Make packing slip entry feel faster by reducing noise and only showing exception UI when needed.
3. Tighten truck-run creation so dispatchers can move directly from BOL-created loads into route planning.
4. Rework the label module so print-first operators can act faster.
5. Add role-based landing preferences so dispatch users start where the work actually begins.

## Improvements already applied locally from this audit

1. BOL staging was rebuilt around the legacy interaction model.
2. Packing slip page was decluttered and the always-on customer-resolution demo was removed.

## Recommended next build sequence

1. Deploy and live-test the rebuilt BOL staging page.
2. Tighten truck-run staging from BOL-created loads.
3. Rework label entry to match old print-first flow.
4. Add dispatch-user landing preferences.
