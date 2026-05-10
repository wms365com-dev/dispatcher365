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
  const { customers, carriers, salesReps, products, shipments, lookupMatches } =
    await getPackingSlipsData(customerLookup);

  const rows = shipments.map((shipment) => ({
    batchId: shipment.batchId,
    customerNumber: shipment.customer.customerCode,
    customerPo: shipment.customerPo ?? "-",
    orderNumber: shipment.salesOrder ?? "-",
    startDate: formatDate(shipment.shipDate),
    cancelDate: formatDate(shipment.cancelDate),
    salesPerson: shipment.salesperson ?? "-",
    dateRevRouting: formatDate(shipment.routeDeskDate ?? shipment.routedDate),
    status: <StatusPill status={shipment.status} />
  }));

  const sampleCustomer = customers[0];

  return (
    <>
      <PageHeader
        eyebrow="Packing Slip"
        title="Add Packing"
        description="This screen now follows the old dispatch workflow much more closely: enter the shipment, keep the dense routing fields together, then review the packing queue below."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Use Form Input"
          description="This is the rebuilt add-packing screen. The goal here is speed for dispatch, not a generic modern form."
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
          description="Bulk import is still part of the legacy workflow. This pass keeps the affordance visible while the real import parser is rebuilt."
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
        description="This list keeps the same core columns the original BOL and routing steps depend on."
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

      <div className="legacy-page-grid">
        <SectionCard
          title="Customer Resolution"
          description="If the typed customer code is not found, dispatch gets the closest tenant-owned matches instead of silently creating bad data."
        >
          {customerLookup ? (
            <p className="helper-text">
              No exact customer match was found for <strong>{customerLookup}</strong>. Choose the closest tenant match
              below or add the customer first.
            </p>
          ) : null}

          <CustomerResolutionDemo
            customers={customerLookup ? lookupMatches : customers}
            initialValue={customerLookup ?? "BEAOUT"}
          />
        </SectionCard>

        <SectionCard
          title="Derived Subject Fields"
          description="These legacy workbook subjects still matter, but they now come from code instead of hidden Excel formulas."
        >
          <ul className="note-list">
            <li>{buildEmailSubject(sampleCustomer?.customerCode ?? "WG", "1253062", "1253062")}</li>
            <li>{buildRfqSubject(sampleCustomer?.customerCode ?? "WG", "1253062")}</li>
            <li>If weight is left blank, the current build defaults to the legacy rule of cartons x 20 lb.</li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
