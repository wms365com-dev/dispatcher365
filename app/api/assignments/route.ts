import { getAssignmentsData } from "@/lib/server/dispatch-service";

interface AssignmentApiRecord {
  id: string;
  trackingNumber: string;
  status: string;
  lastLocationAt?: Date | null;
  offeredAt: Date;
  carrier: {
    carrierCode: string;
    name: string;
  };
  driver?: {
    driverCode: string;
    fullName: string;
  } | null;
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
}

export async function GET() {
  const assignmentsData = await getAssignmentsData();
  const assignments = assignmentsData.assignments as AssignmentApiRecord[];
  const context = assignmentsData.context as {
    tenant: {
      slug: string;
    };
    role: string;
  };

  return Response.json({
    data: assignments.map((assignment) => ({
      id: assignment.id,
      trackingNumber: assignment.trackingNumber,
      status: assignment.status,
      carrier: {
        code: assignment.carrier.carrierCode,
        name: assignment.carrier.name
      },
      driver: assignment.driver
        ? {
            code: assignment.driver.driverCode,
            fullName: assignment.driver.fullName
          }
        : null,
      routeRun: {
        id: assignment.routeRun.id,
        routeName: assignment.routeRun.routeName,
        routeDate: assignment.routeRun.routeDate,
        stopCount: assignment.routeRun.stops.length
      },
      batchIds: assignment.routeRun.stops.map((stop) => stop.shipment.batchId),
      lastLocationAt: assignment.lastLocationAt,
      offeredAt: assignment.offeredAt
    })),
    meta: {
      tenant: context.tenant.slug,
      role: context.role
    }
  });
}
