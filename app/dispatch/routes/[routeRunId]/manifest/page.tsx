import { notFound } from "next/navigation";

import { LegacyRouteManifestDocument } from "@/components/legacy-route-manifest-document";
import { PageHeader } from "@/components/page-header";
import { RouteManifestActions } from "@/components/route-manifest-actions";
import { SectionCard } from "@/components/section-card";
import { getRouteManifestData } from "@/lib/server/dispatch-service";

interface RouteManifestPageProps {
  params: Promise<{
    routeRunId: string;
  }>;
  searchParams?: Promise<{
    emailStatus?: string;
  }>;
}

function formatRouteDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatAddress(parts: Array<string | null | undefined>) {
  const values = parts.map((part) => part?.trim()).filter(Boolean);
  return values.length ? values.join(", ") : "-";
}

export default async function RouteManifestPage({
  params,
  searchParams
}: RouteManifestPageProps) {
  const [{ routeRunId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams
  ]);

  const data = await getRouteManifestData(routeRunId);

  if (!data) {
    notFound();
  }

  const rows = data.routeRun.stops.map((stop) => ({
    batchId: stop.shipment.batchId,
    salesOrder: stop.shipment.salesOrder ?? "-",
    customerPo: stop.shipment.customerPo ?? "-",
    customerName: stop.shipment.customer.name,
    address: formatAddress([
      stop.shipment.customer.shipAddress1 ?? stop.shipment.customer.billingAddress1,
      stop.shipment.customer.shipAddress2 ?? stop.shipment.customer.billingAddress2
    ]),
    city: stop.shipment.customer.shipCity ?? stop.shipment.customer.city ?? "-",
    state: stop.shipment.customer.shipState ?? stop.shipment.customer.state ?? "-",
    postalCode: stop.shipment.customer.shipPostalCode ?? stop.shipment.customer.postalCode ?? "-",
    phone: stop.shipment.customer.shipPhone ?? stop.shipment.customer.phone ?? "-",
    pallets: String(stop.shipment.pallets),
    cartons: String(stop.shipment.cartons)
  }));

  const defaultEmail =
    data.routeRun.carrier?.email ?? data.routeRun.driver?.email ?? data.context.user.email;

  return (
    <>
      <PageHeader
        eyebrow="Truck run manifest"
        title="Truck Run Manifest"
        description="This is the legacy-style printable truck manifest carried forward from the original system: one route summary, one stop table, plus print and email actions."
      />

      {resolvedSearchParams?.emailStatus === "sent" ? (
        <SectionCard
          className="print-hidden"
          title="Manifest Email Sent"
          description="The truck run manifest was queued through the outbound email service."
        >
          <p className="helper-text">
            Route <strong>{data.routeRun.routeName}</strong> was sent to <strong>{defaultEmail}</strong>.
          </p>
        </SectionCard>
      ) : null}

      {resolvedSearchParams?.emailStatus === "failed" ? (
        <SectionCard
          className="print-hidden"
          title="Manifest Email Failed"
          description="The truck run manifest could not be emailed."
        >
          <p className="helper-text">
            Check the Railway SMTP settings or the outbound email log, then retry Email to Carrier.
          </p>
        </SectionCard>
      ) : null}

      <div className="legacy-bol-preview legacy-manifest-preview">
        <LegacyRouteManifestDocument
          carrierName={data.routeRun.carrier?.name ?? "Unassigned Carrier"}
          fileName={data.routeRun.routeName}
          routeDate={formatRouteDate(data.routeRun.routeDate)}
          totalPallets={String(data.totalPallets)}
          totalStops={String(data.totalStops)}
          truckCount={String(data.totalTrucks)}
          rows={rows}
        />
        <RouteManifestActions
          defaultEmail={defaultEmail}
          emailConfigured={data.emailConfigured}
          routeRunId={data.routeRun.id}
        />
      </div>
    </>
  );
}
