"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { dispatchNavigation } from "@/lib/navigation";

interface AppShellProps {
  children: ReactNode;
  tenantName: string;
  tenantSlug: string;
  userEmail: string;
  roleLabel: string;
  topbarActions?: ReactNode;
}

export function AppShell({
  children,
  tenantName,
  tenantSlug,
  userEmail,
  roleLabel,
  topbarActions
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="dispatch-shell">
      <aside className="dispatch-rail">
        <div className="dispatch-brand">
          <div className="dispatch-brand__mark">365</div>
          <div>
            <div className="dispatch-brand__eyebrow">WMS</div>
            <div className="dispatch-brand__title">Dispatch</div>
          </div>
        </div>

        <nav className="dispatch-nav" aria-label="Dispatch modules">
          {dispatchNavigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dispatch-nav__item${active ? " dispatch-nav__item--active" : ""}`}
              >
                <span className="dispatch-nav__badge">{item.shortLabel}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="dispatch-main">
        <header className="dispatch-topbar surface">
          <div>
            <p className="kicker">Workbook Rebuilt As An App</p>
            <h1>WMS 365 Dispatch</h1>
          </div>

          <div className="dispatch-topbar__meta">
            <span className="chip chip--tenant">{tenantName}</span>
            <span className="chip">{tenantSlug}</span>
            <span className="chip">{roleLabel}</span>
            <span className="chip">{userEmail}</span>
          </div>
          {topbarActions ? <div className="dispatch-topbar__actions">{topbarActions}</div> : null}
        </header>

        <main className="dispatch-content">{children}</main>
      </div>
    </div>
  );
}
