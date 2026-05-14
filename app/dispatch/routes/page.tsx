import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { TruckRunWorkspaceLinks } from "@/components/truck-run-workspace-links";
import {
  createRouteRunAction,
  publishRouteRunAction
} from "@/lib/server/dispatch-actions";
import { getRoutesData } from "@/lib/server/dispatch-service";

interface RoutesPageProps {
  searchParams?: Promise<{
    routeIssue?: string;
  }>;
}

interface RouteCandidateRecord {
  batchId: string;
  shipDate?: Date | null;
  pallets: number;
  cartons: number;
  status: string;
  customer: {
    customerCode: string;
    name: string;
  };
  carrier?: {
    carrierCode: string;
  } | null;
}

interface RouteAlertRecord {
  routeRunId: string;
}

interface RouteAssignmentRecord {
  routeRunId: string;
  trackingNumber: string;
  status: string;
}

interface RouteStopRecord {
  id: string;
  stopNumber: number;
  status: string;
  shipment: {
    batchId: string;
    customer: {
      customerCode: string;
      city?: string | null;
      state?: string | null;
    };
  };
}

interface RouteRunRecord {
  id: string;
  routeDate: Date;
  routeName: string;
  status: string;
  mobileSyncAt?: Date | null;
  carrier?: {
    carrierCode: string;
  } | null;
  driver?: {
    fullName: string;
  } | null;
  stops: RouteStopRecord[];
}

interface RouteCarrierRecord {
  id: string;
  carrierCode: string;
  name: string;
}

interface RouteDriverRecord {
  id: string;
  driverCode: string;
  fullName: string;
}

