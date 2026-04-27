import { createCustomer, getCustomersData } from "@/lib/server/dispatch-service";
import { customerCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  void request;
  const { customers } = await getCustomersData();

  return Response.json({ data: customers });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = customerCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await createCustomer(parsed.data);

  return Response.json({ data: customer }, { status: 201 });
}
