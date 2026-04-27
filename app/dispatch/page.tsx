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
        eyebrow="Phase 1 build"
        title="Dispatch Dashboard"
        description="This is now backed by the database instead of worksheet mock data, so the counts and queues reflect the records created in the app."
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
          description="Recent shipment activity coming from SQLite through Prisma."
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
          title="Workflow Check"
          description="The old workbook and Laravel site had the right operational steps, but not always the right boundaries."
        >
          <ul className="note-list">
            <li>Customer, carrier, driver, shipment, BOL, and route records are all tenant-scoped.</li>
            <li>Shipment entry now feeds a defined status flow: Ready for BOL, BOL Created, Routed, Published, In Transit, Delivered or Exception.</li>
            <li>Route publishing is its own step so the future driver mobile app has a clean handoff point.</li>
            <li>Delivery events now sit in a dedicated execution layer instead of being hidden inside shipment status changes alone.</li>
          </ul>
        </SectionCard>
      </div>

      <div className="summary-grid">
        <SummaryCard
          label="Routed"
          value={String(metrics.routedCount)}
          footnote="Shipments already staged into a route run."
        />
        <SummaryCard
          label="Published routes"
          value={String(metrics.publishedRouteCount)}
          footnote="Runs ready for driver sync and route-sheet output."
        />
      </div>
    </>
  );
}
