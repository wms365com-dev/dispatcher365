import { getDashboardData } from "@/lib/server/dispatch-service";

export async function GET() {
  const { metrics } = await getDashboardData();

  return Response.json({
    data: {
      shipmentCount: metrics.shipmentCount,
      readyForBolCount: metrics.readyForBolCount,
      customerCount: metrics.customerCount,
      bolCreatedCount: metrics.bolCreatedCount,
      routedCount: metrics.routedCount,
      publishedRouteCount: metrics.publishedRouteCount
    }
  });
}
