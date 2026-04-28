import type {
  BillOfLading,
  Carrier,
  Customer,
  Driver,
  LabelJob,
  RouteRun,
  Shipment,
  ShipmentLine,
  Tenant
} from "@/lib/types";

export const tenant: Tenant = {
  id: "tenant-wms365-demo",
  slug: "wms365-demo",
  name: "WMS 365 Dispatch Demo"
};

export const customers: Customer[] = [
  {
    id: "cust-beaoutnj",
    tenantId: tenant.id,
    customerCode: "BEAOUTNJ",
    name: "BEALL'S OUTLET c/o NRT",
    address1: "2820 16th Street, Building C",
    city: "North Bergen",
    state: "NJ",
    postalCode: "07047",
    phone: "",
    freightTerms: "prepaid"
  },
  {
    id: "cust-unicit",
    tenantId: tenant.id,
    customerCode: "UNICIT",
    name: "UNION CITY HOME CENTER",
    address1: "3801 Bergenline Ave",
    city: "Union City",
    state: "NJ",
    postalCode: "07087",
    phone: "(201) 864-8576",
    freightTerms: "prepaid"
  },
  {
    id: "cust-homegonrt",
    tenantId: tenant.id,
    customerCode: "HOMEGONRT",
    name: "NRT BUILDING C",
    address1: "2820 16th Street",
    city: "North Bergen",
    state: "NJ",
    postalCode: "07047",
    phone: "2013301900x3912",
    freightTerms: "prepaid"
  },
  {
    id: "cust-norber",
    tenantId: tenant.id,
    customerCode: "NORBER",
    name: "NATIONAL RETAIL TRANSPORTATION INC",
    address1: "2820 16th Street, Building C",
    city: "North Bergen",
    state: "NJ",
    postalCode: "07047",
    phone: "",
    freightTerms: "prepaid"
  },
  {
    id: "cust-ozpty",
    tenantId: tenant.id,
    customerCode: "OZPTY",
    name: "APACSALE GROUP / OZSALE PTY LD",
    address1: "1107 South Boyle Avenue",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90023",
    phone: "",
    freightTerms: "third-party"
  }
];

export const carriers: Carrier[] = [
  {
    id: "carrier-global",
    tenantId: tenant.id,
    carrierCode: "GLOBAL",
    name: "Global Transport",
    scac: "GBLX",
    email: "ops@global.example",
    phone: "(201) 555-0184"
  },
  {
    id: "carrier-jp",
    tenantId: tenant.id,
    carrierCode: "JPX",
    name: "JP Express",
    scac: "JPEX",
    email: "dispatch@jpexpress.example",
    phone: "(973) 555-0128"
  },
  {
    id: "carrier-olj",
    tenantId: tenant.id,
    carrierCode: "OLJ",
    name: "Oljeje Transport",
    scac: "OLJT",
    email: "dispatch@oljeje.example",
    phone: "(416) 555-0199"
  }
];

export const drivers: Driver[] = [
  {
    id: "driver-andre",
    tenantId: tenant.id,
    carrierId: "carrier-jp",
    fullName: "Andre Miles",
    phone: "(917) 555-0101",
    mobileStatus: "ready"
  },
  {
    id: "driver-luis",
    tenantId: tenant.id,
    carrierId: "carrier-olj",
    fullName: "Luis Rojas",
    phone: "(917) 555-0144",
    mobileStatus: "synced"
  }
];

export const shipments: Shipment[] = [
  {
    id: "shipment-1002512",
    tenantId: tenant.id,
    batchId: "1002512",
    customerCode: "BEAOUTNJ",
    customerPo: "927234",
    salesOrder: "1286965",
    salesperson: "ZE47",
    status: "ready-for-bol",
    routeDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    deliveryWindow: "10:00 AM to 4:00 PM",
    approvedBy: "NRT TMS",
    carrierCode: "OLJ",
    cartons: 74,
    pallets: 3,
    weightLb: 1369,
    cubeCuFt: 97.78,
    freightClass: "125",
    comments: "NRT receiving appointment required."
  },
  {
    id: "shipment-1002513",
    tenantId: tenant.id,
    batchId: "1002513",
    customerCode: "BEAOUTNJ",
    customerPo: "958341",
    salesOrder: "1294389",
    salesperson: "ZE47",
    status: "assigned",
    routeDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    approvedBy: "NRT TMS",
    carrierCode: "OLJ",
    cartons: 30,
    pallets: 1,
    weightLb: 551,
    cubeCuFt: 44.12,
    freightClass: "125"
  },
  {
    id: "shipment-1002541",
    tenantId: tenant.id,
    batchId: "1002541",
    customerCode: "UNICIT",
    customerPo: "JB03721",
    salesOrder: "1295857",
    salesperson: "ZE47",
    status: "routed",
    routeDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    deliveryWindow: "10:00 AM to 4:00 PM",
    carrierCode: "OLJ",
    cartons: 35,
    pallets: 1,
    weightLb: 700,
    cubeCuFt: 51.33,
    freightClass: "125"
  },
  {
    id: "shipment-1002549",
    tenantId: tenant.id,
    batchId: "1002549",
    customerCode: "HOMEGONRT",
    customerPo: "40 395158",
    salesOrder: "1295147",
    salesperson: "ZE47",
    status: "published",
    routeDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    carrierCode: "OLJ",
    cartons: 123,
    pallets: 3,
    weightLb: 2460,
    cubeCuFt: 177.78,
    freightClass: "100"
  },
  {
    id: "shipment-1002558",
    tenantId: tenant.id,
    batchId: "1002558",
    customerCode: "NORBER",
    customerPo: "01 277487",
    salesOrder: "1296392",
    salesperson: "ZE47",
    status: "draft",
    routeDate: "2026-04-10",
    deliveryDate: "2026-04-11",
    carrierCode: "JPX",
    cartons: 30,
    pallets: 1,
    weightLb: 600,
    cubeCuFt: 45.21,
    freightClass: "125"
  }
];

