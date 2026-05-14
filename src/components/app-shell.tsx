"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { dispatchNavigationSections } from "@/lib/navigation";

interface AppShellProps {
  children: ReactNode;
  tenantName: string;
  tenantSlug: string;
  userEmail: string;
  roleKey: string;
  roleLabel: string;
  topbarActions?: ReactNode;
}

function DispatchIcon({
  icon,
  className
}: {
  icon: (typeof dispatchNavigationSections)[number]["items"][number]["icon"];
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8
  };

  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path {...common} d="M3.5 10.5 12 4l8.5 6.5" />
          <path {...common} d="M6.5 9.5V20h11V9.5" />
        </svg>
      );
    case "briefcase":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path {...common} d="M8 7V5.5h8V7" />
          <rect {...common} x="3.5" y="7" width="17" height="12" rx="1.5" />
          <path {...common} d="M3.5 12h17" />
        </svg>
      );
    case "boxes":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <rect {...common} x="4" y="4" width="7" height="7" />
          <rect {...common} x="13" y="4" width="7" height="7" />
          <rect {...common} x="8.5" y="13" width="7" height="7" />
        </svg>
      );
    case "file":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path {...common} d="M7 3.5h7l4 4V20.5H7z" />
          <path {...common} d="M14 3.5v4h4" />
          <path {...common} d="M9 12h6M9 16h6" />
        </svg>
      );
    case "customer":
    case "sales":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <circle {...common} cx="12" cy="8" r="3.5" />
          <path {...common} d="M5.5 19c1.6-3.3 4-5 6.5-5s4.9 1.7 6.5 5" />
        </svg>
      );
    case "carrier":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path {...common} d="M3.5 8h11v8h-11z" />
          <path {...common} d="M14.5 11h3l2 2v3h-5z" />
          <circle {...common} cx="7.5" cy="17.5" r="1.5" />
          <circle {...common} cx="17.5" cy="17.5" r="1.5" />
        </svg>
      );
    case "route":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <circle {...common} cx="7" cy="6.5" r="2" />
          <circle {...common} cx="17" cy="17.5" r="2" />
          <path {...common} d="M8.5 8 13 12.5M9 17h4.5l2-2" />
        </svg>
      );
    case "printer":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path {...common} d="M7 8V4.5h10V8" />
          <rect {...common} x="5" y="10" width="14" height="6" rx="1.5" />
          <path {...common} d="M7 14.5h10V20H7z" />
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path {...common} d="M4.5 12.5 9 17l10.5-10.5" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <circle {...common} cx="10.5" cy="10.5" r="5.5" />
          <path {...common} d="m15 15 4.5 4.5" />
        </svg>
      );
    case "calculator":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <rect {...common} x="6" y="3.5" width="12" height="17" rx="1.5" />
          <path {...common} d="M8.5 8h7M9 12h1M12 12h1M15 12h1M9 15.5h1M12 15.5h1M15 15.5h1" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppShell({
  children,
  tenantName,
  tenantSlug,
  userEmail,
  roleKey,
  roleLabel,
  topbarActions
}: AppShellProps) {
  const pathname = usePathname();
  const isAdmin = roleKey === "PLATFORM_ADMIN" || roleKey === "TENANT_ADMIN";
  const utilityActions = (
    <>
      <Link className="button button--ghost" href={`/dispatch/report-issue?pagePath=${encodeURIComponent(pathname)}` as Route}>
        Report issue
      </Link>
      {isAdmin ? (
        <Link className="button button--ghost" href={"/dispatch/issues" as Route}>
          Issues inbox
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="dispatch-shell">
      <aside className="dispatch-rail">
        <div className="dispatch-brand">
          <div className="dispatch-brand__eyebrow">WMS 365</div>
          <div className="dispatch-brand__title">{tenantName}</div>
        </div>

        <nav className="dispatch-nav" aria-label="Dispatch modules">
          {dispatchNavigationSections.map((section) => (
            <div className="dispatch-nav__section" key={section.title}>
              <p className="dispatch-nav__section-title">{section.title}</p>
              <div className="dispatch-nav__section-items">
                {section.items
                  .filter((item) => (!item.adminOnly || isAdmin) && (!item.allowedRoles || item.allowedRoles.includes(roleKey)))
                  .map((item) => {
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      title={item.description}
                      className={`dispatch-nav__item${active ? " dispatch-nav__item--active" : ""}`}
                    >
                      <span className="dispatch-nav__badge">
                        <DispatchIcon icon={item.icon} className="dispatch-nav__svg" />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <header className="dispatch-topbar">
        <div />
        <div className="dispatch-topbar__right">
          <div className="dispatch-topbar__meta">
            <span className="dispatch-user__name">{userEmail}</span>
            <span className="dispatch-user__detail">
              {roleLabel.replaceAll("_", " ")} | {tenantSlug}
            </span>
          </div>
          <div className="dispatch-topbar__actions">{utilityActions}</div>
          {topbarActions ? <div className="dispatch-topbar__actions">{topbarActions}</div> : null}
        </div>
      </header>

      <div className="dispatch-main">
        <main className="dispatch-content">{children}</main>
      </div>
    </div>
  );
}
