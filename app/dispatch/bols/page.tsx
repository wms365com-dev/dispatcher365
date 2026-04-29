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

function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function formatDateLong(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(value);
}

function formatAddress(parts: Array<string | null | undefined>) {
  const values = parts.map((part) => part?.trim()).filter(Boolean);
  return values.length ? values.join(", ") : "-";
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatMeasure(value?: number | null, suffix?: string) {
  if (typeof value !== "number") {
    return "-";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(value);

  return suffix ? `${formatted} ${suffix}` : formatted;
}

function formatTemplateLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function BolsPage({ searchParams }: BolsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const { context, readyShipments, bills } = await getBolsData();

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

  const previewBill =
    (params?.generated
      ? bills.find((bill) => bill.bolNumber === params.generated) ??
        bills.find((bill) => bill.shipment.batchId === params.batchId)
      : undefined) ?? bills[0];

  const previewShipment = previewBill?.shipment;
  const previewCustomer = previewShipment?.customer;
  const previewCarrier = previewShipment?.carrier;
  const previewIsLatestGenerated = Boolean(params?.generated && previewBill);
  const shipToAddress = previewCustomer
    ? formatAddress([
        previewCustomer.billingAddress1,
        previewCustomer.billingAddress2,
        previewCustomer.city,
        previewCustomer.state,
        previewCustomer.postalCode,
        previewCustomer.country
      ])
    : "-";
  const shipFromAddress = formatAddress([context.tenant.name, context.tenant.slug.toUpperCase(), "Dispatch warehouse"]);
  const bolLineDescription = previewCustomer
    ? `${previewCustomer.customerCode} / ${previewCustomer.name}`
    : "Tenant freight shipment";

  return (
    <>
      <PageHeader
        eyebrow="BOL"
        title="Bill of Lading"
        description="This follows the live BOL flow: select a batch from the packing queue, generate the record, then hand it forward to truck run planning."
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

      <SectionCard
        title={previewIsLatestGenerated ? "Generated BOL Preview" : "BOL Preview"}
        description={
          previewBill
            ? "The generated bill now renders as an actual document preview so dispatch can review it before routing."
            : "Generate a BOL from the queue and the document preview will appear here."
        }
      >
        {previewBill && previewShipment && previewCustomer ? (
          <article className="bol-preview">
            <div className="bol-preview__paper">
              <header className="bol-preview__header">
                <div>
                  <p className="kicker">Bill of Lading</p>
                  <h4>{previewBill.bolNumber}</h4>
                  <p className="helper-text">
                    Batch {previewShipment.batchId} for {previewCustomer.customerCode}
                  </p>
                </div>

                <dl className="bol-preview__meta">
                  <div>
                    <dt>Template</dt>
                    <dd>{formatTemplateLabel(previewBill.templateVariant)}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDateLong(previewBill.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Freight Terms</dt>
                    <dd>{previewBill.freightTerms ?? previewCustomer.freightTerms ?? "Prepaid"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{previewShipment.status.replaceAll("_", " ")}</dd>
                  </div>
                </dl>
              </header>

              <div className="bol-preview__grid">
                <section className="bol-preview__panel">
                  <span className="bol-preview__label">Ship From</span>
                  <strong>{context.tenant.name}</strong>
                  <p>{shipFromAddress}</p>
                  <p>Tenant dispatch profile: {context.tenant.slug}</p>
                </section>

                <section className="bol-preview__panel">
                  <span className="bol-preview__label">Ship To</span>
                  <strong>{previewCustomer.name}</strong>
                  <p>{shipToAddress}</p>
                  <p>{previewCustomer.phone ?? "Phone pending"}</p>
                </section>

                <section className="bol-preview__panel">
                  <span className="bol-preview__label">Carrier Details</span>
                  <strong>{previewBill.carrierName ?? previewCarrier?.name ?? "Unassigned carrier"}</strong>
                  <p>SCAC: {previewCarrier?.scac ?? previewShipment.scac ?? "Pending"}</p>
                  <p>Contact: {previewCarrier?.phone ?? previewCarrier?.email ?? "Dispatch follow-up required"}</p>
                </section>

                <section className="bol-preview__panel">
                  <span className="bol-preview__label">Order Details</span>
                  <p>Customer PO: {previewShipment.customerPo ?? "-"}</p>
                  <p>Sales Order: {previewShipment.salesOrder ?? "-"}</p>
                  <p>Delivery Date: {formatDate(previewShipment.deliveryDate)}</p>
                  <p>Delivery Window: {previewShipment.deliveryWindow ?? "-"}</p>
                </section>
              </div>

              <div className="bol-preview__stats">
                <div className="bol-preview__stat">
                  <span>Units</span>
                  <strong>{formatMeasure(previewShipment.units)}</strong>
                </div>
                <div className="bol-preview__stat">
                  <span>Cartons</span>
                  <strong>{formatMeasure(previewShipment.cartons)}</strong>
                </div>
                <div className="bol-preview__stat">
                  <span>Pallets</span>
                  <strong>{formatMeasure(previewShipment.pallets)}</strong>
                </div>
                <div className="bol-preview__stat">
                  <span>Weight</span>
                  <strong>{formatMeasure(previewShipment.weightLb, "lb")}</strong>
                </div>
                <div className="bol-preview__stat">
                  <span>Cube</span>
                  <strong>{formatMeasure(previewShipment.cubeCuFt, "cu ft")}</strong>
                </div>
                <div className="bol-preview__stat">
                  <span>Class</span>
                  <strong>{previewShipment.freightClass ?? "-"}</strong>
                </div>
              </div>

              <div className="bol-preview__table-wrap">
                <table className="table bol-preview__table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Customer PO</th>
                      <th>Sales Order</th>
                      <th>Cartons</th>
                      <th>Pallets</th>
                      <th>Weight</th>
                      <th>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{bolLineDescription}</td>
                      <td>{previewShipment.customerPo ?? "-"}</td>
                      <td>{previewShipment.salesOrder ?? "-"}</td>
                      <td>{formatMeasure(previewShipment.cartons)}</td>
                      <td>{formatMeasure(previewShipment.pallets)}</td>
                      <td>{formatMeasure(previewShipment.weightLb, "lb")}</td>
                      <td>{previewShipment.freightClass ?? "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <footer className="bol-preview__footer">
                <div className="bol-preview__footer-block">
                  <span className="bol-preview__label">Special Instructions</span>
                  <p>{previewShipment.comments ?? "No additional handling notes were recorded for this load."}</p>
                </div>

                <div className="bol-preview__footer-block">
                  <span className="bol-preview__label">Release Details</span>
                  <p>Authorization: {previewShipment.authorization ?? "-"}</p>
                  <p>Approved By: {previewShipment.approvedBy ?? "-"}</p>
                  <p>COD Amount: {formatCurrency(previewShipment.codAmount)}</p>
                </div>

                <div className="bol-preview__footer-block">
                  <span className="bol-preview__label">Trailer & Seal</span>
                  <p>Trailer Number: {previewBill.trailerNumber ?? "-"}</p>
                  <p>Seal Number: {previewBill.sealNumber ?? "-"}</p>
                  <p>Printed At: {formatDateLong(previewBill.printedAt ?? previewBill.createdAt)}</p>
                </div>
              </footer>
            </div>
          </article>
        ) : (
          <p className="helper-text">
            Once a batch is generated into a BOL, the full document preview will appear here for review before truck
            run planning.
          </p>
        )}
      </SectionCard>

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
              <select name="batchId" defaultValue="" required>
                <option value="" disabled>
                  Choose a batch waiting for BOL
                </option>
                {readyShipments.map((shipment) => (
                  <option key={shipment.id} value={shipment.batchId}>
                    {shipment.batchId} - {shipment.customer.customerCode} / {shipment.customer.name}
                  </option>
                ))}
              </select>
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
              <button className="button" type="submit" disabled={readyShipments.length === 0}>
                Generate BOL
              </button>
            </div>
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
