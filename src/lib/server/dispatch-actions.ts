"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignDriverToRouteAssignment,
  createCarrier,
  createCompany,
  createCustomer,
  createDriver,
  createIssueReport,
  createProduct,
  createRouteRun,
  createSalesRep,
  createShipment,
  createUserAccount,
  generateBillOfLading,
  publishRouteRun,
  queueLabelJob,
  recordDeliveryEvent,
  recordDriverLocationPing,
  respondToRouteAssignment,
  sendBolEmail,
  sendRouteManifestEmail,
  startRouteAssignment,
  updateBolShipmentLegacyStatus,
  updateIssueReport
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

export async function createSalesRepAction(formData: FormData) {
  await createSalesRep(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/sales-reps");
  revalidatePath("/dispatch/packing-slips");
  redirect("/dispatch/sales-reps");
}

export async function createDriverAction(formData: FormData) {
  await createDriver(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/carriers");
  revalidatePath("/dispatch/routes");
  redirect("/dispatch/carriers");
}

export async function createProductAction(formData: FormData) {
  await createProduct(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/carton-info");
  revalidatePath("/dispatch/labels");
  redirect("/dispatch/carton-info");
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
  const payload = {
    batchIds: formData
      .getAll("batchIds")
      .map((value) => String(value))
      .filter(Boolean)
      .join(","),
    template: String(formData.get("template") ?? "STANDARD")
  };
  const bill = await generateBillOfLading(payload);

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/bols");
  revalidatePath("/dispatch/routes");

  const batchIds = encodeURIComponent(payload.batchIds);

  if (!bill) {
    redirect(`/dispatch/bols?error=shipment-not-found&batchIds=${batchIds}`);
  }

  redirect(`/dispatch/bols?generated=${encodeURIComponent(bill.bolNumber)}&batchIds=${batchIds}`);
}

export async function changeBolSelectionToShippedAction(formData: FormData) {
  const payload = {
    batchIds: String(formData.get("batchIds") ?? ""),
    legacyStatus: "SHIPPED" as const
  };

  await updateBolShipmentLegacyStatus(payload);

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/packing-slips");
  revalidatePath("/dispatch/bols");
  revalidatePath("/dispatch/routes");

  const batchIds = encodeURIComponent(payload.batchIds);
  redirect(`/dispatch/bols?batchIds=${batchIds}&bulkStatus=shipped`);
}

export async function createRouteRunAction(formData: FormData) {
  const routeRun = await createRouteRun(toFormObject(formData));

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  revalidatePath("/dispatch/routes/assign");
  revalidatePath("/dispatch/routes/jobs");

  if (!routeRun) {
    redirect("/dispatch/routes?routeIssue=no-eligible-batches");
  }

  redirect("/dispatch/routes");
}

export async function publishRouteRunAction(formData: FormData) {
  await publishRouteRun(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  revalidatePath("/dispatch/assignments");
  revalidatePath("/dispatch/routes/assign");
  revalidatePath("/dispatch/routes/jobs");
  revalidatePath("/dispatch/routes/history");
  redirect("/dispatch/routes");
}

export async function respondToRouteAssignmentAction(formData: FormData) {
  await respondToRouteAssignment(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/assignments");
  revalidatePath("/dispatch/routes/assign");
  revalidatePath("/dispatch/routes/jobs");
  revalidatePath("/dispatch/routes/history");
  redirect(String(formData.get("returnTo") ?? "/dispatch/assignments") as Route);
}

export async function assignRouteAssignmentDriverAction(formData: FormData) {
  await assignDriverToRouteAssignment(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  revalidatePath("/dispatch/assignments");
  revalidatePath("/dispatch/routes/assign");
  revalidatePath("/dispatch/routes/jobs");
  redirect(String(formData.get("returnTo") ?? "/dispatch/assignments") as Route);
}

export async function startRouteAssignmentAction(formData: FormData) {
  const payload = toFormObject(formData);
  await startRouteAssignment(payload);
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  revalidatePath("/dispatch/assignments");
  revalidatePath("/dispatch/routes/jobs");
  revalidatePath("/dispatch/routes/history");
  revalidatePath("/dispatch/deliveries");
  redirect(String(formData.get("returnTo") ?? "/dispatch/routes/jobs") as Route);
}

export async function recordDriverLocationPingAction(formData: FormData) {
  await recordDriverLocationPing(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/assignments");
  revalidatePath("/dispatch/routes");
  redirect("/dispatch/assignments");
}

export async function queueLabelJobAction(formData: FormData) {
  await queueLabelJob(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/labels");
  redirect("/dispatch/labels");
}

export async function recordDeliveryEventAction(formData: FormData) {
  await recordDeliveryEvent(toFormObject(formData));
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/routes");
  revalidatePath("/dispatch/packing-slips");
  revalidatePath("/dispatch/deliveries");
  revalidatePath("/dispatch/routes/history");
  revalidatePath("/dispatch/routes/delivered-history");
  redirect("/dispatch/deliveries");
}

export async function createUserAction(formData: FormData) {
  await createUserAccount(toFormObject(formData));
  revalidatePath("/dispatch/users");
  revalidatePath("/dispatch/companies");
  redirect("/dispatch/users");
}

export async function createCompanyAction(formData: FormData) {
  await createCompany(toFormObject(formData));
  revalidatePath("/dispatch/companies");
  redirect("/dispatch/companies");
}

export async function createIssueReportAction(formData: FormData) {
  await createIssueReport(toFormObject(formData));
  revalidatePath("/dispatch/report-issue");
  revalidatePath("/dispatch/issues");
  redirect("/dispatch/report-issue?submitted=1");
}

export async function updateIssueReportAction(formData: FormData) {
  await updateIssueReport(toFormObject(formData));
  revalidatePath("/dispatch/issues");
  redirect("/dispatch/issues?updated=1");
}

export async function sendBolEmailAction(formData: FormData) {
  const payload = toFormObject(formData);
  const emailLog = await sendBolEmail(payload);
  revalidatePath("/dispatch/bols");

  const bolNumber = encodeURIComponent(String(payload.bolNumber ?? ""));
  const batchIds = encodeURIComponent(String(payload.batchIds ?? ""));
  const emailStatus = encodeURIComponent(emailLog?.status?.toLowerCase() ?? "failed");
  redirect(`/dispatch/bols?generated=${bolNumber}&batchIds=${batchIds}&emailStatus=${emailStatus}`);
}

export async function sendRouteManifestEmailAction(formData: FormData) {
  const payload = toFormObject(formData);
  const emailLog = await sendRouteManifestEmail(payload);

  const routeRunId = String(payload.routeRunId ?? "");
  revalidatePath("/dispatch/routes");
  revalidatePath(`/dispatch/routes/${routeRunId}/manifest`);
  const emailStatus = encodeURIComponent(emailLog?.status?.toLowerCase() ?? "failed");
  redirect(`/dispatch/routes/${routeRunId}/manifest?emailStatus=${emailStatus}`);
}
