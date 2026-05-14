export interface DispatchNavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  adminOnly?: boolean;
  allowedRoles?: string[];
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
        allowedRoles: [
          "PLATFORM_ADMIN",
          "TENANT_ADMIN",
          "DISPATCHER",
          "WAREHOUSE",
          "CUSTOMER_SERVICE",
          "CARRIER_ADMIN",
          "CARRIER_DISPATCHER",
          "DRIVER"
        ],
        icon: "home"
      },
      {
        href: "/dispatch/packing-slips",
        label: "Packing Slip",
        shortLabel: "PS",
        description: "Enter packing slips and review shipment intake.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        icon: "briefcase"
      },
      {
        href: "/dispatch/carton-info",
        label: "Carton Info",
        shortLabel: "CI",
        description: "Carton master, dimensions, and label source data.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
        icon: "boxes"
      },
      {
        href: "/dispatch/bols",
        label: "BOL",
        shortLabel: "BL",
        description: "Batch lookup, BOL generation, and print staging.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        icon: "file"
      },
      {
        href: "/dispatch/customers",
        label: "Customer",
        shortLabel: "CU",
        description: "Customer master data and lookup workflow.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        icon: "customer"
      },
      {
        href: "/dispatch/sales-reps",
        label: "Sales Rep",
        shortLabel: "SR",
        description: "Sales rep master data from the legacy app.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "CUSTOMER_SERVICE"],
        icon: "sales"
      },
      {
        href: "/dispatch/carriers",
        label: "Carriers",
        shortLabel: "CR",
        description: "Carrier directory plus driver assignment.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER"],
        icon: "carrier"
      },
      {
        href: "/dispatch/routes",
        label: "Truck Run",
        shortLabel: "TR",
        description: "Route planning, run sheets, and publish flow.",
        allowedRoles: [
          "PLATFORM_ADMIN",
          "TENANT_ADMIN",
          "DISPATCHER",
          "CARRIER_ADMIN",
          "CARRIER_DISPATCHER",
          "DRIVER"
        ],
        icon: "route"
      },
      {
        href: "/dispatch/assignments",
        label: "Assignments",
        shortLabel: "AS",
        description: "Carrier acceptance, driver handoff, tracking number, and live route ownership.",
        allowedRoles: [
          "PLATFORM_ADMIN",
          "TENANT_ADMIN",
          "DISPATCHER",
          "CARRIER_ADMIN",
          "CARRIER_DISPATCHER",
          "DRIVER"
        ],
        icon: "route"
      },
      {
        href: "/dispatch/labels",
        label: "Print Label",
        shortLabel: "PL",
        description: "Carton and pallet label output queue.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
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
        allowedRoles: [
          "PLATFORM_ADMIN",
          "TENANT_ADMIN",
          "DISPATCHER",
          "CARRIER_ADMIN",
          "CARRIER_DISPATCHER",
          "DRIVER"
        ],
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
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        icon: "search"
      },
      {
        href: "/dispatch/freight",
        label: "Freight Tools",
        shortLabel: "FT",
        description: "Density, cube, and freight class calculations.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
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
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN"],
        icon: "customer"
      },
      {
        href: "/dispatch/issues",
        label: "Issue Inbox",
        shortLabel: "II",
        description: "Admin-only bug reports and workflow issues stored in the database.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN"],
        icon: "file",
        adminOnly: true
      },
      {
        href: "/dispatch/companies",
        label: "Company Manage",
        shortLabel: "CM",
        description: "Company records and warehouse setup.",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN"],
        icon: "briefcase"
      }
    ]
  }
] as const;
