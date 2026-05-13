import { BolPreviewActions } from "@/components/bol-preview-actions";
import { BolStagingWorkspace } from "@/components/bol-staging-workspace";
import { LegacyBolDocument } from "@/components/legacy-bol-document";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { generateBillOfLadingAction } from "@/lib/server/dispatch-actions";
import { getBolsData } from "@/lib/server/dispatch-service";

interface BolsPageProps {
  searchParams?: Promise<{
    error?: string;
    batchIds?: string | string[];
    generated?: string;
    emailStatus?: string;
  }>;
}

interface BolCustomerLocation {
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  isDefault?: boolean | null;
}

interface BolCustomer {
  customerCode: string;
  name: string;
  billingAddress1?: string | null;
  billingAddress2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  shipEmail?: string | null;
  shipName?: string | null;
  shipAddress1?: string | null;
  shipAddress2?: string | null;
  shipCity?: string | null;
  shipState?: string | null;
  shipPostalCode?: string | null;
  comments?: string | null;
  freightTerms?: string | null;
  locations: BolCustomerLocation[];
}

interface BolCarrier {
  name?: string | null;
  carrierCode?: string | null;
  scac?: string | null;
  email?: string | null;
}

interface BolShipment {
  id: string;
  batchId: string;
  customerPo?: string | null;
  salesOrder?: string | null;
  salesperson?: string | null;
  status: string;
  routedDate?: Date | null;
  shipDate?: Date | null;
  cancelDate?: Date | null;
  deliveryDate?: Date | null;
  deliveryWindow?: string | null;
  routeDeskDate?: Date | null;
  authorization?: string | null;
  approvedBy?: string | null;
  scac?: string | null;
  checkOrCash?: string | null;
  comments?: string | null;
  codAmount?: number | null;
  units: number;
  cartons: number;
  pallets: number;
  weightLb: number;
  cubeCuFt?: number | null;
  heightIn?: number | null;
  freightClass?: string | null;
  department?: string | null;
  customer: BolCustomer;
  carrier?: BolCarrier | null;
}

interface GroupedBolRecord {
  bolNumber: string;
  templateVariant: string;
  freightTerms?: string | null;
  carrierName?: string | null;
  updatedAt: Date;
  shipments: BolShipment[];
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

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSearchBatchIds(value?: string | string[]) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(raw.flatMap((entry) => entry.split(/[,\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)))];
}

function matchesSelectedBatchIds(
  shipmentBatchIds: string[],
  selectedBatchIds: string[]
) {
  if (!selectedBatchIds.length) {
    return true;
  }

  if (shipmentBatchIds.length !== selectedBatchIds.length) {
    return false;
  }

  const shipmentKey = [...shipmentBatchIds].sort().join("|");
  const selectedKey = [...selectedBatchIds].sort().join("|");
  return shipmentKey === selectedKey;
}

