import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { TruckRunWorkspaceLinks } from "@/components/truck-run-workspace-links";
import { getDeliveriesData } from "@/lib/server/dispatch-service";

interface DeliveryEventRecord {
  eventAt: Date;
  recipientName?: string | null;
  note?: string | null;
  eventType: string;
  shipment: {
    batchId: string;
    customer: {
      customerCode: string;
      name: string;
    };
  };
  driver?: {
    fullName: string;
  } | null;
  routeAssignment?: {
    trackingNumber: string;
    carrier?: {
      carrierCode: string;
    } | null;
  } | null;
  routeStop?: {
    routeRun: {
      routeName: string;
    };
  } | null;
}

function formatDateTime(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

export default async function DeliveredHistoryPage() {
  const deliveriesData = await getDeliveriesData();
  const context = deliveriesData.context as {
    role: string;
  };
  const deliveryEvents = deliveriesData.deliveryEvents as DeliveryEventRecord[];
  const terminalEvents = deliveryEvents.filter((event) => event.eventType !== "IN_TRANSIT");

  const rows = terminalEvents.map((event) => ({
    when: formatDateTime(event.eventAt),
    tracking: event.routeAssignment?.trackingNumber ?? "Direct",
    route: event.routeStop?.routeRun.routeName ?? "Direct",
    carrier: event.routeAssignment?.carrier?.carrierCode ?? "-",
    batch: event.shipment.batchId,
    customer: `${event.shipment.customer.customerCode} / ${event.shipment.customer.name}`,
    driver: event.driver?.fullName ?? "Unknown",
    event: <StatusPill status={event.eventType} />,
    recipient: event.recipientName ?? "-",
    note: event.note ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Truck run"
        title="Delivered History"
        description="This brings the old delivered-history screen into the new workflow so completed, refused, returned, and exception events are easy to audit."
      />

      <SectionCard
        title="Truck Run Workspaces"
        description="Delivered history is its own screen so dispatch can review completed work without disturbing live jobs."
      >
        <TruckRunWorkspaceLinks activeHref="/dispatch/routes/delivered-history" roleKey={context.role} />
      </SectionCard>

      <SectionCard
        title="Packing Delivered"
        description="Every terminal delivery event is stored here with tracking, route, driver, recipient, and exception notes."
      >
        <SimpleTable
          columns={[
            { key: "when", label: "When" },
            { key: "tracking", label: "Tracking" },
            { key: "route", label: "Route" },
            { key: "carrier", label: "Carrier" },
            { key: "batch", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "driver", label: "Driver" },
            { key: "event", label: "Event" },
            { key: "recipient", label: "Recipient" },
            { key: "note", label: "Notes" }
          ]}
          rows={rows}
          emptyMessage="No delivered-history events are recorded yet."
        />
      </SectionCard>
    </>
  );
}
