import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { generateBillOfLadingAction } from "@/lib/server/dispatch-actions";
import { getBolsData } from "@/lib/server/dispatch-service";

interface BolsPageProps {
  searchParams?: Promise<{
    error?: string;
    batchId?: string;
    generated?: string;
  }>;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function BolsPage({ searchParams }: BolsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const { readyShipments, bills } = await getBolsData();

  const readyRows = readyShipments.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    salesOrder: shipment.salesOrder ?? "-",
    carrier: shipment.carrier?.carrierCode ?? "Unassigned",
    freightClass: shipment.freightClass ?? "-",
    status: <StatusPill status={shipment.status} />
  }));

  const billRows = bills.map((bill) => ({
    bolNumber: bill.bolNumber,
    batchId: bill.shipment.batchId,
    customer: `${bill.shipment.customer.customerCode} / ${bill.shipment.customer.name}`,
    template: bill.templateVariant,
    carrier: bill.carrierName ?? bill.shipment.carrier?.name ?? "-",
    terms: bill.freightTerms ?? "-",
    createdAt: formatDate(bill.createdAt)
  }));

  return (
    <>
      <PageHeader
        eyebrow="BOL input + form generation"
        title="Bill of Lading Workbench"
        description="This module now generates persistent BOL records and advances the shipment to the next stage of the workflow."
      />

      {params?.generated ? (
        <SectionCard
          title="BOL Generated"
          description="The batch moved forward in the workflow and is now available for route planning."
        >
          <p className="helper-text">
            Batch <strong>{params.batchId ?? "-"}</strong> was assigned BOL <strong>{params.generated}</strong>.
          </p>
        </SectionCard>
      ) : null}

      {params?.error === "shipment-not-found" ? (
        <SectionCard
          title="BOL Notice"
          description="The requested batch could not be matched to a tenant-owned shipment."
        >
          <p className="helper-text">
            We could not find batch <strong>{params.batchId ?? "-"}</strong>. Use a batch from the Ready for BOL queue,
            or create the shipment first.
          </p>
        </SectionCard>
      ) : null}

      <div className="split-grid">
        <SectionCard
          title="Ready for BOL"
          description="Only shipments that have completed intake but do not yet have a BOL should appear in this queue."
        >
          <SimpleTable
            columns={[
              { key: "batchId", label: "Batch" },
              { key: "customer", label: "Customer" },
              { key: "salesOrder", label: "Sales Order" },
              { key: "carrier", label: "Carrier" },
              { key: "freightClass", label: "Class" },
              { key: "status", label: "Status" }
            ]}
            rows={readyRows}
            emptyMessage="No batches are waiting for BOL creation right now."
          />
        </SectionCard>

        <SectionCard
          title="Generate BOL"
          description="The old workbook staged BOL data across several sheets. The app now creates a real BOL record and keeps the template as metadata."
        >
          <form action={generateBillOfLadingAction} className="field-grid">
            <label className="field">
              <span>Batch ID</span>
              <input name="batchId" list="ready-batches" placeholder="1002512" required />
            </label>
            <label className="field">
              <span>Template</span>
              <select name="template" defaultValue="STANDARD">
                <option value="STANDARD">Standard</option>
                <option value="RETURN">Return</option>
                <option value="CDN">Canada</option>
                <option value="LA">Los Angeles</option>
              </select>
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Generate BOL
              </button>
            </div>
            <datalist id="ready-batches">
              {readyShipments.map((shipment) => (
                <option key={shipment.id} value={shipment.batchId}>
                  {shipment.customer.customerCode}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="Generated BOLs"
        description="This is now an auditable table instead of a set of duplicate print worksheets."
      >
        <SimpleTable
          columns={[
            { key: "bolNumber", label: "BOL Number" },
            { key: "batchId", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "template", label: "Template" },
            { key: "carrier", label: "Carrier" },
            { key: "terms", label: "Freight Terms" },
            { key: "createdAt", label: "Created" }
          ]}
          rows={billRows}
          emptyMessage="No BOLs have been generated yet."
        />
      </SectionCard>
    </>
  );
}
