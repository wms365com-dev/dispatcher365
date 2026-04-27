export type FreightTerms = "prepaid" | "collect" | "third-party";

export type ShipmentStatus =
  | "draft"
  | "ready-for-bol"
  | "assigned"
  | "routed"
  | "published";

export type RouteStatus = "draft" | "published" | "in-transit" | "completed";

export type RouteStopStatus =
  | "planned"
  | "published"
  | "in-transit"
  | "delivered"
  | "refused"
  | "returned"
  | "exception";

export type DeliveryEventType =
  | "in-transit"
  | "delivered"
  | "payment-collected"
  | "returned"
  | "refused"
  | "exception";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  customerCode: string;
  name: string;
  city: string;
  state: string;
  postalCode: string;
  address1: string;
  phone?: string;
  email?: string;
  freightTerms: FreightTerms;
}

export interface Carrier {
  id: string;
  tenantId: string;
  carrierCode: string;
  name: string;
  scac?: string;
  email?: string;
  phone?: string;
}

export interface Driver {
  id: string;
  tenantId: string;
  carrierId: string;
  fullName: string;
  phone?: string;
  mobileStatus: "offline" | "ready" | "synced";
}

export interface Shipment {
  id: string;
  tenantId: string;
  batchId: string;
  customerCode: string;
  customerPo: string;
  salesOrder: string;
  salesperson?: string;
  status: ShipmentStatus;
  routeDate?: string;
  deliveryDate?: string;
  deliveryWindow?: string;
  authorizedBy?: string;
  approvedBy?: string;
  carrierCode?: string;
  cartons: number;
  pallets: number;
  weightLb: number;
  cubeCuFt: number;
  freightClass: string;
  comments?: string;
}

export interface ShipmentLine {
  id: string;
  shipmentId: string;
  itemCode: string;
  description: string;
  cartons: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLb: number;
}

export interface BillOfLading {
  id: string;
  shipmentId: string;
  bolNumber: string;
  template: "STANDARD" | "RETURN" | "CDN" | "LA";
  freightTerms: FreightTerms;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  shipmentBatchId: string;
  customerCode: string;
  city: string;
  state: string;
  pallets: number;
  cartons: number;
  stopNumber: number;
  status: RouteStopStatus;
}

export interface RouteRun {
  id: string;
  routeName: string;
  routeDate: string;
  carrierCode: string;
  driverName: string;
  status: RouteStatus;
  truckCount: number;
  stopCount: number;
  palletCount: number;
  publishedToMobileAt?: string;
  stops: RouteStop[];
}

export interface LabelJob {
  id: string;
  shipmentBatchId: string;
  kind: "carton" | "pallet";
  quantity: number;
  printedAt?: string;
}

export interface DeliveryEvent {
  id: string;
  shipmentBatchId: string;
  eventType: DeliveryEventType;
  eventAt: string;
  recipientName?: string;
  note?: string;
  codAmount?: number;
  paymentType?: string;
}
