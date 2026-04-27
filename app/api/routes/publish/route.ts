import { publishRouteRun } from "@/lib/server/dispatch-service";
import { routePublishSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = routePublishSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const route = await publishRouteRun(parsed.data);

  if (!route) {
    return Response.json({ error: "Route not found" }, { status: 404 });
  }

  return Response.json({
    data: {
      routeRunId: route.id,
      publishedAt: route.publishedAt,
      status: route.status
    }
  });
}
