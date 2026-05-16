export interface DispatchNavigationItem {
  href: string;
  label: string;
  shortLabel?: string;
  description?: string;
  adminOnly?: boolean;
  allowedRoles?: string[];
  children?: DispatchNavigationItem[];
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
    title: "",
    items: [
      {
        href: "/dispatch",
        label: "Main Screen",
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
        href: "/dispatch/packing-slips?view=create",
        label: "Packing Slip",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        children: [
          {
            href: "/dispatch/packing-slips?view=create",
            label: "Enter Packings Slip",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
            icon: "briefcase"
          },
          {
            href: "/dispatch/packing-slips?view=list",
            label: "Packings List",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
            icon: "briefcase"
          }
        ],
        icon: "briefcase"
      },
      {
        href: "/dispatch/carton-info?view=create",
        label: "Carton Info",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
        children: [
          {
            href: "/dispatch/carton-info?view=create",
            label: "Enter Data",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
            icon: "boxes"
          },
          {
            href: "/dispatch/carton-info?view=list",
            label: "Carton Info",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
            icon: "boxes"
          }
        ],
        icon: "boxes"
      },
      {
        href: "/dispatch/bols",
        label: "BOL",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        icon: "file"
      },
      {
        href: "/dispatch/customers?view=create",
        label: "Customer",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        children: [
          {
            href: "/dispatch/customers?view=create",
            label: "Enter Customer Info",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
            icon: "customer"
          },
          {
            href: "/dispatch/customers?view=list",
            label: "Customer Lookup",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
            icon: "customer"
          }
        ],
        icon: "customer"
      },
      {
        href: "/dispatch/sales-reps?view=create",
        label: "Sales Rep",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "CUSTOMER_SERVICE"],
        children: [
          {
            href: "/dispatch/sales-reps?view=create",
            label: "Enter Sales Rep",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "CUSTOMER_SERVICE"],
            icon: "sales"
          },
          {
            href: "/dispatch/sales-reps?view=list",
            label: "Sales Rep List",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "CUSTOMER_SERVICE"],
            icon: "sales"
          }
        ],
        icon: "sales"
      },
      {
        href: "/dispatch/carriers?view=create",
        label: "Carriers",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER"],
        children: [
          {
            href: "/dispatch/carriers?view=create",
            label: "Enter Carriers",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER"],
            icon: "carrier"
          },
          {
            href: "/dispatch/carriers?view=list",
            label: "Carriers List",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER"],
            icon: "carrier"
          }
        ],
        icon: "carrier"
      },
      {
        href: "/dispatch/routes?view=create",
        label: "Truck Run",
        allowedRoles: [
          "PLATFORM_ADMIN",
          "TENANT_ADMIN",
          "DISPATCHER",
          "CARRIER_ADMIN",
          "CARRIER_DISPATCHER",
          "DRIVER"
        ],
        children: [
          {
            href: "/dispatch/routes?view=create",
            label: "Add truck run",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER"],
            icon: "route"
          },
          {
            href: "/dispatch/routes?view=list",
            label: "View list added",
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
            href: "/dispatch/routes/delivered-history",
            label: "Delivered orders",
            allowedRoles: [
              "PLATFORM_ADMIN",
              "TENANT_ADMIN",
              "DISPATCHER",
              "CARRIER_ADMIN",
              "CARRIER_DISPATCHER",
              "DRIVER"
            ],
            icon: "route"
          }
        ],
        icon: "route"
      },
      {
        href: "/dispatch/labels?view=simple",
        label: "Print Label",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
        children: [
          {
            href: "/dispatch/labels?view=simple",
            label: "Simple Label",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
            icon: "printer"
          },
          {
            href: "/dispatch/labels?view=item",
            label: "Simple with Item info",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
            icon: "printer"
          },
          {
            href: "/dispatch/labels?view=cases",
            label: "Full cases and mixed cases",
            allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
            icon: "printer"
          }
        ],
        icon: "printer"
      }
    ]
  },
  {
    title: "",
    items: [
      {
        href: "/dispatch/deliveries",
        label: "Delivered Orders",
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
    title: "",
    items: [
      {
        href: "/dispatch/search",
        label: "Search",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE", "CUSTOMER_SERVICE"],
        icon: "search"
      },
      {
        href: "/dispatch/freight",
        label: "Freight Tools",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", "WAREHOUSE"],
        icon: "calculator"
      }
    ]
  },
  {
    title: "",
    items: [
      {
        href: "/dispatch/users",
        label: "User Manage",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN"],
        icon: "customer"
      },
      {
        href: "/dispatch/issues",
        label: "Issue Inbox",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN"],
        icon: "file",
        adminOnly: true
      },
      {
        href: "/dispatch/companies",
        label: "Company Manage",
        allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN"],
        icon: "briefcase"
      }
    ]
  }
] as const;