const internalRoles = [
  "PLATFORM_ADMIN",
  "TENANT_ADMIN",
  "DISPATCHER",
  "WAREHOUSE",
  "CUSTOMER_SERVICE"
];

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const routesData = await getRoutesData(params?.routeIssue);
  const context = routesData.context as {
    role: string;
  };
  const carriers = routesData.carriers as RouteCarrierRecord[];
  const drivers = routesData.drivers as RouteDriverRecord[];
  const routeCandidates = routesData.routeCandidates as RouteCandidateRecord[];
  const routes = routesData.routes as RouteRunRecord[];
  const mobileAlerts = routesData.mobileAlerts as RouteAlertRecord[];
  const assignments = routesData.assignments as RouteAssignmentRecord[];
  const routeIssue = routesData.routeIssue;
  const emailConfigured = routesData.emailConfigured;
  const isInternalRole = internalRoles.includes(context.role);

  const candidateRows = routeCandidates.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    carrier: shipment.carrier?.carrierCode ?? "Assign at route",
    shipDate: shipment.shipDate ? formatDate(shipment.shipDate) : "-",
    pallets: String(shipment.pallets),
    cartons: String(shipment.cartons),
    status: <StatusPill status={shipment.status} />
  }));

  const routeRows = routes.map((route) => ({
    tracking:
      assignments.find((assignment) => assignment.routeRunId === route.id)?.trackingNumber ?? "Pending",
    manifest: (
      <Link className="table-link" href={`/dispatch/routes/${route.id}/manifest`}>
        View manifest
      </Link>
    ),
    date: formatDate(route.routeDate),
    routeName: route.routeName,
    carrier: route.carrier?.carrierCode ?? "Unassigned",
    driver: route.driver?.fullName ?? "Unassigned",
    stops: String(route.stops.length),
    alerts: String(mobileAlerts.filter((alert) => alert.routeRunId === route.id).length),
    assignment:
      assignments.find((assignment) => assignment.routeRunId === route.id)?.status.replaceAll("_", " ") ?? "Pending offer",
    stopStatusSummary:
      route.stops.length === 0
        ? "No stops"
        : `${route.stops.filter((stop) => ["DELIVERED", "REFUSED", "RETURNED", "EXCEPTION"].includes(stop.status)).length}/${route.stops.length} complete`,
    status: <StatusPill status={route.status} />,
    mobile: route.mobileSyncAt ? formatDate(route.mobileSyncAt) : "Pending",
    action:
      route.status === "DRAFT" ? (
        <form action={publishRouteRunAction}>
          <input type="hidden" name="routeRunId" value={route.id} />
          <button className="button button--small" type="submit">
            Publish
          </button>
        </form>
      ) : (
        <span className="helper-text">Published</span>
      )
  }));

  return (
    <>
      <PageHeader
        eyebrow="Truck run"
        title="Truck Run Planning"
        description={
          isInternalRole
            ? "This is the rebuilt truck-run module: group BOL-created batches, assign a carrier, publish the run, and hand it into the new carrier assignment workflow with tracking numbers."
            : "This is the truck-run execution hub: review assigned runs, open the manifest, and move into jobs, assignment, and delivery history without digging through unrelated pages."
        }
      />

      <SectionCard
        title="Truck Run Workspaces"
        description="The old system split planning, assignment, jobs, and history into separate screens. Those workspaces are back here so dispatchers, carriers, and drivers can move through the module more directly."
      >
        <TruckRunWorkspaceLinks activeHref="/dispatch/routes" roleKey={context.role} />
      </SectionCard>

      {routeIssue ? (
        <SectionCard
          title="Route Planning Notice"
          description="The route form only accepts batches that already have a generated BOL and are not yet routed."
        >
          <p className="helper-text">
            No eligible batches were found for that route request. Create the BOL first, then assign the batch to a route.
          </p>
        </SectionCard>
      ) : null}

      {!emailConfigured ? (
        <SectionCard
          title="Email Setup Notice"
          description="Truck run email is wired into the workflow now, but SMTP needs to be configured in Railway before carriers can receive manifests."
        >
          <p className="helper-text">
            Add <strong>SMTP_HOST</strong>, <strong>SMTP_PORT</strong>, <strong>SMTP_FROM</strong>, and credentials in Railway to enable Email to Carrier.
          </p>
        </SectionCard>
      ) : null}

      {isInternalRole ? (
        <div className="split-grid">
          <SectionCard
            title="BOL-Created Route Candidates"
            description="These batches are ready to be assigned to a carrier and grouped into a run sheet."
          >
            <SimpleTable
              columns={[
                { key: "batchId", label: "Batch" },
                { key: "customer", label: "Customer" },
                { key: "carrier", label: "Carrier" },
                { key: "shipDate", label: "Ship Date" },
                { key: "pallets", label: "Pallets" },
                { key: "cartons", label: "Cartons" },
                { key: "status", label: "Status" }
              ]}
              rows={candidateRows}
              emptyMessage="No BOL-created batches are waiting for routing right now."
            />
          </SectionCard>

          <SectionCard
            title="Create Route Run"
            description="Enter one or more batch IDs, assign the route, then publish it to the future driver mobile app."
          >
            <form action={createRouteRunAction} className="field-grid">
              <label className="field">
                <span>Route name</span>
                <input name="routeName" placeholder="OLJ Morning Run" required />
              </label>
              <label className="field">
                <span>Route date</span>
                <input name="routeDate" type="date" required />
              </label>
              <label className="field">
                <span>Carrier code</span>
                <input name="carrierCode" list="route-carriers" placeholder="OLJ" />
              </label>
              <label className="field">
                <span>Driver code</span>
                <input name="driverCode" list="route-drivers" placeholder="LUIS" />
              </label>
              <label className="field field--wide">
                <span>Batch IDs</span>
                <textarea
                  name="batchIds"
                  rows={4}
                  placeholder="1002513, 1002541"
                  required
                />
              </label>
              <div className="field field--wide form-actions">
                <button className="button" type="submit">
                  Build route
                </button>
              </div>

              <datalist id="route-carriers">
                {carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.carrierCode}>
                    {carrier.name}
                  </option>
                ))}
              </datalist>
              <datalist id="route-drivers">
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.driverCode}>
                    {driver.fullName}
                  </option>
                ))}
              </datalist>
            </form>
          </SectionCard>
        </div>
      ) : (
        <SectionCard
          title="Execution Notes"
          description="Carriers and drivers do not need the planning form. Use the workspaces above to accept offered loads, assign drivers, start routes, and review delivery progress."
        >
          <ul className="note-list">
            <li>`Run Planning` shows only the route runs assigned to your carrier or driver account.</li>
            <li>`Packing Available` is the old active-jobs screen.</li>
            <li>`Jobs History` and `Delivered History` follow the same truck-run execution after the route is live.</li>
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Route Runs"
        description="Draft routes can be reviewed and then published to the future driver route inbox."
      >
        <SimpleTable
          columns={[
            { key: "tracking", label: "Tracking" },
            { key: "manifest", label: "Manifest" },
            { key: "date", label: "Date" },
            { key: "routeName", label: "Route" },
            { key: "carrier", label: "Carrier" },
            { key: "driver", label: "Driver" },
            { key: "stops", label: "Stops" },
            { key: "alerts", label: "Alerts" },
            { key: "assignment", label: "Assignment" },
            { key: "stopStatusSummary", label: "Stop Progress" },
            { key: "status", label: "Status" },
            { key: "mobile", label: "Mobile Sync" },
            { key: "action", label: "Action" }
          ]}
          rows={routeRows}
          emptyMessage="No route runs have been created yet."
        />
      </SectionCard>

      <SectionCard
        title="Route Stop Preview"
        description="Each run keeps ordered stops so the future mobile app and printable truck run manifest both use the same source data."
      >
        <div className="stack-grid">
          {routes.map((route) => (
            <article className="route-card" key={route.id}>
              <div className="route-card__header">
                <div>
                  <p className="kicker">{formatDate(route.routeDate)}</p>
                  <h4>{route.routeName}</h4>
                </div>
                <StatusPill status={route.status} />
              </div>
              <ul className="route-stop-list">
                {route.stops.map((stop) => (
                  <li key={stop.id}>
                    <strong>Stop {stop.stopNumber}</strong>
                    <span>
                      {stop.shipment.batchId} / {stop.shipment.customer.customerCode} / {stop.shipment.customer.city},{" "}
                      {stop.shipment.customer.state}
                    </span>
                    <span>
                      <StatusPill status={stop.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
