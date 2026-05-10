export interface DispatchNavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon:
    | "home"
    | "briefcase"
    | "boxes"
    | "file"
    | "customer"
    | "sales"
    | "carrier"
    | "route"
    | "printer"
    | "delivery"
    | "search"
    | "calculator";
}

export interface DispatchNavigationSection {
  title: string;
  items: DispatchNavigationItem[];
}

export const dispatchNavigationSections: DispatchNavigationSection[] = [
  {
    title: "Operations",
    items: [
      {
        href: "/dispatch",
        label: "Main Screen",
        shortLabel: "MS",
        description: "Tenant dashboard and queue summary.",
        icon: "home"
      },
      {
        href: "/dispatch/packing-slips",
        label: "Packing Slip",
        shortLabel: "PS",
        description: "Enter packing slips and review shipment intake.",
        icon: "briefcase"
      },
      {
        href: "/dispatch/carton-info",
        label: "Carton Info",
        shortLabel: "CI",
        description: "Carton master, dimensions, and label source data.",
        icon: "boxes"
      },
      {
        href: "/dispatch/bols",
        label: "BOL",
        shortLabel: "BL",
        description: "Batch lookup, BOL generation, and print staging.",
        icon: "file"
      },
      {
        href: "/dispatch/customers",
        label: "Customer",
        shortLabel: "CU",
        description: "Customer master data and lookup workflow.",
        icon: "customer"
      },
      {
        href: "/dispatch/sales-reps",
        label: "Sales Rep",
        shortLabel: "SR",
        description: "Sales rep master data from the legacy app.",
        icon: "sales"
      },
      {
        href: "/dispatch/carriers",
        label: "Carriers",
        shortLabel: "CR",
        description: "Carrier directory plus driver assignment.",
        icon: "carrier"
      },
      {
        href: "/dispatch/routes",
        label: "Truck Run",
        shortLabel: "TR",
        description: "Route planning, run sheets, and publish flow.",
        icon: "route"
      },
      {
        href: "/dispatch/labels",
        label: "Print Label",
        shortLabel: "PL",
        description: "Carton and pallet label output queue.",
        icon: "printer"
      }
    ]
  },
  {
    title: "Execution",
    items: [
      {
        href: "/dispatch/deliveries",
        label: "Delivered Orders",
        shortLabel: "DO",
        description: "Proof of delivery, exceptions, and route completion.",
        icon: "delivery"
      }
    ]
  },
  {
    title: "Utilities",
    items: [
      {
        href: "/dispatch/search",
        label: "Search",
        shortLabel: "SE",
        description: "Cross-record lookup for customers, batches, and orders.",
        icon: "search"
      },
      {
        href: "/dispatch/freight",
        label: "Freight Tools",
        shortLabel: "FT",
        description: "Density, cube, and freight class calculations.",
        icon: "calculator"
      }
    ]
  },
  {
    title: "Administration",
    items: [
      {
        href: "/dispatch/users",
        label: "User Manage",
        shortLabel: "UM",
        description: "User roles, approvals, and tenant membership.",
        icon: "customer"
      },
      {
        href: "/dispatch/companies",
        label: "Company Manage",
        shortLabel: "CM",
        description: "Company records and warehouse setup.",
        icon: "briefcase"
      }
    ]
  }
] as const;
