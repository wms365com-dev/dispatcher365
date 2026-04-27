export const dispatchNavigation = [
  { href: "/dispatch", label: "Dashboard", shortLabel: "DB", description: "Workbook home page rebuilt as an app dashboard." },
  { href: "/dispatch/packing-slips", label: "Packing Slips", shortLabel: "PS", description: "Shipment intake from Enter Packing Slip." },
  { href: "/dispatch/customers", label: "Customers", shortLabel: "CU", description: "Customer master and search from CDS." },
  { href: "/dispatch/search", label: "Search", shortLabel: "SR", description: "Global lookup for customers, batches, and orders." },
  { href: "/dispatch/carriers", label: "Carriers", shortLabel: "CR", description: "Carrier and driver assignments." },
  { href: "/dispatch/bols", label: "BOLs", shortLabel: "BL", description: "BOL staging and print variants." },
  { href: "/dispatch/routes", label: "Routes", shortLabel: "RT", description: "Truck run planning and mobile publish." },
  { href: "/dispatch/deliveries", label: "Deliveries", shortLabel: "DL", description: "Route execution, POD, and exception events." },
  { href: "/dispatch/labels", label: "Labels", shortLabel: "LB", description: "Carton and pallet label generation." },
  { href: "/dispatch/freight", label: "Freight", shortLabel: "FR", description: "Density, cube, and freight class tools." }
] as const;
