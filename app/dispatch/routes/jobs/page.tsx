import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { TruckRunWorkspaceLinks } from "@/components/truck-run-workspace-links";
import {
  respondToRouteAssignmentAction,
  startRouteAssignmentAction
} from "@/lib/server/dispatch-actions";
import { getAssignmentsData } from "@/lib/server/dispatch-service";

interface AssignmentRecord {
  id: string;
  trackingNumber: string;
  status: string;
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
  respondedBy?: {
    fullName: string;
  } | null;
}

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

export default async function RouteJobsPage() {
  const assignmentsData = await getAssignmentsData();
  const context = assignmentsData.context as {
    role: string;
  };
  const assignments = assignmentsData.assignments as AssignmentRecord[];
  const canRespond = assignmentsData.canRespond;
  const activeAssignments = assignments.filter((assignment) =>
    ["OFFERED", "ACCEPTED", "DRIVER_ASSIGNED", "IN_TRANSIT"].includes(assignment.status)
  );

  const rows = activeAssignments.map((assignment) => {
    const canStartRoute =
      assignment.status === "ACCEPTED" ||
      assignment.status === "DRIVER_ASSIGNED" ||
      assignment.status === "IN_TRANSIT";

    return {
      tracking: assignment.trackingNumber,
      manifest: (
        <Link className="table-link" href={`/dispatch/routes/${assignment.routeRun.id}/manifest`}>
          View manifest
        </Link>
      ),
      route: `${assignment.routeRun.routeName} / ${formatDate(assignment.routeRun.routeDate)}`,
      carrier: `${assignment.carrier.carrierCode} / ${assignment.carrier.name}`,
      driver: assignment.driver ? `${assignment.driver.driverCode} / ${assignment.driver.fullName}` : "Awaiting driver",
      batches: assignment.routeRun.stops.map((stop) => stop.shipment.batchId).join(", "),
      stops: String(assignment.routeRun.stops.length),
      status: <StatusPill status={assignment.status} />,
      respond:
        canRespond && assignment.status === "OFFERED" ? (
          <div className="table-action-stack">
            <form action={respondToRouteAssignmentAction}>
              <input type="hidden" name="routeAssignmentId" value={assignment.id} />
              <input type="hidden" name="status" value="ACCEPTED" />
              <input type="hidden" name="returnTo" value="/dispatch/routes/jobs" />
              <button className="button button--small" type="submit">
                Accept
              </button>
            </form>
            <form action={respondToRouteAssignmentAction} className="inline-form">
              <input type="hidden" name="routeAssignmentId" value={assignment.id} />
              <input type="hidden" name="status" value="DECLINED" />
              <input type="hidden" name="returnTo" value="/dispatch/routes/jobs" />
              <input name="declineReason" placeholder="Reason" />
              <button className="button button--ghost button--small" type="submit">
                Decline
              </button>
            </form>
          </div>
        ) : (
          assignment.respondedBy?.fullName ?? assignment.status.replaceAll("_", " ")
        ),
      start:
        canStartRoute ? (
          <form action={startRouteAssignmentAction}>
            <input type="hidden" name="routeAssignmentId" value={assignment.id} />
            <input type="hidden" name="returnTo" value="/dispatch/routes/jobs" />
            <button className="button button--small" type="submit">
              {assignment.status === "IN_TRANSIT" ? "Refresh status" : "Start route"}
            </button>
          </form>
        ) : (
          "-"
        ),
      deliveries: (
        <Link className="table-link" href="/dispatch/deliveries">
          Open deliveries
        </Link>
      )
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Truck run"
        title="Packing Available"
        description="This is the active-jobs screen from the old truck-run module: loads waiting on carrier response, driver handoff, or route start."
      />

      <SectionCard
        title="Truck Run Workspaces"
        description="Use this view for live jobs, then move to history and delivered history as the run completes."
      >
        <TruckRunWorkspaceLinks activeHref="/dispatch/routes/jobs" roleKey={context.role} />
      </SectionCard>

      <SectionCard
        title="Active Jobs"
        description="Jobs stay here while they are offered, accepted, assigned to a driver, or in transit."
      >
        <SimpleTable
          columns={[
            { key: "tracking", label: "Tracking" },
            { key: "manifest", label: "Manifest" },
            { key: "route", label: "Route" },
            { key: "carrier", label: "Carrier" },
            { key: "driver", label: "Driver" },
            { key: "batches", label: "Batch IDs" },
            { key: "stops", label: "Stops" },
            { key: "status", label: "Status" },
            { key: "respond", label: "Response" },
            { key: "start", label: "Route Start" },
            { key: "deliveries", label: "Delivery Desk" }
          ]}
          rows={rows}
          emptyMessage="No active jobs are waiting right now."
        />
      </SectionCard>
    </>
  );
}
