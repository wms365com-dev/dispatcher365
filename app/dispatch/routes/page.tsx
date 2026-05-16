import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { TruckRunStagingWorkspace } from "@/components/truck-run-staging-workspace";
import {
  publishRouteRunAction
} from "@/lib/server/dispatch-actions";
import { getRoutesData } from "@/lib/server/dispatch-service";

interface RoutesPageProps {
  searchParams?: Promise<{
    routeIssue?: string;
    view?: string;
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
    pallets: number;
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
  truckCount: number;
  status: string;
  mobileSyncAt?: Date | null;
  carrier?: {
    carrierCode: string;
    name: string;
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
  const view = params?.view === "list" ? "list" : "create";
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
  const isInternalRole = internalRoles.includes(context.role);

  const candidateRows = routeCandidates.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    carrier: shipment.carrier?.carrierCode ?? "Assign at route",
    shipDate: shipment.shipDate ? formatDate(shipment.shipDate) : "-",
    pallets: String(shipment.pallets),
    cartons: String(shipment.cartons),
    status: shipment.status
  }));

  const routeRows = routes.map((route) => ({
    date: formatDate(route.routeDate),
    carrier: route.carrier?.name ?? route.carrier?.carrierCode ?? "Unassigned",
    trucks: String(route.truckCount),
    pallets: String(
      route.stops.reduce((sum, stop) => sum + stop.shipment.pallets, 0)
    ),
    stops: String(route.stops.length),
    tools: (
      <div className="table-action-stack">
        <Link className="table-link" href={`/dispatch/routes/${route.id}/manifest`}>
          View manifest
        </Link>
        {route.status === "DRAFT" ? (
          <form action={publishRouteRunAction}>
            <input type="hidden" name="routeRunId" value={route.id} />
            <button className="button button--small" type="submit">
              Publish
            </button>
          </form>
        ) : (
          <span className="helper-text">
            <StatusPill status={route.status} />
          </span>
        )}
        {assignments.find((assignment) => assignment.routeRunId === route.id)?.trackingNumber ? (
          <span className="helper-text">
            Tracking {assignments.find((assignment) => assignment.routeRunId === route.id)?.trackingNumber}
          </span>
        ) : null}
        {mobileAlerts.filter((alert) => alert.routeRunId === route.id).length ? (
          <span className="helper-text">
            Alerts {mobileAlerts.filter((alert) => alert.routeRunId === route.id).length}
          </span>
        ) : null}
      </div>
    )
  }));

  return (
    <>
      <PageHeader
        eyebrow="Truck run"
        title={view === "list" ? "Trucks List" : "Add new Truck Run"}
        description=""
      />

      {routeIssue ? (
        <SectionCard title="Route Planning Notice" description="">
          <p className="helper-text">
            No eligible batches were found for that route request. Create the BOL first, then assign the batch to a route.
          </p>
        </SectionCard>
      ) : null}

      {isInternalRole && view === "create" ? (
        <TruckRunStagingWorkspace
          candidates={candidateRows}
          carriers={carriers}
          drivers={drivers}
        />
      ) : (
        <SectionCard title="Execution Notes" description="">
          <ul className="note-list">
            <li>`Run Planning` shows only the route runs assigned to your carrier or driver account.</li>
            <li>`Packing Available` is the old active-jobs screen.</li>
            <li>`Jobs History` and `Delivered History` follow the same truck-run execution after the route is live.</li>
          </ul>
        </SectionCard>
      )}

      {view === "list" ? (
        <SectionCard title="Trucks List" description="">
          <SimpleTable
            columns={[
              { key: "date", label: "Run Date" },
              { key: "carrier", label: "Carrier Name" },
              { key: "trucks", label: "Trucks Total" },
              { key: "pallets", label: "Pallets Total" },
              { key: "stops", label: "Stops Total" },
              { key: "tools", label: "Tools" }
            ]}
            rows={routeRows}
            emptyMessage="No route runs have been created yet."
          />
        </SectionCard>
      ) : null}
    </>
  );
}
