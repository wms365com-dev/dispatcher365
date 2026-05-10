import { BolPreviewActions } from "@/components/bol-preview-actions";
import { LegacyBolDocument } from "@/components/legacy-bol-document";
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

function formatAddress(parts: Array<string | null | undefined>) {
  const values = parts.map((part) => part?.trim()).filter(Boolean);
  return values.length ? values.join(", ") : "-";
}

function formatCityStateZip(
  city?: string | null,
  state?: string | null,
  postalCode?: string | null
) {
  const left = [city?.trim(), state?.trim()].filter(Boolean).join(", ");
  const right = [postalCode?.trim()].filter(Boolean).join(" ");
  return [left, right].filter(Boolean).join(" ").trim() || "-";
}

function formatSlashDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);

  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  return [month, day, year].filter(Boolean).join(" / ");
}

function formatBolHeaderDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  }).formatToParts(value);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  return [day, month, year].filter(Boolean).join(" / ");
}

function formatLegacyNumber(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.00$/, "");
}

function formatLegacyMoney(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "0.00";
  }

  return value.toFixed(2);
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
  const previewThirdParty =
    previewCustomer?.locations.find((location) => location.isDefault) ?? previewCustomer?.locations[0];
  const previewIsLatestGenerated = Boolean(params?.generated && previewBill);
  const shipFromAddress = formatAddress([
    context.tenant.warehouseAddress1,
    context.tenant.warehouseAddress2
  ]);
  const shipFromCityStateZip = formatCityStateZip(
    context.tenant.warehouseCity,
    context.tenant.warehouseState,
    context.tenant.warehousePostalCode
  );
  const shipToAddress = previewCustomer
    ? formatAddress([previewCustomer.billingAddress1, previewCustomer.billingAddress2])
    : "-";
  const shipToCityStateZip = formatCityStateZip(
    previewCustomer?.city,
    previewCustomer?.state,
    previewCustomer?.postalCode
  );
  const thirdPartyName = previewCustomer?.shipName ?? previewThirdParty?.name ?? "-";
  const thirdPartyAddress =
    previewCustomer?.shipAddress1 || previewCustomer?.shipAddress2
      ? formatAddress([previewCustomer.shipAddress1, previewCustomer.shipAddress2])
      : previewThirdParty
        ? formatAddress([previewThirdParty.address1, previewThirdParty.address2])
        : "-";
  const thirdPartyCityStateZip =
    previewCustomer?.shipCity || previewCustomer?.shipState || previewCustomer?.shipPostalCode
      ? formatCityStateZip(
          previewCustomer?.shipCity,
          previewCustomer?.shipState,
          previewCustomer?.shipPostalCode
        )
      : formatCityStateZip(
          previewThirdParty?.city,
          previewThirdParty?.state,
          previewThirdParty?.postalCode
        );
  const freightTerms = (previewBill?.freightTerms ?? previewCustomer?.freightTerms ?? "prepaid").toUpperCase();
  const isCollect = freightTerms.includes("COLLECT");
  const isThirdParty = freightTerms.includes("THIRD");
  const isPrepaid = !isCollect && !isThirdParty;
  const codAmount = previewShipment?.codAmount ?? 0;
  const hasVicsPrefix = Boolean(context.tenant.gs1CompanyPrefix);
  const currentDateLabel = formatBolHeaderDate(new Date());

  return (
    <>
      <PageHeader
        eyebrow="BOL"
        title="Bill of Lading"
        description="This follows the live BOL flow: select a batch from the packing queue, generate the record, then hand it forward to truck run planning. When a GS1 company prefix is configured for the tenant, the BOL number follows the VICS-style numeric format."
      />

      {params?.generated ? (
        <SectionCard
          className="print-hidden"
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
          className="print-hidden"
          title="BOL Notice"
          description="The requested batch could not be matched to a tenant-owned shipment."
        >
          <p className="helper-text">
            We could not find batch <strong>{params.batchId ?? "-"}</strong>. Use a batch from the Ready for BOL queue,
            or create the shipment first.
          </p>
        </SectionCard>
      ) : null}

      {!hasVicsPrefix ? (
        <SectionCard
          className="print-hidden"
          title="VICS Setup Notice"
          description="The layout follows the legacy VICS-style form, but full numeric VICS numbering needs a tenant GS1 company prefix."
        >
          <p className="helper-text">
            Add a GS1 company prefix in <strong>Company Manage</strong> to generate a VICS-style numeric BOL number.
            Until then, the system falls back to the legacy custom number format.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        className="bol-preview-card"
        title={previewIsLatestGenerated ? "Generated BOL Preview" : "BOL Preview"}
        description={
          previewBill
            ? "The generated bill now renders through the legacy print structure so dispatch can review the same document before routing."
            : "Generate a BOL from the queue and the document preview will appear here."
        }
      >
        {previewBill && previewShipment && previewCustomer ? (
          <article className="legacy-bol-preview">
            <LegacyBolDocument
              approvedBy={previewShipment.approvedBy ?? ""}
              authorization={previewShipment.authorization ?? ""}
              batchId={previewShipment.batchId}
              bolNumber={previewBill.bolNumber}
              carrierName={previewBill.carrierName ?? previewCarrier?.name ?? ""}
              cartons={formatLegacyNumber(previewShipment.cartons || previewShipment.units || 0)}
              checkOrCash={previewShipment.checkOrCash ?? ""}
              codInlineAmount={codAmount > 0 ? `$${formatLegacyMoney(codAmount)}` : "-"}
              codLargeAmount={formatLegacyMoney(codAmount)}
              commodity="HOUSEWARE"
              currentDateLabel={currentDateLabel}
              customerCode={previewCustomer.customerCode}
              customerComments={previewCustomer.comments ?? previewShipment.comments ?? ""}
              customerPo={previewShipment.customerPo ?? "-"}
              deliveryDate={formatSlashDate(previewShipment.deliveryDate)}
              department={previewShipment.department ?? ""}
              freightCollect={isCollect}
              freightPrepaid={isPrepaid}
              freightThirdParty={isThirdParty}
              nmfcCode="049390-06"
              pallets={formatLegacyNumber(previewShipment.pallets)}
              receivingHours={previewShipment.deliveryWindow === " TO " ? "" : previewShipment.deliveryWindow ?? ""}
              salesOrder={previewShipment.salesOrder ?? ""}
              scac={previewCarrier?.scac ?? previewShipment.scac ?? ""}
              sealNumber={previewBill.sealNumber ?? ""}
              shipFromAddress={shipFromAddress}
              shipFromCityStateZip={shipFromCityStateZip}
              shipFromPhone={context.tenant.warehousePhone ?? ""}
              shipToAddress={shipToAddress}
              shipToCityStateZip={shipToCityStateZip}
              shipToName={previewCustomer.name}
              shipToPhone={previewCustomer.phone ?? ""}
              tenantName={context.tenant.name}
              thirdPartyAddress={thirdPartyAddress}
              thirdPartyCityStateZip={thirdPartyCityStateZip}
              thirdPartyName={thirdPartyName}
              trailerNumber={previewBill.trailerNumber ?? ""}
              weight={formatLegacyNumber(previewShipment.weightLb)}
            />

            <BolPreviewActions />
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
          className="print-hidden"
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
          className="print-hidden"
          title="Generate BOL"
          description="The old workbook staged BOL data across several sheets. The app now creates a real BOL record, preserves the print template, and uses the tenant GS1 prefix when VICS numbering is configured."
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
        className="print-hidden"
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
