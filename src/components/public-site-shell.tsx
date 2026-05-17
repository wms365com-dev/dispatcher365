import Link from "next/link";
import type { ReactNode } from "react";

import {
  PLATFORM_NAME,
  SUPPORT_EMAIL
} from "@/lib/branding";

const serviceLinks = [
  { label: "LtL/Consolidation", href: "/sign-up" },
  { label: "Truckload", href: "/sign-up" },
  { label: "Drayage", href: "/sign-up" },
  { label: "Deconsolidation", href: "/sign-up" },
  { label: "Store Delivery", href: "/sign-up" },
  { label: "Dedicated Fleet", href: "/sign-up" },
  { label: "Distribution", href: "/sign-up" },
  { label: "DC Bypass", href: "/sign-up" }
];

const utilityLinks = [
  {
    prompt: "No account?",
    label: "Sign Up",
    href: "/sign-up",
    external: false
  },
  {
    prompt: "Need Help?",
    label: "Live Chat",
    href: `mailto:${SUPPORT_EMAIL}?subject=Ship365%20demo%20request`,
    external: true
  },
  {
    prompt: "Quick Track",
    label: "Click Here",
    href: "/sign-in",
    external: false
  }
];

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M14.5 8.5h2V5.2C16.5 4.1 17.3 3 19 3H22v3.3h-1.8c-.8 0-1 .3-1 1v1.2H22l-.3 3.2h-2.2V21h-4.2v-9.3H13V8.5h2.3V7.3c0-2.4 1.4-3.8 4-3.8"
        fill="currentColor"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M21.4 7.2c-.6.3-1.3.5-2 .6.7-.4 1.2-1.1 1.5-1.9-.7.4-1.5.7-2.3.9A3.5 3.5 0 0 0 12.7 10c0 .3 0 .6.1.9-2.9-.1-5.5-1.5-7.2-3.7-.3.5-.5 1.1-.5 1.7 0 1.2.6 2.2 1.5 2.8-.6 0-1.1-.2-1.6-.4 0 1.7 1.2 3.1 2.8 3.4-.3.1-.6.1-1 .1-.2 0-.5 0-.7-.1.5 1.5 1.9 2.5 3.5 2.5A7 7 0 0 1 4 18.4a9.8 9.8 0 0 0 5.3 1.5c6.4 0 9.9-5.3 9.9-9.9v-.5c.7-.5 1.2-1 1.7-1.7"
        fill="currentColor"
      />
    </svg>
  );
}

interface PublicSiteShellProps {
  children: ReactNode;
  overlay?: ReactNode;
}

export function PublicSiteShell({ children, overlay }: PublicSiteShellProps) {
  return (
    <main className="legacy-public">
      <div className="legacy-public__media" />

      <section className="legacy-public__content">
        <div className="legacy-public__panel">
          {children}

          <div className="legacy-public__utility-grid">
            {utilityLinks.map((item) => (
              <div className="legacy-public__utility" key={item.label}>
                <p>{item.prompt}</p>
                {item.external ? (
                  <a href={item.href}>{item.label}</a>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="legacy-public__services">
          {serviceLinks.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </div>

        <footer className="legacy-public__footer">
          <div className="legacy-public__socials">
            <a aria-label="Ship365 on Facebook" href={`mailto:${SUPPORT_EMAIL}`}>
              <FacebookIcon />
            </a>
            <Link aria-label="Ship365 updates" href="/pricing">
              <TwitterIcon />
            </Link>
          </div>

          <p>Copyright &copy; {PLATFORM_NAME}</p>
        </footer>
      </section>

      {overlay ? <div className="legacy-public__overlay">{overlay}</div> : null}
    </main>
  );
}
