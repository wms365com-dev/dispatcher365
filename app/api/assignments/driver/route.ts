import { assignDriverToRouteAssignment } from "@/lib/server/dispatch-service";
import { routeAssignmentDriverSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = routeAssignmentDriverSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await assignDriverToRouteAssignment(parsed.data);

  if (!assignment) {
    return Response.json({ error: "Assignment or driver not found" }, { status: 404 });
  }

  return Response.json({
    data: {
      routeAssignmentId: assignment.id,
      driverId: assignment.driverId,
      status: assignment.status,
      driverAssignedAt: assignment.driverAssignedAt
    }
  });
}
