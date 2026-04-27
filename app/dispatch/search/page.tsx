import { CustomerResolutionDemo } from "@/components/customer-resolution-demo";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { getPackingSlipsData } from "@/lib/server/dispatch-service";

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

export default async function SearchPage() {
  const { customers, shipments } = await getPackingSlipsData();

  const rows = shipments.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    customerPo: shipment.customerPo ?? "-",
    salesOrder: shipment.salesOrder ?? "-",
    routeDate: formatDate(shipment.routedDate ?? shipment.shipDate),
    status: <StatusPill status={shipment.status} />
  }));

  return (
    <>
      <PageHeader
        eyebrow="Lookup screens"
        title="Search & Lookup"
        description="This page is now reading the same persisted shipment and customer records that drive the operational modules."
      />

      <div className="split-grid">
        <SectionCard
          title="Customer Lookup"
          description="The future add-or-select popup uses the same tenant-scoped matching logic shown here."
        >
          <CustomerResolutionDemo customers={customers} />
        </SectionCard>

        <SectionCard
          title="Batch / Order Lookup"
          description="A production search service should cover batch ID, customer PO, sales order, BOL number, and route run."
        >
          <SimpleTable
            columns={[
              { key: "batchId", label: "Batch" },
              { key: "customer", label: "Customer" },
              { key: "customerPo", label: "Customer PO" },
              { key: "salesOrder", label: "Sales Order" },
              { key: "routeDate", label: "Route Date" },
              { key: "status", label: "Status" }
            ]}
            rows={rows}
            emptyMessage="No shipment records are available to search yet."
          />
        </SectionCard>
      </div>
    </>
  );
}
