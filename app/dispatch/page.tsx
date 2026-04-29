import Link from "next/link";
import type { Route } from "next";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { SummaryCard } from "@/components/summary-card";
import { getDashboardData } from "@/lib/server/dispatch-service";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function DashboardPage() {
  const { metrics, recentShipments } = await getDashboardData();

  const shipmentRows = recentShipments.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    carrier: shipment.carrier?.carrierCode ?? "Unassigned",
    bol: shipment.bol?.bolNumber ?? "Pending",
    status: <StatusPill status={shipment.status} />,
    updated: formatDate(shipment.updatedAt)
  }));

  return (
    <>
      <PageHeader
        eyebrow="Main screen"
        title="Dispatch Main Screen"
        description="This dashboard is now aligned to the live Healtea workflow: choose the tenant, enter packing slips, generate the BOL, build the truck run, then publish and complete delivery."
      />

      <div className="summary-grid">
        <SummaryCard
          label="Shipments"
          value={String(metrics.shipmentCount)}
          footnote="Tenant-owned packing slip records."
        />
        <SummaryCard
          label="Customers"
          value={String(metrics.customerCount)}
          footnote="Master data isolated inside the active tenant."
        />
        <SummaryCard
          label="Ready for BOL"
          value={String(metrics.readyForBolCount)}
          footnote="Shipments waiting on bill of lading generation."
        />
        <SummaryCard
          label="BOL created"
          value={String(metrics.bolCreatedCount)}
          footnote="Batches ready to move into route planning."
        />
      </div>

      <div className="split-grid">
        <SectionCard
          title="Live Dispatch Queue"
          description="Recent shipment activity coming from the rebuilt tenant-scoped database."
        >
          <SimpleTable
            columns={[
              { key: "batchId", label: "Batch" },
              { key: "customer", label: "Customer" },
              { key: "carrier", label: "Carrier" },
              { key: "bol", label: "BOL" },
              { key: "status", label: "Status" },
              { key: "updated", label: "Updated" }
            ]}
            rows={shipmentRows}
            emptyMessage="No shipment activity yet."
          />
        </SectionCard>

        <SectionCard
          title="Live System Workflow"
          description="These are the actual operational steps traced from the original Healtea tenant."
        >
          <ul className="note-list">
            <li>Enter the shipment in <strong>Packing Slip</strong>.</li>
            <li>Move the batch into <strong>BOL</strong> once intake is complete.</li>
            <li>Create the <strong>Truck Run</strong> after BOL generation.</li>
            <li>Publish the route, then complete proof and exceptions in <strong>Delivered Orders</strong>.</li>
            <li>Print carton and pallet output from <strong>Print Label</strong>.</li>
          </ul>
          <div className="landing__actions">
            <Link className="button" href={"/dispatch/packing-slips" as Route}>
              Open Packing Slip
            </Link>
            <Link className="button button--ghost" href={"/dispatch/bols" as Route}>
              Open BOL
            </Link>
            <Link className="button button--ghost" href={"/dispatch/routes" as Route}>
              Open Truck Run
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="summary-grid">
        <SummaryCard
          label="Routed"
          value={String(metrics.routedCount)}
          footnote="Shipments already staged into a truck run."
        />
        <SummaryCard
          label="Published routes"
          value={String(metrics.publishedRouteCount)}
          footnote="Truck runs ready for driver sync and route-sheet output."
        />
      </div>
    </>
  );
}