export default async function BolsPage({ searchParams }: BolsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const selectedBatchIds = normalizeSearchBatchIds(params?.batchIds);
  const bolData = await getBolsData();
  const context = bolData.context as {
    tenant: {
      name: string;
      gs1CompanyPrefix?: string | null;
      warehouseAddress1?: string | null;
      warehouseAddress2?: string | null;
      warehouseCity?: string | null;
      warehouseState?: string | null;
      warehousePostalCode?: string | null;
      warehousePhone?: string | null;
    };
    user: {
      email: string;
    };
  };
  const shipments = bolData.shipments as BolShipment[];
  const groupedBills = bolData.groupedBills as GroupedBolRecord[];
  const emailConfigured = bolData.emailConfigured;

  const selectedShipments = shipments
    .filter((shipment) => selectedBatchIds.includes(shipment.batchId))
    .sort((left, right) => left.batchId.localeCompare(right.batchId));

  const selectedRows = selectedShipments.map((shipment) => ({
    batchId: shipment.batchId,
    customerNumber: shipment.customer.customerCode,
    customerPo: shipment.customerPo ?? "-",
    orderNumber: shipment.salesOrder ?? "-",
    startDate: formatDate(shipment.shipDate),
    cancelDate: formatDate(shipment.cancelDate),
    salesPerson: shipment.salesperson ?? "-",
    routeDeskDate: formatDate(shipment.routeDeskDate),
    status: formatStatusLabel(shipment.status),
    shippedDate: formatDate(shipment.shipDate),
    truck: shipment.carrier?.carrierCode ?? shipment.scac ?? "-",
    units: String(shipment.units),
    cartons: String(shipment.cartons),
    pallets: String(shipment.pallets),
    weight: formatLegacyNumber(shipment.weightLb),
    height: formatLegacyNumber(shipment.heightIn),
    freightClass: shipment.freightClass ?? "-",
    cube: formatLegacyNumber(shipment.cubeCuFt),
    comments: shipment.comments ?? "-",
    canStage: shipment.status !== "DELIVERED"
  }));

  const allPackingRows = shipments.map((shipment) => ({
    batchId: shipment.batchId,
    customerNumber: shipment.customer.customerCode,
    customerPo: shipment.customerPo ?? "-",
    orderNumber: shipment.salesOrder ?? "-",
    startDate: formatDate(shipment.shipDate),
    cancelDate: formatDate(shipment.cancelDate),
    salesPerson: shipment.salesperson ?? "-",
    routeDeskDate: formatDate(shipment.routeDeskDate),
    status: formatStatusLabel(shipment.status),
    shippedDate: formatDate(shipment.shipDate),
    truck: shipment.carrier?.carrierCode ?? shipment.scac ?? "-",
    units: String(shipment.units),
    cartons: String(shipment.cartons),
    pallets: String(shipment.pallets),
    weight: formatLegacyNumber(shipment.weightLb),
    height: formatLegacyNumber(shipment.heightIn),
    freightClass: shipment.freightClass ?? "-",
    cube: formatLegacyNumber(shipment.cubeCuFt),
    comments: shipment.comments ?? "-",
    canStage: shipment.status !== "DELIVERED"
  }));

  const groupedRows = groupedBills.map((bill) => ({
    bolNumber: bill.bolNumber,
    batches: bill.shipments.map((shipment) => shipment.batchId).join(", "),
    customer: `${bill.shipments[0]?.customer.customerCode ?? "-"} / ${bill.shipments[0]?.customer.name ?? "-"}`,
    count: bill.shipments.length,
    template: bill.templateVariant,
    carrier: bill.carrierName ?? bill.shipments[0]?.carrier?.name ?? "-",
    createdAt: formatDate(bill.updatedAt)
  }));

  const previewGroup = params?.generated
    ? groupedBills.find(
        (bill) =>
          bill.bolNumber === params.generated &&
          matchesSelectedBatchIds(
            bill.shipments.map((shipment) => shipment.batchId),
            selectedBatchIds
          )
      ) ?? groupedBills.find((bill) => bill.bolNumber === params.generated)
    : undefined;
  const previewShipments = previewGroup?.shipments ?? [];
  const primaryShipment = previewShipments[0];
  const previewCustomer = primaryShipment?.customer;
  const previewCarrier = primaryShipment?.carrier;
  const previewThirdParty = previewCustomer?.locations.find((location) => location.isDefault) ?? previewCustomer?.locations[0];
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
      ? formatCityStateZip(previewCustomer.shipCity, previewCustomer.shipState, previewCustomer.shipPostalCode)
      : formatCityStateZip(previewThirdParty?.city, previewThirdParty?.state, previewThirdParty?.postalCode);
  const freightTerms = (
    previewGroup?.freightTerms ??
    previewCustomer?.freightTerms ??
    "prepaid"
  ).toUpperCase();
  const isCollect = freightTerms.includes("COLLECT");
  const isThirdParty = freightTerms.includes("THIRD");
  const isPrepaid = !isCollect && !isThirdParty;
  const totalCartons = previewShipments.reduce((sum, shipment) => sum + shipment.cartons, 0);
  const totalPallets = previewShipments.reduce((sum, shipment) => sum + shipment.pallets, 0);
  const totalWeight = previewShipments.reduce((sum, shipment) => sum + shipment.weightLb, 0);
  const totalCod = previewShipments.reduce((sum, shipment) => sum + (shipment.codAmount ?? 0), 0);
  const carrierRows = previewShipments.map((shipment) => ({
    customerPo: shipment.customerPo ?? "-",
    cartons: formatLegacyNumber(shipment.cartons || shipment.units || 0),
    weight: formatLegacyNumber(shipment.weightLb),
    salesOrder: shipment.salesOrder ?? "-",
    department: shipment.department ?? "",
    batchId: shipment.batchId,
    pallets: formatLegacyNumber(shipment.pallets)
  }));
  const hasVicsPrefix = Boolean(context.tenant.gs1CompanyPrefix);
  const defaultEmail =
    previewCustomer?.shipEmail ??
    previewCustomer?.email ??
    previewCarrier?.email ??
    context.user.email;

  return (
    <>
      <PageHeader
        eyebrow="BOL"
        title="Bill of Lading"
        description="This now follows the original AESON flow more closely: select one or more batch IDs, review the chosen packing slips, then create one grouped BOL document for that selection."
      />

      {params?.generated ? (
        <SectionCard
          className="print-hidden"
          title="BOL Generated"
          description="The selected batches were grouped under one bill of lading number, just like the legacy workflow."
        >
          <p className="helper-text">
            BOL <strong>{params.generated}</strong> now covers <strong>{selectedBatchIds.join(", ") || "-"}</strong>.
          </p>
        </SectionCard>
      ) : null}

      {params?.emailStatus === "sent" ? (
        <SectionCard
          className="print-hidden"
          title="BOL Email Sent"
          description="The grouped bill of lading was queued through the outbound email service."
        >
          <p className="helper-text">
            BOL <strong>{params.generated}</strong> was sent using the current tenant email configuration.
          </p>
        </SectionCard>
      ) : null}

      {params?.emailStatus === "failed" ? (
        <SectionCard
          className="print-hidden"
          title="BOL Email Failed"
          description="The grouped bill of lading could not be emailed."
        >
          <p className="helper-text">
            Check the Railway SMTP settings or review the outbound email log before retrying.
          </p>
        </SectionCard>
      ) : null}

      {params?.error === "shipment-not-found" ? (
        <SectionCard
          className="print-hidden"
          title="BOL Notice"
          description="One or more selected batches could not be matched to tenant-owned shipments."
        >
          <p className="helper-text">
            We could not resolve every selected batch. Re-check the selected packing slips and try again.
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

      <div className="print-hidden">
        <BolStagingWorkspace
          allRows={allPackingRows}
          hasInvalidSelection={selectedBatchIds.length > 0 && selectedRows.length === 0}
          initialBatchIds={selectedBatchIds}
          selectedRows={selectedRows}
        />
      </div>

      {selectedBatchIds.length ? (
        <SectionCard
          className="print-hidden"
          title="Generate Grouped BOL"
          description="This follows the old AESON behavior: review the chosen packing slips first, then create one grouped BOL from that staged selection."
        >
          <form action={generateBillOfLadingAction} className="field-grid">
            <input name="batchIds" type="hidden" value={selectedBatchIds.join(",")} />
            <label className="field">
              <span>Batch Selection</span>
              <input readOnly value={selectedBatchIds.join(", ")} />
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
          </form>
        </SectionCard>
      ) : null}

      <SectionCard
        className="bol-preview-card"
        title={previewGroup ? "Generated Grouped BOL Preview" : "BOL Preview"}
        description={
          previewGroup
            ? "The selected batches now render as one grouped bill of lading document."
            : "Generate a BOL from the selected packing slips and the grouped document preview will appear here."
        }
      >
        {previewGroup && primaryShipment && previewCustomer ? (
          <article className="legacy-bol-preview">
            <LegacyBolDocument
              approvedBy={primaryShipment.approvedBy ?? ""}
              authorization={primaryShipment.authorization ?? ""}
              bolNumber={previewGroup.bolNumber}
              carrierName={previewGroup.carrierName ?? previewCarrier?.name ?? ""}
              carrierRows={carrierRows}
              checkOrCash={primaryShipment.checkOrCash ?? ""}
              codInlineAmount={totalCod > 0 ? `$${formatLegacyMoney(totalCod)}` : "-"}
              codLargeAmount={formatLegacyMoney(totalCod)}
              commodity="HOUSEWARE"
              currentDateLabel={formatBolHeaderDate(new Date())}
              customerCode={previewCustomer.customerCode}
              customerComments={previewCustomer.comments ?? primaryShipment.comments ?? ""}
              deliveryDate={formatSlashDate(primaryShipment.deliveryDate)}
              freightCollect={isCollect}
              freightPrepaid={isPrepaid}
              freightThirdParty={isThirdParty}
              nmfcCode="049390-06"
              receivingHours={primaryShipment.deliveryWindow === " TO " ? "" : primaryShipment.deliveryWindow ?? ""}
              scac={previewCarrier?.scac ?? primaryShipment.scac ?? ""}
              sealNumber=""
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
              totalCartons={formatLegacyNumber(totalCartons)}
              totalPallets={formatLegacyNumber(totalPallets)}
              totalWeight={formatLegacyNumber(totalWeight)}
              trailerNumber=""
            />

            <BolPreviewActions
              batchIds={previewShipments.map((shipment) => shipment.batchId)}
              bolNumber={previewGroup.bolNumber}
              defaultEmail={defaultEmail}
              emailConfigured={emailConfigured}
            />
          </article>
        ) : (
          <p className="helper-text">
            Select one or more batch IDs, click Show Data, then generate the BOL to see the grouped legacy print preview.
          </p>
        )}
      </SectionCard>

      <SectionCard
        className="print-hidden"
        title="Generated BOLs"
        description="Grouped BOL numbers are listed once here, even when they cover multiple selected packing slips."
      >
        <SimpleTable
          columns={[
            { key: "bolNumber", label: "BOL Number" },
            { key: "batches", label: "Batch IDs" },
            { key: "customer", label: "Customer" },
            { key: "count", label: "Pick Tickets" },
            { key: "template", label: "Template" },
            { key: "carrier", label: "Carrier" },
            { key: "createdAt", label: "Created" }
          ]}
          rows={groupedRows}
          emptyMessage="No BOLs have been generated yet."
        />
      </SectionCard>
    </>
  );
}
