import { generateBillOfLading } from "@/lib/server/dispatch-service";
import { bolGenerateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = bolGenerateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const bill = await generateBillOfLading(parsed.data);

  if (!bill) {
    return Response.json({ error: "Shipment not found" }, { status: 404 });
  }

  return Response.json({
    data: {
      shipmentId: bill.shipmentId,
      bolNumber: bill.bolNumber,
      template: bill.templateVariant,
      batchId: bill.shipment.batchId,
      customerCode: bill.shipment.customer.customerCode,
      freightTerms: bill.freightTerms
    }
  });
}
