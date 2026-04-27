import { CustomerResolutionDemo } from "@/components/customer-resolution-demo";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { createShipmentAction } from "@/lib/server/dispatch-actions";
import { getPackingSlipsData } from "@/lib/server/dispatch-service";
import { buildEmailSubject, buildRfqSubject } from "@/lib/workbook/formulas";

interface PackingSlipsPageProps {
  searchParams?: Promise<{
    customerLookup?: string;
  }>;
}

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

export default async function PackingSlipsPage({ searchParams }: PackingSlipsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const customerLookup = params?.customerLookup;
  const { customers, carriers, shipments, lookupMatches } = await getPackingSlipsData(customerLookup);

  const rows = shipments.map((shipment) => ({
    batchId: shipment.batchId,
    customer: `${shipment.customer.customerCode} / ${shipment.customer.name}`,
    salesOrder: shipment.salesOrder ?? "-",
    cartons: String(shipment.cartons),
    pallets: String(shipment.pallets),
    class: shipment.freightClass ?? "-",
    bol: shipment.bol?.bolNumber ?? "Pending",
    shipDate: formatDate(shipment.shipDate),
    status: <StatusPill status={shipment.status} />
  }));

  const sampleCustomer = customers[0];

  return (
    <>
      <PageHeader
        eyebrow="Enter packing slip"
        title="Packing Slips"
        description="Shipment intake now persists to the database and feeds the rest of the workflow instead of acting like a temporary worksheet row."
      />

      <SectionCard
        title="Shipment Work Queue"
        description="Every batch below is a tenant-scoped shipment record with customer, BOL, and route history attached to it."
      >
        <SimpleTable
          columns={[
            { key: "batchId", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "salesOrder", label: "Sales Order" },
            { key: "cartons", label: "Cartons" },
            { key: "pallets", label: "Pallets" },
            { key: "class", label: "Freight Class" },
            { key: "bol", label: "BOL" },
            { key: "shipDate", label: "Ship Date" },
            { key: "status", label: "Status" }
          ]}
          rows={rows}
          emptyMessage="No packing slips have been entered yet."
        />
      </SectionCard>

      <div className="split-grid">
        <SectionCard
          title="Create Shipment"
          description="This is the Phase 1 replacement for the old add packing screen."
        >
          <form action={createShipmentAction} className="field-grid">
            <label className="field">
              <span>Batch ID</span>
              <input name="batchId" placeholder="1055804" required />
            </label>
            <label className="field">
              <span>Customer code</span>
              <input name="customerCode" list="customer-codes" placeholder="WG" required />
            </label>
            <label className="field">
              <span>Customer PO</span>
              <input name="customerPo" placeholder="1253062" />
            </label>
            <label className="field">
              <span>Sales order</span>
              <input name="salesOrder" placeholder="1253062" />
            </label>
            <label className="field">
              <span>Salesperson</span>
              <input name="salesperson" placeholder="ZE47" />
            </label>
            <label className="field">
              <span>Carrier code</span>
              <input name="carrierCode" list="carrier-codes" placeholder="OLJ" />
            </label>
            <label className="field">
              <span>Ship date</span>
              <input name="shipDate" type="date" />
            </label>
            <label className="field">
              <span>Delivery date</span>
              <input name="deliveryDate" type="date" />
            </label>
            <label className="field field--wide">
              <span>Delivery window</span>
              <input name="deliveryWindow" placeholder="8:00 AM to 12:00 PM" />
            </label>
            <label className="field">
              <span>Cartons</span>
              <input name="cartons" type="number" min="0" defaultValue="0" />
            </label>
            <label className="field">
              <span>Pallets</span>
              <input name="pallets" type="number" min="0" defaultValue="0" />
            </label>
            <label className="field">
              <span>Weight (lb)</span>
              <input name="weightLb" type="number" min="0" step="0.01" placeholder="Auto = cartons x 20" />
            </label>
            <label className="field">
              <span>Cube (cu ft)</span>
              <input name="cubeCuFt" type="number" min="0" step="0.01" />
            </label>
            <label className="field">
              <span>Freight class</span>
              <input name="freightClass" placeholder="Auto if cube is provided" />
            </label>
            <label className="field field--wide">
              <span>Comments</span>
              <textarea name="comments" rows={4} placeholder="Receiving instructions, appointment notes, COD details..." />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Save shipment
              </button>
            </div>

            <datalist id="customer-codes">
              {customers.map((customer) => (
                <option key={customer.id} value={customer.customerCode}>
                  {customer.name}
                </option>
              ))}
            </datalist>
            <datalist id="carrier-codes">
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.carrierCode}>
                  {carrier.name}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>

        <SectionCard
          title="Customer Resolution"
          description="If the typed customer code is not found, this screen shows the closest tenant-owned matches instead of letting data go to the wrong company."
        >
          {customerLookup ? (
            <p className="helper-text">
              No exact customer match was found for <strong>{customerLookup}</strong>. Choose one of the closest
              tenant matches below or add the customer first.
            </p>
          ) : null}

          <CustomerResolutionDemo
            customers={customerLookup ? lookupMatches : customers}
            initialValue={customerLookup ?? "BEAOUT"}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Derived Subject Fields"
        description="These fields are now generated by business logic instead of Excel CONCATENATE formulas."
      >
        <ul className="note-list">
          <li>{buildEmailSubject(sampleCustomer.customerCode, "1253062", "1253062")}</li>
          <li>{buildRfqSubject(sampleCustomer.customerCode, "1253062")}</li>
          <li>If weight is left blank, the current build defaults to the legacy rule of cartons x 20 lb.</li>
        </ul>
      </SectionCard>
    </>
  );
}