export const shipmentLines: ShipmentLine[] = [
  {
    id: "line-1",
    shipmentId: "shipment-1002512",
    itemCode: "FH01143",
    description: "SUNBEAM 10PK VELVET HANGER BROWN",
    cartons: 1,
    lengthIn: 15.5,
    widthIn: 15,
    heightIn: 14,
    weightLb: 17.6
  },
  {
    id: "line-2",
    shipmentId: "shipment-1002512",
    itemCode: "35371",
    description: "SUNBEAM 10PK VELVET HANGER",
    cartons: 1,
    lengthIn: 15.5,
    widthIn: 15,
    heightIn: 14,
    weightLb: 17.6
  }
];

export const billsOfLading: BillOfLading[] = [
  {
    id: "bol-1",
    shipmentId: "shipment-1002512",
    bolNumber: "WG-1286965",
    template: "STANDARD",
    freightTerms: "prepaid",
    createdAt: "2026-04-06T14:32:00.000Z"
  },
  {
    id: "bol-2",
    shipmentId: "shipment-1002549",
    bolNumber: "RET-1295147",
    template: "RETURN",
    freightTerms: "third-party",
    createdAt: "2026-04-06T15:08:00.000Z"
  }
];

export const routeRuns: RouteRun[] = [
  {
    id: "route-olj-2026-04-08",
    routeName: "OLJEJE Transport Morning Run",
    routeDate: "2026-04-08",
    carrierCode: "OLJ",
    driverName: "Luis Rojas",
    status: "published",
    truckCount: 1,
    stopCount: 4,
    palletCount: 8,
    publishedToMobileAt: "2026-04-06T16:20:00.000Z",
    stops: [
      { id: "stop-1", shipmentBatchId: "1002512", customerCode: "BEAOUTNJ", city: "North Bergen", state: "NJ", pallets: 3, cartons: 74, stopNumber: 1, status: "published" },
      { id: "stop-2", shipmentBatchId: "1002513", customerCode: "BEAOUTNJ", city: "North Bergen", state: "NJ", pallets: 1, cartons: 30, stopNumber: 2, status: "published" },
      { id: "stop-3", shipmentBatchId: "1002541", customerCode: "UNICIT", city: "Union City", state: "NJ", pallets: 1, cartons: 35, stopNumber: 3, status: "published" },
      { id: "stop-4", shipmentBatchId: "1002549", customerCode: "HOMEGONRT", city: "North Bergen", state: "NJ", pallets: 3, cartons: 123, stopNumber: 4, status: "published" }
    ]
  },
  {
    id: "route-jp-2026-04-10",
    routeName: "JP Express Overflow Run",
    routeDate: "2026-04-10",
    carrierCode: "JPX",
    driverName: "Andre Miles",
    status: "draft",
    truckCount: 1,
    stopCount: 1,
    palletCount: 1,
    stops: [
      { id: "stop-5", shipmentBatchId: "1002558", customerCode: "NORBER", city: "North Bergen", state: "NJ", pallets: 1, cartons: 30, stopNumber: 1, status: "planned" }
    ]
  }
];

export const labelJobs: LabelJob[] = [
  {
    id: "label-1",
    shipmentBatchId: "1002512",
    kind: "carton",
    quantity: 74,
    printedAt: "2026-04-06T14:55:00.000Z"
  },
  {
    id: "label-2",
    shipmentBatchId: "1002512",
    kind: "pallet",
    quantity: 3,
    printedAt: "2026-04-06T14:57:00.000Z"
  }
];
