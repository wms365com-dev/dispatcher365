import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import {
  assignRouteAssignmentDriverAction,
  recordDriverLocationPingAction,
  respondToRouteAssignmentAction
} from "@/lib/server/dispatch-actions";
import { getAssignmentsData } from "@/lib/server/dispatch-service";

interface AssignmentLocationPing {
  latitude: number;
  longitude: number;
  capturedAt: Date;
}

interface AssignmentDriverRecord {
  id: string;
  driverCode: string;
  fullName: string;
  carrierId?: string | null;
}

interface AssignmentRecord {
  id: string;
  routeRunId: string;
  carrierId: string;
  trackingNumber: string;
  status: string;
  locationPings: AssignmentLocationPing[];
  routeRun: {
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

function formatLocation(value?: { latitude: number; longitude: number; capturedAt: Date } | null) {
  if (!value) {
    return "No location yet";
  }

  return `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)} @ ${value.capturedAt.toISOString().slice(0, 16).replace("T", " ")}`;
}

export default async function AssignmentsPage() {
  const assignmentsData = await getAssignmentsData();
  const context = assignmentsData.context as {
    role: string;
  };
  const assignments = assignmentsData.assignments as AssignmentRecord[];
  const drivers = assignmentsData.drivers as AssignmentDriverRecord[];
  const canRespond = assignmentsData.canRespond;
  const canAssignDriver = assignmentsData.canAssignDriver;
  const canTrack = assignmentsData.canTrack;

  const assignmentRows = assignments.map((assignment) => {
    const latestPing = assignment.locationPings[0];
    const driverOptions = drivers.filter(
      (driver) => !assignment.carrierId || driver.carrierId === assignment.carrierId
    );

    return {
      tracking: assignment.trackingNumber,
      route: `${assignment.routeRun.routeName} / ${formatDate(assignment.routeRun.routeDate)}`,
      carrier: `${assignment.carrier.carrierCode} / ${assignment.carrier.name}`,
      driver: assignment.driver ? `${assignment.driver.driverCode} / ${assignment.driver.fullName}` : "Awaiting carrier assignment",
      batches: assignment.routeRun.stops.map((stop) => stop.shipment.batchId).join(", "),
      stops: String(assignment.routeRun.stops.length),
      status: <StatusPill status={assignment.status} />,
      lastPing: formatLocation(latestPing),
      respond:
        canRespond && assignment.status === "OFFERED" ? (
          <div className="table-action-stack">
            <form action={respondToRouteAssignmentAction}>
              <input type="hidden" name="routeAssignmentId" value={assignment.id} />
              <input type="hidden" name="status" value="ACCEPTED" />
              <button className="button button--small" type="submit">
                Accept
              </button>
            </form>
            <form action={respondToRouteAssignmentAction} className="inline-form">
              <input type="hidden" name="routeAssignmentId" value={assignment.id} />
              <input type="hidden" name="status" value="DECLINED" />
              <input name="declineReason" placeholder="Reason" />
              <button className="button button--ghost button--small" type="submit">
                Decline
              </button>
            </form>
          </div>
        ) : (
          assignment.respondedBy ? `${assignment.respondedBy.fullName} / ${assignment.status.replaceAll("_", " ")}` : "-"
        ),
      assignDriver:
        canAssignDriver && assignment.status !== "COMPLETED" && assignment.status !== "CANCELLED" ? (
          <form action={assignRouteAssignmentDriverAction} className="inline-form">
            <input type="hidden" name="routeAssignmentId" value={assignment.id} />
            <input
              name="driverCode"
              list={`assignment-drivers-${assignment.id}`}
              defaultValue={assignment.driver?.driverCode ?? ""}
              placeholder="Driver code"
            />
            <button className="button button--small" type="submit">
              Save
            </button>
            <datalist id={`assignment-drivers-${assignment.id}`}>
              {driverOptions.map((driver) => (
                <option key={driver.id} value={driver.driverCode}>
                  {driver.fullName}
                </option>
              ))}
            </datalist>
          </form>
        ) : (
          assignment.driver?.fullName ?? "-"
        ),
      testPing:
        canTrack && assignment.driver ? (
          <form action={recordDriverLocationPingAction} className="inline-form inline-form--compact">
            <input type="hidden" name="routeAssignmentId" value={assignment.id} />
            <input name="latitude" defaultValue="40.7357" placeholder="Lat" />
            <input name="longitude" defaultValue="-74.1724" placeholder="Lng" />
            <button className="button button--ghost button--small" type="submit">
              Log ping
            </button>
          </form>
        ) : (
          "-"
        )
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Assignments"
        title={context.role === "DRIVER" ? "Driver Load Inbox" : "Carrier Assignment Desk"}
        description="This is the missing dispatcher-to-carrier handoff: publish a truck run, create a tracking number, let the carrier accept it, assign a driver, and start collecting live progress."
      />

      <SectionCard
        title="Assignment Workflow"
        description="Each published truck run can now create a carrier assignment record with its own tracking number, carrier response, driver handoff, and location timeline."
      >
        <ul className="note-list">
          <li>Dispatcher publishes the truck run and offers it to a carrier.</li>
          <li>Carrier accepts or declines the offered load.</li>
          <li>Carrier assigns the load to one of its drivers.</li>
          <li>Driver/mobile app pings can be tied back to the assignment tracking number.</li>
        </ul>
      </SectionCard>

      <SectionCard
        title="Route Assignments"
        description="These assignments are filtered by the active role. Carrier users only see their carrier loads, and driver users only see their own assigned loads."
      >
        <SimpleTable
          columns={[
            { key: "tracking", label: "Tracking" },
            { key: "route", label: "Route" },
            { key: "carrier", label: "Carrier" },
            { key: "driver", label: "Driver" },
            { key: "batches", label: "Batches" },
            { key: "stops", label: "Stops" },
            { key: "status", label: "Status" },
            { key: "lastPing", label: "Last Ping" },
            { key: "respond", label: "Response" },
            { key: "assignDriver", label: "Assign Driver" },
            { key: "testPing", label: "Test Ping" }
          ]}
          rows={assignmentRows}
          emptyMessage="No carrier assignments have been published yet."
        />
      </SectionCard>
    </>
  );
}
