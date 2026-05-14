import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { createShipmentAction } from "@/lib/server/dispatch-actions";
import { getPackingSlipsData } from "@/lib/server/dispatch-service";

interface PackingSlipsPageProps {
  searchParams?: Promise<{
    customerLookup?: string;
  }>;
}

interface PackingCustomerMatch {
  id: string;
  customerCode: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

interface PackingCustomer {
  id: string;
  customerCode: string;
  name: string;
}

interface PackingCarrier {
  id: string;
  carrierCode: string;
  name: string;
}

interface PackingSalesRep {
  id: string;
  repCode: string;
  fullName: string;
}

interface PackingProduct {
  id: string;
}

interface PackingShipment {
  batchId: string;
  customerPo?: string | null;
  salesOrder?: string | null;
  shipDate?: Date | null;
  cancelDate?: Date | null;
  routeDeskDate?: Date | null;
  routedDate?: Date | null;
  salesperson?: string | null;
  status: string;
  legacyStatusLabel?: string | null;
  customer: {
    customerCode: string;
  };
}

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

export default async function PackingSlipsPage({ searchParams }: PackingSlipsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const customerLookup = params?.customerLookup;
  const packingData = await getPackingSlipsData(customerLookup);
  const customers = packingData.customers as PackingCustomer[];
  const carriers = packingData.carriers as PackingCarrier[];
  const salesReps = packingData.salesReps as PackingSalesRep[];
  const products = packingData.products as PackingProduct[];
  const shipments = packingData.shipments as PackingShipment[];
  const lookupMatches = packingData.lookupMatches as PackingCustomerMatch[];

  const rows = shipments.map((shipment) => ({
    batchId: shipment.batchId,
    customerNumber: shipment.customer.customerCode,
    customerPo: shipment.customerPo ?? "-",
    orderNumber: shipment.salesOrder ?? "-",
    startDate: formatDate(shipment.shipDate),
    cancelDate: formatDate(shipment.cancelDate),
    salesPerson: shipment.salesperson ?? "-",
    dateRevRouting: formatDate(shipment.routeDeskDate ?? shipment.routedDate),
    status: <StatusPill status={shipment.legacyStatusLabel ?? shipment.status} />
  }));

  return (
    <>
      <PageHeader
        eyebrow="Packing Slip"
        title="Add Packing"
        description="Enter the shipment quickly, keep routing fields together, then move it straight into the packing queue."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Use Form Input"
          description="Built for fast dispatch entry. Fill the shipment, submit it, and it drops into the queue below."
        >
          <form action={createShipmentAction} className="legacy-form-grid">
            <label className="field">
              <span>Customer Number</span>
              <input name="customerCode" list="customer-codes" placeholder="BEAOUTNJ" required />
            </label>
            <label className="field">
              <span>Height</span>
              <input name="heightIn" type="number" step="0.01" placeholder="56" />
            </label>
            <label className="field">
              <span>Customer P.O</span>
              <input name="customerPo" placeholder="927234" />
            </label>
            <label className="field">
              <span>Freight Class</span>
              <input name="freightClass" placeholder="125" />
            </label>
            <label className="field">
              <span>Order Number</span>
              <input name="salesOrder" placeholder="1286965" />
            </label>
            <label className="field">
              <span>Cube</span>
              <input name="cubeCuFt" type="number" step="0.01" placeholder="97.78" />
            </label>
            <label className="field">
              <span>Start Date</span>
              <input name="shipDate" type="date" />
            </label>
            <label className="field">
              <span>Comments</span>
              <input name="comments" placeholder="Appointment notes" />
            </label>
            <label className="field">
              <span>Cancel Date</span>
              <input name="cancelDate" type="date" />
            </label>
            <label className="field">
              <span>Check or Cash</span>
              <input name="checkOrCash" placeholder="CHECK" />
            </label>
            <label className="field">
              <span>Sales Person</span>
              <input name="salesperson" list="sales-rep-codes" placeholder="ZE47" />
            </label>
            <label className="field">
              <span>COD</span>
              <input name="codAmount" type="number" step="0.01" placeholder="0.00" />
            </label>
            <label className="field">
              <span>Date Rev Routing Desk</span>
              <input name="routeDeskDate" type="date" />
            </label>
            <label className="field">
              <span>Routed Date</span>
              <input name="routedDate" type="date" />
            </label>
            <label className="field">
              <span>Status</span>
              <input value="READY FOR BOL" readOnly />
            </label>
            <label className="field">
              <span>Authorization</span>
              <input name="authorization" placeholder="AUTH-001" />
            </label>
            <label className="field">
              <span>Batch ID</span>
              <input name="batchId" placeholder="1002512" required />
            </label>
            <label className="field">
              <span>Approved By</span>
              <input name="approvedBy" placeholder="Dispatch Lead" />
            </label>
            <label className="field">
              <span>Truck</span>
              <input name="carrierCode" list="carrier-codes" placeholder="OLJ" />
            </label>
            <label className="field">
              <span>Delivery Date</span>
              <input name="deliveryDate" type="date" />
            </label>
            <label className="field">
              <span>Units</span>
              <input name="units" type="number" min="0" defaultValue="0" />
            </label>
            <label className="field">
              <span>Delivery Time</span>
              <input name="deliveryWindow" placeholder="10:00 AM to 4:00 PM" />
            </label>
            <label className="field">
              <span>Cartons</span>
              <input name="cartons" type="number" min="0" defaultValue="0" />
            </label>
            <label className="field">
              <span>Approval</span>
              <input name="approvalNotes" placeholder="Approved" />
            </label>
            <label className="field">
              <span>Pallets</span>
              <input name="pallets" type="number" min="0" defaultValue="0" />
            </label>
            <label className="field">
              <span>SCAC</span>
              <input name="scac" placeholder="OLJT" />
            </label>
            <label className="field">
              <span>Weight</span>
              <input name="weightLb" type="number" min="0" step="0.01" placeholder="Auto = cartons x 20" />
            </label>
            <label className="field">
              <span>Dept</span>
              <input name="department" placeholder="HOUSEWARE" />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Submit Form
              </button>
              <button className="button button--ghost" type="reset">
                Reset
              </button>
            </div>
            <p className="helper-text field--wide">
              If weight is left blank, the system follows the legacy rule and falls back to cartons x 20 lb.
            </p>

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
            <datalist id="sales-rep-codes">
              {salesReps.map((salesRep) => (
                <option key={salesRep.id} value={salesRep.repCode}>
                  {salesRep.fullName}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>

        <SectionCard
          title="Use Excel File"
          description="Bulk intake stays visible here because it is part of the original dispatch workflow."
        >
          <div className="note-list">
            <p>Download a sample file, then upload a tenant-safe import file for packing slip intake.</p>
            <ul>
              <li>Download sample file placeholder</li>
              <li>Bulk upload parser to be wired to the same shipment service</li>
              <li>Current product defaults available: {products.length}</li>
            </ul>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="All Packing Slip"
        description="This queue keeps the core columns the BOL and truck-run steps depend on."
      >
        <SimpleTable
          columns={[
            { key: "batchId", label: "Batch ID" },
            { key: "customerNumber", label: "Customer number" },
            { key: "customerPo", label: "Customer PO" },
            { key: "orderNumber", label: "Order Number" },
            { key: "startDate", label: "Start date" },
            { key: "cancelDate", label: "Cancel date" },
            { key: "salesPerson", label: "Sales Person" },
            { key: "dateRevRouting", label: "Date Rev Routing" },
            { key: "status", label: "Status" }
          ]}
          rows={rows}
          emptyMessage="No packing slips have been entered yet."
        />
      </SectionCard>

      {customerLookup ? (
        <SectionCard
          title="Customer Resolution"
          description="No exact customer match was found. Pick the closest tenant-owned customer or add the customer before retrying the packing slip."
        >
          <SimpleTable
            columns={[
              { key: "customerCode", label: "Customer number" },
              { key: "name", label: "Name" },
              { key: "city", label: "City" },
              { key: "state", label: "State" }
            ]}
            rows={lookupMatches.map((customer) => ({
              customerCode: customer.customerCode,
              name: customer.name,
              city: customer.city ?? "-",
              state: customer.state ?? "-"
            }))}
            emptyMessage={`No tenant-owned matches were found for ${customerLookup}. Add the customer first.`}
          />
        </SectionCard>
      ) : null}
    </>
  );
}
