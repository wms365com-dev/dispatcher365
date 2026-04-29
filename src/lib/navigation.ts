export interface DispatchNavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
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
        description: "Tenant dashboard and queue summary."
      },
      {
        href: "/dispatch/packing-slips",
        label: "Packing Slip",
        shortLabel: "PS",
        description: "Enter packing slips and review shipment intake."
      },
      {
        href: "/dispatch/carton-info",
        label: "Carton Info",
        shortLabel: "CI",
        description: "Carton master, dimensions, and label source data."
      },
      {
        href: "/dispatch/bols",
        label: "BOL",
        shortLabel: "BL",
        description: "Batch lookup, BOL generation, and print staging."
      },
      {
        href: "/dispatch/customers",
        label: "Customer",
        shortLabel: "CU",
        description: "Customer master data and lookup workflow."
      },
      {
        href: "/dispatch/sales-reps",
        label: "Sales Rep",
        shortLabel: "SR",
        description: "Sales rep master data from the legacy app."
      },
      {
        href: "/dispatch/carriers",
        label: "Carriers",
        shortLabel: "CR",
        description: "Carrier directory plus driver assignment."
      },
      {
        href: "/dispatch/routes",
        label: "Truck Run",
        shortLabel: "TR",
        description: "Route planning, run sheets, and publish flow."
      },
      {
        href: "/dispatch/labels",
        label: "Print Label",
        shortLabel: "PL",
        description: "Carton and pallet label output queue."
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
        description: "Proof of delivery, exceptions, and route completion."
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
        description: "Cross-record lookup for customers, batches, and orders."
      },
      {
        href: "/dispatch/freight",
        label: "Freight Tools",
        shortLabel: "FT",
        description: "Density, cube, and freight class calculations."
      }
    ]
  }
] as const;
