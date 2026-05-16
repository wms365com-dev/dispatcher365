import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/branding";

import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
