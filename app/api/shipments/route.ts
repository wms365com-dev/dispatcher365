import { createShipment, getPackingSlipsData } from "@/lib/server/dispatch-service";
import { shipmentCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  const { shipments } = await getPackingSlipsData();

  const filtered = tenantId
    ? shipments.filter((shipment) => shipment.tenantId === tenantId)
    : shipments;

  return Response.json({ data: filtered });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = shipmentCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createShipment(parsed.data);

  if (!result.created) {
    return Response.json(
      {
        error: "Customer not found",
        lookupQuery: result.lookupQuery,
        matches: result.matches
      },
      { status: 404 }
    );
  }

  return Response.json({ data: result.shipment }, { status: 201 });
}
