import { recordDriverLocationPing } from "@/lib/server/dispatch-service";
import { driverLocationPingCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = driverLocationPingCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ping = await recordDriverLocationPing(parsed.data);

  if (!ping) {
    return Response.json({ error: "Assignment not found or driver access unavailable" }, { status: 404 });
  }

  return Response.json({
    data: {
      routeAssignmentId: ping.routeAssignmentId,
      latitude: ping.latitude,
      longitude: ping.longitude,
      capturedAt: ping.capturedAt
    }
  });
}
