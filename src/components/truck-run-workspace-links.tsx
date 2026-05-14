import Link from "next/link";
import type { Route } from "next";

interface TruckRunWorkspaceLinksProps {
  roleKey: string;
  activeHref?: string;
}

const internalRoles = [
  "PLATFORM_ADMIN",
  "TENANT_ADMIN",
  "DISPATCHER",
  "WAREHOUSE",
  "CUSTOMER_SERVICE"
];

const carrierRoles = ["CARRIER_ADMIN", "CARRIER_DISPATCHER"];

const links = [
  {
    href: "/dispatch/routes",
    label: "Run Planning",
    description: "Build runs, publish loads, and print manifests.",
    allowedRoles: [...internalRoles, ...carrierRoles, "DRIVER"]
  },
  {
    href: "/dispatch/routes/assign",
    label: "Assign Loads",
    description: "Assign published runs to carrier drivers.",
    allowedRoles: ["PLATFORM_ADMIN", "TENANT_ADMIN", "DISPATCHER", ...carrierRoles]
  },
  {
    href: "/dispatch/routes/jobs",
    label: "Packing Available",
    description: "Work active jobs, accept offers, and start routes.",
    allowedRoles: [...internalRoles, ...carrierRoles, "DRIVER"]
  },
  {
    href: "/dispatch/routes/history",
    label: "Jobs History",
    description: "Review route assignment history and outcomes.",
    allowedRoles: [...internalRoles, ...carrierRoles, "DRIVER"]
  },
  {
    href: "/dispatch/routes/delivered-history",
    label: "Delivered History",
    description: "Track delivered, refused, returned, and exception events.",
    allowedRoles: [...internalRoles, ...carrierRoles, "DRIVER"]
  }
] as const;

export function TruckRunWorkspaceLinks({
  roleKey,
  activeHref
}: TruckRunWorkspaceLinksProps) {
  const visibleLinks = links.filter((link) => link.allowedRoles.includes(roleKey));

  return (
    <div className="workspace-links">
      {visibleLinks.map((link) => {
        const active = activeHref === link.href;

        return (
          <Link
            key={link.href}
            href={link.href as Route}
            className={`workspace-link${active ? " workspace-link--active" : ""}`}
          >
            <strong>{link.label}</strong>
            <small>{link.description}</small>
          </Link>
        );
      })}
    </div>
  );
}
