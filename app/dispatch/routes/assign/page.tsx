import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { TruckRunWorkspaceLinks } from "@/components/truck-run-workspace-links";
import { assignRouteAssignmentDriverAction } from "@/lib/server/dispatch-actions";
import { getAssignmentsData } from "@/lib/server/dispatch-service";

interface AssignmentDriverRecord {
  id: string;
  driverCode: string;
  fullName: string;
  carrierId?: string | null;
}

interface AssignmentRecord {
  id: string;
  carrierId: string;
  trackingNumber: string;
  status: string;
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

export default async function RouteAssignPage() {
  const assignmentsData = await getAssignmentsData();
  const context = assignmentsData.context as {
    role: string;
  };
  const assignments = assignmentsData.assignments as AssignmentRecord[];
  const drivers = assignmentsData.drivers as AssignmentDriverRecord[];
  const canAssignDriver = assignmentsData.canAssignDriver;
  const activeAssignments = assignments.filter((assignment) =>
    ["OFFERED", "ACCEPTED", "DRIVER_ASSIGNED", "IN_TRANSIT"].includes(assignment.status)
  );

  const rows = activeAssignments.map((assignment) => {
    const driverOptions = drivers.filter(
      (driver) => !assignment.carrierId || driver.carrierId === assignment.carrierId
    );

    return {
      tracking: assignment.trackingNumber,
      manifest: (
        <Link className="table-link" href={`/dispatch/routes/${assignment.routeRun.id}/manifest`}>
          View manifest
        </Link>
      ),
      route: `${assignment.routeRun.routeName} / ${formatDate(assignment.routeRun.routeDate)}`,
      carrier: `${assignment.carrier.carrierCode} / ${assignment.carrier.name}`,
      batches: assignment.routeRun.stops.map((stop) => stop.shipment.batchId).join(", "),
      status: <StatusPill status={assignment.status} />,
      driver:
        canAssignDriver ? (
          <form action={assignRouteAssignmentDriverAction} className="inline-form">
            <input type="hidden" name="routeAssignmentId" value={assignment.id} />
            <input type="hidden" name="returnTo" value="/dispatch/routes/assign" />
            <input
              name="driverCode"
              list={`assign-drivers-${assignment.id}`}
              defaultValue={assignment.driver?.driverCode ?? ""}
              placeholder="Driver code"
            />
            <button className="button button--small" type="submit">
              Save
            </button>
            <datalist id={`assign-drivers-${assignment.id}`}>
              {driverOptions.map((driver) => (
                <option key={driver.id} value={driver.driverCode}>
                  {driver.fullName}
                </option>
              ))}
            </datalist>
          </form>
        ) : (
          assignment.driver?.fullName ?? "Awaiting carrier assignment"
        ),
      note: assignment.declineReason ?? "-"
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Truck run"
        title="Assign Loads"
        description="This matches the old assign screen more closely: take published runs, tie them to the right carrier driver, and keep the manifest attached to that assignment."
      />

      <SectionCard
        title="Truck Run Workspaces"
        description="The old system kept assignment and execution screens separate so dispatch stayed fast. That split is back here."
      >
        <TruckRunWorkspaceLinks activeHref="/dispatch/routes/assign" roleKey={context.role} />
      </SectionCard>

      <SectionCard
        title="Published Loads Awaiting Driver Assignment"
        description="Use this screen to hand published carrier loads to a specific driver sub-user while keeping the shared truck run manifest intact."
      >
        <SimpleTable
          columns={[
            { key: "tracking", label: "Tracking" },
            { key: "manifest", label: "Manifest" },
            { key: "route", label: "Route" },
            { key: "carrier", label: "Carrier" },
            { key: "batches", label: "Batch IDs" },
            { key: "status", label: "Status" },
            { key: "driver", label: "Assign Driver" },
            { key: "note", label: "Notes" }
          ]}
          rows={rows}
          emptyMessage="No published assignments need driver setup right now."
        />
      </SectionCard>
    </>
  );
}
