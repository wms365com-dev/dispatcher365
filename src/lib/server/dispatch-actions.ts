"use server";

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCarrier,
  createCustomer,
  createDriver,
  createRouteRun,
  createShipment,
  generateBillOfLading,
  publishRouteRun,
  recordDeliveryEvent
} from "@/lib/server/dispatch-service";

function toFormObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCustomerAction(formData: FormData) {
  await createCustomer(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/customers");
  revalidatePath("/dispatch/packing-slips");
  redirect("/dispatch/customers");
}

export async function createCarrierAction(formData: FormData) {
  await createCarrier(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/carriers");
  redirect("/dispatch/carriers");
}

export async function createDriverAction(formData: FormData) {
  await createDriver(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/carriers");
  revalidatePath("/dispatch/routes");
  redirect("/dispatch/carriers");
}

export async function createShipmentAction(formData: FormData) {
  const result = await createShipment(toFormObject(formData));

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/packing-slips");

  if (!result.created) {
    const lookup = encodeURIComponent(result.lookupQuery);
    redirect(`/dispatch/packing-slips?customerLookup=${lookup}`);
  }

  revalidatePath("/dispatch/bols");
  redirect("/dispatch/packing-slips");
}

export async function generateBillOfLadingAction(formData: FormData) {
  const payload = toFormObject(formData);
  const bill = await generateBillOfLading(payload);

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/bols");
  revalidatePath("/dispatch/routes");

  const batchId = typeof payload.batchId === "string" ? encodeURIComponent(payload.batchId) : "";

  if (!bill) {
    redirect(`/dispatch/bols?error=shipment-not-found&batchId=${batchId}`);
  }

  redirect(`/dispatch/bols?generated=${encodeURIComponent(bill.bolNumber)}&batchId=${batchId}`);
}

export async function createRouteRunAction(formData: FormData) {
  const routeRun = await createRouteRun(toFormObject(formData));

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");

  if (!routeRun) {
    redirect("/dispatch/routes?routeIssue=no-eligible-batches");
  }

  redirect("/dispatch/routes");
}

export async function publishRouteRunAction(formData: FormData) {
  await publishRouteRun(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  redirect("/dispatch/routes");
}

export async function recordDeliveryEventAction(formData: FormData) {
  await recordDeliveryEvent(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  revalidatePath("/dispatch/packing-slips");
  revalidatePath("/dispatch/deliveries");
  redirect("/dispatch/deliveries");
}
