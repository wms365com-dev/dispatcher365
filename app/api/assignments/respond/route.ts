import { respondToRouteAssignment } from "@/lib/server/dispatch-service";
import { routeAssignmentRespondSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = routeAssignmentRespondSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await respondToRouteAssignment(parsed.data);

  if (!assignment) {
    return Response.json({ error: "Assignment not found" }, { status: 404 });
  }

  return Response.json({
    data: {
      routeAssignmentId: assignment.id,
      status: assignment.status,
      acceptedAt: assignment.acceptedAt,
      declinedAt: assignment.declinedAt
    }
  });
}
