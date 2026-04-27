import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(emptyStringToUndefined, z.string().email().optional());
const optionalNumber = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().nonnegative().optional()
);
const checkboxValue = z
  .union([z.literal("on"), z.literal("true"), z.literal("1")])
  .optional()
  .transform(Boolean);

export const customerCreateSchema = z.object({
  customerCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2),
  billingAddress1: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().min(3),
  country: optionalText.transform((value) => value?.toUpperCase() ?? "US"),
  phone: optionalText,
  email: optionalEmail,
  freightTerms: z.enum(["prepaid", "collect", "third-party"]).default("prepaid")
});

export const carrierCreateSchema = z.object({
  carrierCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2),
  scac: optionalText.transform((value) => value?.toUpperCase()),
  email: optionalEmail,
  phone: optionalText,
  contactName: optionalText,
  isLtl: checkboxValue,
  isFtl: checkboxValue,
  isBroker: checkboxValue
});

export const driverCreateSchema = z.object({
  driverCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  fullName: z.string().trim().min(2),
  carrierCode: optionalText.transform((value) => value?.toUpperCase()),
  phone: optionalText,
  email: optionalEmail
});

export const shipmentCreateSchema = z.object({
  batchId: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  customerCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  customerPo: optionalText,
  salesOrder: optionalText,
  salesperson: optionalText,
  shipDate: optionalText,
  deliveryDate: optionalText,
  deliveryWindow: optionalText,
  carrierCode: optionalText.transform((value) => value?.toUpperCase()),
  cartons: optionalNumber.default(0),
  pallets: optionalNumber.default(0),
  weightLb: optionalNumber,
  cubeCuFt: optionalNumber,
  freightClass: optionalText,
  comments: optionalText
});

export const bolGenerateSchema = z.object({
  batchId: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  template: z.enum(["STANDARD", "RETURN", "CDN", "LA"]).default("STANDARD")
});

export const routeCreateSchema = z.object({
  routeName: z.string().trim().min(3),
  routeDate: z.string().trim().min(1),
  carrierCode: optionalText.transform((value) => value?.toUpperCase()),
  driverCode: optionalText.transform((value) => value?.toUpperCase()),
  batchIds: z.string().trim().min(1)
});

export const routePublishSchema = z.object({
  routeRunId: z.string().min(1)
});

export const deliveryEventCreateSchema = z.object({
  batchId: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  eventType: z.enum([
    "IN_TRANSIT",
    "DELIVERED",
    "PAYMENT_COLLECTED",
    "RETURNED",
    "REFUSED",
    "EXCEPTION"
  ]),
  recipientName: optionalText,
  note: optionalText,
  codAmount: optionalNumber,
  paymentType: optionalText,
  proofPhotoUrl: optionalText,
  proofSignatureUrl: optionalText
});
