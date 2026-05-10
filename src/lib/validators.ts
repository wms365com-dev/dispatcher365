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
  billingAddress2: optionalText,
  city: z.string().trim().min(2),
  state: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().min(3),
  country: optionalText.transform((value) => value?.toUpperCase() ?? "US"),
  phone: optionalText,
  email: optionalEmail,
  comments: optionalText,
  freightTerms: z.enum(["prepaid", "collect", "third-party"]).default("prepaid"),
  shipToCode: optionalText,
  shipToName: optionalText,
  shipToAddress1: optionalText,
  shipToAddress2: optionalText,
  shipToCity: optionalText,
  shipToState: optionalText.transform((value) => value?.toUpperCase()),
  shipToPostalCode: optionalText,
  shipToCountry: optionalText.transform((value) => value?.toUpperCase()),
  shipToPhone: optionalText,
  shipToEmail: optionalEmail
});

export const carrierCreateSchema = z.object({
  carrierCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2),
  address1: optionalText,
  address2: optionalText,
  city: optionalText,
  state: optionalText.transform((value) => value?.toUpperCase()),
  postalCode: optionalText,
  country: optionalText.transform((value) => value?.toUpperCase() ?? "US"),
  scac: optionalText.transform((value) => value?.toUpperCase()),
  email: optionalEmail,
  phone: optionalText,
  fax: optionalText,
  cell: optionalText,
  contactName: optionalText,
  website: optionalText,
  websitePickup: optionalText,
  isLtl: checkboxValue,
  isFtl: checkboxValue,
  isBroker: checkboxValue
});

export const salesRepCreateSchema = z.object({
  repCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  fullName: z.string().trim().min(2),
  email: optionalEmail,
  phone: optionalText
});

export const driverCreateSchema = z.object({
  driverCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  fullName: z.string().trim().min(2),
  carrierCode: optionalText.transform((value) => value?.toUpperCase()),
  phone: optionalText,
  email: optionalEmail
});

export const productCreateSchema = z.object({
  sku: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  description: z.string().trim().min(2),
  productLine: optionalText,
  productType: optionalText,
  packageType: optionalText,
  nmfcCode: optionalText,
  defaultWeightLb: optionalNumber,
  lengthIn: optionalNumber,
  widthIn: optionalNumber,
  heightIn: optionalNumber,
  casePack: optionalText,
  volumeCuFt: optionalNumber
});

export const shipmentCreateSchema = z.object({
  batchId: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  customerCode: z.string().trim().min(2).transform((value) => value.toUpperCase()),
  customerPo: optionalText,
  salesOrder: optionalText,
  salesperson: optionalText,
  shipDate: optionalText,
  cancelDate: optionalText,
  deliveryDate: optionalText,
  deliveryWindow: optionalText,
  routeDeskDate: optionalText,
  routedDate: optionalText,
  carrierCode: optionalText.transform((value) => value?.toUpperCase()),
  authorization: optionalText,
  approvedBy: optionalText,
  approvalNotes: optionalText,
  scac: optionalText.transform((value) => value?.toUpperCase()),
  checkOrCash: optionalText,
  codAmount: optionalNumber,
  units: optionalNumber.default(0),
  cartons: optionalNumber.default(0),
  pallets: optionalNumber.default(0),
  weightLb: optionalNumber,
  cubeCuFt: optionalNumber,
  heightIn: optionalNumber,
  freightClass: optionalText,
  department: optionalText,
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

export const userCreateSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(2),
  password: z.string().trim().min(8),
  role: z.enum([
    "PLATFORM_ADMIN",
    "TENANT_ADMIN",
    "DISPATCHER",
    "WAREHOUSE",
    "CUSTOMER_SERVICE",
    "DRIVER"
  ]),
  tenantSlug: optionalText
});

export const companyCreateSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).transform((value) => value.toLowerCase().replace(/[^a-z0-9-]+/g, "-")),
  gs1CompanyPrefix: optionalText.refine(
    (value) => !value || /^\d{6,10}$/.test(value),
    "GS1 company prefix must be 6 to 10 digits."
  ),
  warehouseName: optionalText,
  warehouseAddress1: optionalText,
  warehouseAddress2: optionalText,
  warehouseCity: optionalText,
  warehouseState: optionalText.transform((value) => value?.toUpperCase()),
  warehousePostalCode: optionalText,
  warehouseCountry: optionalText.transform((value) => value?.toUpperCase() ?? "US"),
  warehousePhone: optionalText,
  warehouseFob: optionalText
});

export const labelJobCreateSchema = z.object({
  batchId: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  labelKind: z.enum(["CARTON", "PALLET"]),
  templateVariant: z.enum(["SIMPLE", "ITEM", "CASE"]),
  quantity: z.coerce.number().int().positive().default(1)
});
