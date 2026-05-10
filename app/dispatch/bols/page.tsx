import { BolPreviewActions } from "@/components/bol-preview-actions";
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

function formatCityStateZip(
  city?: string | null,
  state?: string | null,
  postalCode?: string | null,
  country?: string | null
) {
  const left = [city?.trim(), state?.trim()].filter(Boolean).join(", ");
  const right = [postalCode?.trim(), country?.trim()].filter(Boolean).join(" ");
  return [left, right].filter(Boolean).join(" ").trim() || "-";
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
  const previewThirdParty = previewCustomer?.locations.find((location) => location.isDefault) ?? previewCustomer?.locations[0];
  const previewIsLatestGenerated = Boolean(params?.generated && previewBill);
  const shipToAddress = previewCustomer
    ? formatAddress([
        previewCustomer.billingAddress1,
        previewCustomer.billingAddress2
      ])
    : "-";
  const shipFromAddress = formatAddress([
    context.tenant.warehouseAddress1,
    context.tenant.warehouseAddress2
  ]);
  const shipFromCityStateZip = formatCityStateZip(
    context.tenant.warehouseCity,
    context.tenant.warehouseState,
    context.tenant.warehousePostalCode,
    context.tenant.warehouseCountry
  );
  const shipToCityStateZip = formatCityStateZip(
    previewCustomer?.city,
    previewCustomer?.state,
    previewCustomer?.postalCode,
    previewCustomer?.country
  );
  const thirdPartyAddress = previewThirdParty
    ? formatAddress([previewThirdParty.address1, previewThirdParty.address2])
    : "-";
  const thirdPartyCityStateZip = formatCityStateZip(
    previewThirdParty?.city,
    previewThirdParty?.state,
    previewThirdParty?.postalCode,
    previewThirdParty?.country
  );
  const bolLineDescription = previewCustomer ? `${previewCustomer.customerCode} / ${previewCustomer.name}` : "Tenant freight shipment";
  const freightTerms = (previewBill?.freightTerms ?? previewCustomer?.freightTerms ?? "Prepaid").toUpperCase();
  const isCollect = freightTerms.includes("COLLECT");
  const isPrepaid = !isCollect;
  const codAmount = previewShipment?.codAmount ?? 0;
  const hasCod = codAmount > 0;
  const orderReference = previewShipment?.customerPo ?? previewShipment?.salesOrder ?? previewShipment?.batchId ?? "-";
  const orderCommodity = previewShipment?.department ?? "GENERAL FREIGHT";
  const hasVicsPrefix = Boolean(context.tenant.gs1CompanyPrefix);

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
            ? "The generated bill now renders as an actual document preview so dispatch can review it before routing."
            : "Generate a BOL from the queue and the document preview will appear here."
        }
      >
        {previewBill && previewShipment && previewCustomer ? (
          <article className="legacy-bol-preview">
            <div className="legacy-bol-sheet">
              <div className="legacy-bol-sheet__heading">
                <span>Date: {formatBolHeaderDate(previewShipment.shipDate ?? previewBill.createdAt)}</span>
                <strong>BILL OF LADING</strong>
              </div>

              <div className="legacy-bol-sheet__hero">
                <table className="legacy-bol-table">
                  <tbody>
                    <tr>
                      <th className="legacy-bol-table__section" colSpan={2}>
                        SHIP FROM
                      </th>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Name:</td>
                      <td>{context.tenant.name}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Address:</td>
                      <td>{shipFromAddress}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">City/State/Zip:</td>
                      <td>{shipFromCityStateZip}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">SID#:</td>
                      <td>{previewShipment.batchId}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">TEL / FOB:</td>
                      <td>
                        {context.tenant.warehousePhone ?? "-"} &nbsp; FOB: {context.tenant.warehouseFob ?? "□"}
                      </td>
                    </tr>

                    <tr>
                      <th className="legacy-bol-table__section" colSpan={2}>
                        SHIP TO
                      </th>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Name:</td>
                      <td>{previewCustomer.name}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Address:</td>
                      <td>{shipToAddress}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">City/State/Zip:</td>
                      <td>{shipToCityStateZip}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">SID#:</td>
                      <td>{previewShipment.batchId}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">TEL:</td>
                      <td>{previewCustomer.phone ?? "-"}</td>
                    </tr>

                    <tr>
                      <th className="legacy-bol-table__section" colSpan={2}>
                        THIRD PARTY FREIGHT CHARGES BILL TO
                      </th>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Name:</td>
                      <td>{previewThirdParty?.name ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Address:</td>
                      <td>{thirdPartyAddress}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">City/State/Zip:</td>
                      <td>{thirdPartyCityStateZip}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="legacy-bol-table">
                  <tbody>
                    <tr>
                      <td className="legacy-bol-table__label">Bill of Lading Number:</td>
                      <td>{previewBill.bolNumber}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">AUTHORIZATION NUMBER</td>
                      <td>{previewShipment.authorization ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">CARRIER NAME:</td>
                      <td>{previewBill.carrierName ?? previewCarrier?.name ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">SCAC:</td>
                      <td>{previewCarrier?.scac ?? previewShipment.scac ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Trailer Number:</td>
                      <td>{previewBill.trailerNumber ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Seal Number(s):</td>
                      <td>{previewBill.sealNumber ?? "-"}</td>
                    </tr>
                    <tr>
                      <td className="legacy-bol-table__label">Customer Code</td>
                      <td>{previewCustomer.customerCode}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <table className="legacy-bol-table legacy-bol-table--terms">
                <tbody>
                  <tr>
                    <td className="legacy-bol-table__label">DELIVERY DATE:</td>
                    <td>{formatDate(previewShipment.deliveryDate)}</td>
                    <td className="legacy-bol-table__label">SPECIAL INSTRUCTIONS</td>
                    <td rowSpan={3}>{previewShipment.comments ?? "-"}</td>
                  </tr>
                  <tr>
                    <td className="legacy-bol-table__label">APPROVED BY:</td>
                    <td>{previewShipment.approvedBy ?? "-"}</td>
                    <td className="legacy-bol-table__label">Freight Charge Terms:</td>
                  </tr>
                  <tr>
                    <td className="legacy-bol-table__label">RECEIVING HOURS:</td>
                    <td>{previewShipment.deliveryWindow ?? "-"}</td>
                    <td className="legacy-bol-table__terms">
                      <div className="legacy-bol-terms-text">
                        Freight charges are prepaid unless marked otherwise
                      </div>
                      <div className="legacy-bol-checkbox-row">
                        <span>Prepaid</span>
                        <span className="legacy-bol-checkbox">{isPrepaid ? "X" : ""}</span>
                        <span>Collect</span>
                        <span className="legacy-bol-checkbox">{isCollect ? "X" : ""}</span>
                        <span>3rd Party</span>
                        <span className="legacy-bol-checkbox"></span>
                      </div>
                      <div className="legacy-bol-master-bill">
                        <span className="legacy-bol-master-bill__note">(check box)</span>
                        <span>Master Bill of Lading with attached underlying Bills of Lading</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="legacy-bol-table legacy-bol-table--full">
                <thead>
                  <tr>
                    <th className="legacy-bol-table__section" colSpan={8}>
                      CARRIER INFORMATION
                    </th>
                  </tr>
                  <tr>
                    <th>CUSTOMER ORDER NO.</th>
                    <th># PKGS</th>
                    <th>WEIGHT</th>
                    <th>PALLETS / SLIP</th>
                    <th>HDS SALES ORDER NUMBER</th>
                    <th>DEPT #</th>
                    <th>BATCH ID</th>
                    <th>CLASS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{orderReference}</td>
                    <td>{previewShipment.cartons || previewShipment.units || 0}</td>
                    <td>{formatMeasure(previewShipment.weightLb)}</td>
                    <td>{previewShipment.pallets > 0 ? "Y" : "N"}</td>
                    <td>{previewShipment.salesOrder ?? "-"}</td>
                    <td>{previewShipment.department ?? "-"}</td>
                    <td>{previewShipment.batchId}</td>
                    <td>{previewShipment.freightClass ?? "-"}</td>
                  </tr>
                  <tr className="legacy-bol-table__total">
                    <td>GRAND TOTAL</td>
                    <td>{previewShipment.cartons || previewShipment.units || 0}</td>
                    <td>{formatMeasure(previewShipment.weightLb)}</td>
                    <td>{previewShipment.pallets}</td>
                    <td>{previewShipment.salesOrder ?? "-"}</td>
                    <td>{previewShipment.department ?? "-"}</td>
                    <td>{previewShipment.batchId}</td>
                    <td>{previewShipment.freightClass ?? "-"}</td>
                  </tr>
                </tbody>
              </table>

              <table className="legacy-bol-table legacy-bol-table--full">
                <thead>
                  <tr>
                    <th className="legacy-bol-table__section" colSpan={8}>
                      CUSTOMER ORDER INFORMATION
                    </th>
                  </tr>
                  <tr>
                    <th>HANDLING UNIT</th>
                    <th>PACKAGE</th>
                    <th>QTY</th>
                    <th>TYPE</th>
                    <th>QTY</th>
                    <th>TYPE</th>
                    <th>COMMODITY DESCRIPTION</th>
                    <th>LTL ONLY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{previewShipment.pallets > 0 ? previewShipment.pallets : previewShipment.cartons}</td>
                    <td>{previewShipment.pallets > 0 ? "PLT" : "CTN"}</td>
                    <td>{previewShipment.cartons}</td>
                    <td>CTN</td>
                    <td>{previewShipment.units}</td>
                    <td>PCS</td>
                    <td>
                      <div className="legacy-bol-commodity-note">
                        Commodities requiring special or additional care or attention in handling or stowing must be so marked
                        and packaged as to ensure safe transportation with ordinary care.
                      </div>
                      <div className="legacy-bol-commodity-value">{orderCommodity}</div>
                    </td>
                    <td>
                      <div>NMFC # {previewShipment.department ?? "049390-06"}</div>
                      <div>CLASS {previewShipment.freightClass ?? "-"}</div>
                    </td>
                  </tr>
                  <tr className="legacy-bol-table__total">
                    <td colSpan={6}>GRAND TOTAL</td>
                    <td>{bolLineDescription}</td>
                    <td>{previewShipment.freightClass ?? "-"}</td>
                  </tr>
                </tbody>
              </table>

              <div className="legacy-bol-sheet__settlement">
                <div className="legacy-bol-sheet__note">
                  Where the rate is dependent on value, shippers are required to state specifically in writing the agreed or
                  declared value of the property as follows. The agreed or declared value of the property is specifically
                  stated by the shipper to be not exceeding __________ per __________.
                </div>
                <div className="legacy-bol-sheet__cod">
                  <div>
                    COD Amount $ <strong>{formatCurrency(codAmount).replace("$", "").trim()}</strong>
                  </div>
                  <div className="legacy-bol-checkbox-row legacy-bol-checkbox-row--compact">
                    <span>Fee Terms:</span>
                    <span>Collect:</span>
                    <span className="legacy-bol-checkbox">{hasCod ? "X" : ""}</span>
                    <span>Prepaid:</span>
                    <span className="legacy-bol-checkbox"></span>
                  </div>
                  <div className="legacy-bol-checkbox-row legacy-bol-checkbox-row--compact">
                    <span>Customer check acceptable:</span>
                    <span className="legacy-bol-checkbox"></span>
                  </div>
                </div>
              </div>

              <div className="legacy-bol-sheet__liability">
                NOTE: Liability Limitation for loss or damage in this shipment may be applicable. See 49 U.S.C. - 14706(c)(1)(A)
                and (B).
              </div>

              <div className="legacy-bol-sheet__legal">
                <div className="legacy-bol-sheet__legal-copy">
                  RECEIVED, subject to individually determined rates or contracts that have been agreed upon in writing between
                  the carrier and shipper, otherwise to the rates, classifications and rules that have been established by the
                  carrier and are available to the shipper, on request, and to all applicable state and federal regulations.
                </div>
                <div className="legacy-bol-sheet__legal-copy">
                  The carrier shall not make delivery of this shipment without payment of freight and all other lawful charges.
                </div>
              </div>

              <div className="legacy-bol-signatures">
                <div className="legacy-bol-signatures__block legacy-bol-signatures__block--wide">
                  <strong>SHIPPER SIGNATURE / SHIP DATE</strong>
                  <p>
                    This is to certify that the above named materials are properly classified, packaged, marked and labeled, and
                    are in proper condition for transportation according to the applicable regulations of the DOT.
                  </p>
                </div>
                <div className="legacy-bol-signatures__block legacy-bol-signatures__block--checks">
                  <div className="legacy-bol-check-stack">
                    <strong>Trailer Loaded</strong>
                    <div className="legacy-bol-check-option">
                      <span className="legacy-bol-checkbox"></span>
                      <span>By Shipper</span>
                    </div>
                    <div className="legacy-bol-check-option">
                      <span className="legacy-bol-checkbox"></span>
                      <span>By Driver</span>
                    </div>
                  </div>
                  <div className="legacy-bol-check-stack">
                    <strong>Freight Counted</strong>
                    <div className="legacy-bol-check-option">
                      <span className="legacy-bol-checkbox"></span>
                      <span>By Shipper</span>
                    </div>
                    <div className="legacy-bol-check-option">
                      <span className="legacy-bol-checkbox"></span>
                      <span>By Driver/pallets said to contain</span>
                    </div>
                    <div className="legacy-bol-check-option">
                      <span className="legacy-bol-checkbox"></span>
                      <span>By Driver/Pieces</span>
                    </div>
                  </div>
                </div>
                <div className="legacy-bol-signatures__stack">
                  <div className="legacy-bol-signatures__block">
                    <strong>CARRIER SIGNATURE / PICKUP DATE</strong>
                    <div className="legacy-bol-signatures__driver-label">DRIVER</div>
                    <div className="legacy-bol-signatures__line">________________________________</div>
                    <div className="legacy-bol-signatures__date-line">____ / ____ / ________</div>
                  </div>
                  <div className="legacy-bol-signatures__block">
                    <strong>RECEIVER SIGNATURE / DELIVERY DATE</strong>
                    <div className="legacy-bol-signatures__driver-label">RECEIVER</div>
                    <div className="legacy-bol-signatures__line">________________________________</div>
                    <div className="legacy-bol-signatures__date-line">____ / ____ / ________</div>
                  </div>
                </div>
              </div>
            </div>

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
