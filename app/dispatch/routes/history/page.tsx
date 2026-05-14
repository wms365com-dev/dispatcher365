import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { TruckRunWorkspaceLinks } from "@/components/truck-run-workspace-links";
import { getAssignmentsData } from "@/lib/server/dispatch-service";

interface AssignmentRecord {
  id: string;
  trackingNumber: string;
  status: string;
  offeredAt: Date;
  acceptedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  declineReason?: string | null;
  routeRun: {
    id: string;
    routeName: string;
    routeDate: Date;
    stops: Array<{
      shipment: {
        batchId: string;
      };
    }>;
  };
  carrier: {
    carrierCode: string;
    name: string;
  };
  driver?: {
    driverCode: string;
    fullName: string;
  } | null;
}

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

function formatDateTime(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace("T", " ") : "-";
}

export default async function RouteHistoryPage() {
  const assignmentsData = await getAssignmentsData();
  const context = assignmentsData.context as {
    role: string;
  };
  const assignments = assignmentsData.assignments as AssignmentRecord[];

  const rows = assignments.map((assignment) => ({
    tracking: assignment.trackingNumber,
    manifest: (
      <Link className="table-link" href={`/dispatch/routes/${assignment.routeRun.id}/manifest`}>
        View manifest
      </Link>
    ),
    route: `${assignment.routeRun.routeName} / ${formatDate(assignment.routeRun.routeDate)}`,
    carrier: `${assignment.carrier.carrierCode} / ${assignment.carrier.name}`,
    driver: assignment.driver ? `${assignment.driver.driverCode} / ${assignment.driver.fullName}` : "Unassigned",
    batches: assignment.routeRun.stops.map((stop) => stop.shipment.batchId).join(", "),
    offered: formatDateTime(assignment.offeredAt),
    started: formatDateTime(assignment.startedAt),
    completed: formatDateTime(assignment.completedAt),
    status: <StatusPill status={assignment.status} />,
    outcome: assignment.declineReason ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Truck run"
        title="Jobs History"
        description="This is the truck-run history view: one place to review route assignments, carrier decisions, route start timing, and final outcomes."
      />

      <SectionCard
        title="Truck Run Workspaces"
        description="History stays separate from active jobs so dispatch can audit what happened without interrupting live execution."
      >
        <TruckRunWorkspaceLinks activeHref="/dispatch/routes/history" roleKey={context.role} />
      </SectionCard>

      <SectionCard
        title="Assignment History"
        description="Every truck run assignment keeps its own tracking number, timestamps, and outcome trail."
      >
        <SimpleTable
          columns={[
            { key: "tracking", label: "Tracking" },
            { key: "manifest", label: "Manifest" },
            { key: "route", label: "Route" },
            { key: "carrier", label: "Carrier" },
            { key: "driver", label: "Driver" },
            { key: "batches", label: "Batch IDs" },
            { key: "offered", label: "Offered" },
            { key: "started", label: "Started" },
            { key: "completed", label: "Completed" },
            { key: "status", label: "Status" },
            { key: "outcome", label: "Notes" }
          ]}
          rows={rows}
          emptyMessage="No route assignment history is available yet."
        />
      </SectionCard>
    </>
  );
}
