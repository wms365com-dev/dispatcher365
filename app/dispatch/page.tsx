import Link from "next/link";
import type { Route } from "next";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { SummaryCard } from "@/components/summary-card";
import { getDashboardData } from "@/lib/server/dispatch-service";

interface DashboardShipment {
  batchId: string;
  updatedAt: Date;
  status: string;
  customer: {
    customerCode: string;
    name: string;
  };
  carrier?: {
    carrierCode: string;
  } | null;
  bol?: {
    bolNumber: string;
  } | null;
}

interface DashboardAssignment {
  trackingNumber: string;
  updatedAt: Date;
  status: string;
  carrier: {
    name: string;
  };
  driver?: {
    fullName: string;
  } | null;
  routeRun: {
    routeName: string;
    routeDate: Date;
  };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();
  const context = dashboardData.context as {
    role: string;
  };
  const metrics = dashboardData.metrics;
  const assignmentMetrics = dashboardData.assignmentMetrics;
  const recentShipments = dashboardData.recentShipments as DashboardShipment[];
  const recentAssignments = dashboardData.recentAssignments as DashboardAssignment[];
  const carrierPortalMode =
    context.role === "CARRIER_ADMIN" ||
    context.role === "CARRIER_DISPATCHER" ||
    context.role === "DRIVER";

  const shipmentRows = recentShipments.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    carrier: shipment.carrier?.carrierCode ?? "Unassigned",
    bol: shipment.bol?.bolNumber ?? "Pending",
    status: <StatusPill status={shipment.status} />,
    updated: formatDate(shipment.updatedAt)
  }));

  const assignmentRows = recentAssignments.map((assignment) => ({
    tracking: assignment.trackingNumber,
    route: `${assignment.routeRun.routeName} / ${formatDate(assignment.routeRun.routeDate)}`,
    carrier: assignment.carrier.name,
    driver: assignment.driver?.fullName ?? "Awaiting assignment",
    status: <StatusPill status={assignment.status} />,
    updated: formatDate(assignment.updatedAt)
  }));

  return (
    <>
      <PageHeader
        eyebrow="Main screen"
        title="Dispatch Main Screen"
        description={
          carrierPortalMode
            ? "Carrier and driver users land here to review assigned loads, tracking numbers, and live progress."
            : "This dashboard is now aligned to the live Healtea workflow: choose the tenant, enter packing slips, generate the BOL, build the truck run, then publish and complete delivery."
        }
      />

      <div className="summary-grid">
        <SummaryCard
          label={carrierPortalMode ? "Assigned loads" : "Shipments"}
          value={String(carrierPortalMode ? assignmentMetrics.assignmentCount : metrics.shipmentCount)}
          footnote={carrierPortalMode ? "Carrier portal assignments visible to this account." : "Tenant-owned packing slip records."}
        />
        <SummaryCard
          label={carrierPortalMode ? "Offered" : "Customers"}
          value={String(carrierPortalMode ? assignmentMetrics.offeredAssignmentCount : metrics.customerCount)}
          footnote={carrierPortalMode ? "Loads waiting on carrier response." : "Master data isolated inside the active tenant."}
        />
        <SummaryCard
          label={carrierPortalMode ? "In transit" : "Ready for BOL"}
          value={String(carrierPortalMode ? assignmentMetrics.inTransitAssignmentCount : metrics.readyForBolCount)}
          footnote={carrierPortalMode ? "Assignments already moving with driver activity." : "Shipments waiting on bill of lading generation."}
        />
        <SummaryCard
          label="BOL created"
          value={String(metrics.bolCreatedCount)}
          footnote="Batches ready to move into route planning."
        />
      </div>

      <div className="split-grid">
        <SectionCard
          title={carrierPortalMode ? "Live Carrier Queue" : "Live Dispatch Queue"}
          description={
            carrierPortalMode
              ? "Recent assignments visible to the current carrier or driver account."
              : "Recent shipment activity coming from the rebuilt tenant-scoped database."
          }
        >
          {carrierPortalMode ? (
            <SimpleTable
              columns={[
                { key: "tracking", label: "Tracking" },
                { key: "route", label: "Route" },
                { key: "carrier", label: "Carrier" },
                { key: "driver", label: "Driver" },
                { key: "status", label: "Status" },
                { key: "updated", label: "Updated" }
              ]}
              rows={assignmentRows}
              emptyMessage="No assignments visible yet."
            />
          ) : (
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
          )}
        </SectionCard>

        <SectionCard
          title={carrierPortalMode ? "Carrier Workflow" : "Live System Workflow"}
          description={
            carrierPortalMode
              ? "This is the new dispatcher-to-carrier flow that was unfinished in the old system."
              : "These are the actual operational steps traced from the original Healtea tenant."
          }
        >
          {carrierPortalMode ? (
            <ul className="note-list">
              <li>Review the offered load and accept or decline it.</li>
              <li>Assign the route to a driver user tied to your carrier.</li>
              <li>Use the tracking number to follow progress and location pings.</li>
              <li>Complete delivery updates and proof through the delivery workflow.</li>
            </ul>
          ) : (
            <ul className="note-list">
              <li>Enter the shipment in <strong>Packing Slip</strong>.</li>
              <li>Move the batch into <strong>BOL</strong> once intake is complete.</li>
              <li>Create the <strong>Truck Run</strong> after BOL generation.</li>
              <li>Publish the route, then complete proof and exceptions in <strong>Delivered Orders</strong>.</li>
              <li>Print carton and pallet output from <strong>Print Label</strong>.</li>
            </ul>
          )}
          <div className="landing__actions">
            {carrierPortalMode ? (
              <>
                <Link className="button" href={"/dispatch/assignments" as Route}>
                  Open Assignments
                </Link>
                <Link className="button button--ghost" href={"/dispatch/deliveries" as Route}>
                  Open Deliveries
                </Link>
              </>
            ) : (
              <>
                <Link className="button" href={"/dispatch/packing-slips" as Route}>
                  Open Packing Slip
                </Link>
                <Link className="button button--ghost" href={"/dispatch/bols" as Route}>
                  Open BOL
                </Link>
                <Link className="button button--ghost" href={"/dispatch/routes" as Route}>
                  Open Truck Run
                </Link>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="summary-grid">
        <SummaryCard
          label={carrierPortalMode ? "Routed" : "Routed"}
          value={String(metrics.routedCount)}
          footnote={
            carrierPortalMode
              ? "Internal route planning count for the active tenant."
              : "Shipments already staged into a truck run."
          }
        />
        <SummaryCard
          label={carrierPortalMode ? "Published routes" : "Published routes"}
          value={String(metrics.publishedRouteCount)}
          footnote={
            carrierPortalMode
              ? "Dispatcher-published runs that may become carrier assignments."
              : "Truck runs ready for driver sync and route-sheet output."
          }
        />
      </div>
    </>
  );
}
