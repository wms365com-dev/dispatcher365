import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { StatusPill } from "@/components/status-pill";
import { getDeliveriesData } from "@/lib/server/dispatch-service";
import { recordDeliveryEventAction } from "@/lib/server/dispatch-actions";

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

function formatDateTime(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

export default async function DeliveriesPage() {
  const { activeStops, deliveryEvents } = await getDeliveriesData();

  const activeRows = activeStops.map((stop) => ({
    route: stop.routeRun.routeName,
    batch: stop.shipment.batchId,
    customer: `${stop.shipment.customer.customerCode} / ${stop.shipment.customer.name}`,
    driver: stop.routeRun.driver?.fullName ?? "Unassigned",
    carrier: stop.routeRun.carrier?.carrierCode ?? stop.shipment.carrier?.carrierCode ?? "Unassigned",
    deliveryDate: formatDate(stop.shipment.deliveryDate),
    window: stop.shipment.deliveryWindow ?? "-",
    status: <StatusPill status={stop.status} />
  }));

  const historyRows = deliveryEvents.map((event) => ({
    eventAt: formatDateTime(event.eventAt),
    batch: event.shipment.batchId,
    customer: `${event.shipment.customer.customerCode} / ${event.shipment.customer.name}`,
    eventType: <StatusPill status={event.eventType} />,
    route: event.routeStop?.routeRun.routeName ?? "Direct",
    driver: event.driver?.fullName ?? "Unknown",
    recipient: event.recipientName ?? "-",
    note: event.note ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Last-mile execution"
        title="Deliveries"
        description="This closes the missing leg from the legacy system: published route stops can now move into transit, complete with proof and exception events, using tenant-safe records."
      />

      <SectionCard
        title="Active Route Stops"
        description="Published and in-transit stops are the queue dispatch and the future driver app should both operate from."
      >
        <SimpleTable
          columns={[
            { key: "route", label: "Route" },
            { key: "batch", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "driver", label: "Driver" },
            { key: "carrier", label: "Carrier" },
            { key: "deliveryDate", label: "Delivery Date" },
            { key: "window", label: "Window" },
            { key: "status", label: "Status" }
          ]}
          rows={activeRows}
          emptyMessage="No published or in-transit stops are waiting right now."
        />
      </SectionCard>

      <div className="split-grid">
        <SectionCard
          title="Record Delivery Event"
          description="Dispatch can now record the same milestone states the old mobile/API layer handled: in transit, delivered, payment collected, returned, refused, and exception."
        >
          <form action={recordDeliveryEventAction} className="field-grid">
            <label className="field">
              <span>Batch ID</span>
              <input name="batchId" list="delivery-batches" placeholder="1002549" required />
            </label>
            <label className="field">
              <span>Event type</span>
              <select name="eventType" defaultValue="DELIVERED">
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="PAYMENT_COLLECTED">Payment Collected</option>
                <option value="RETURNED">Returned</option>
                <option value="REFUSED">Refused</option>
                <option value="EXCEPTION">Exception</option>
              </select>
            </label>
            <label className="field">
              <span>Recipient name</span>
              <input name="recipientName" placeholder="Receiving contact or signer" />
            </label>
            <label className="field">
              <span>Payment type</span>
              <input name="paymentType" placeholder="Check, cash, card" />
            </label>
            <label className="field">
              <span>COD amount</span>
              <input name="codAmount" type="number" min="0" step="0.01" placeholder="0.00" />
            </label>
            <label className="field">
              <span>Proof photo URL</span>
              <input name="proofPhotoUrl" placeholder="Future upload pipeline reference" />
            </label>
            <label className="field">
              <span>Signature URL</span>
              <input name="proofSignatureUrl" placeholder="Future signature capture reference" />
            </label>
            <label className="field field--wide">
              <span>Notes</span>
              <textarea
                name="note"
                rows={4}
                placeholder="Receiver notes, return reason, refusal details, exception context..."
              />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Save delivery event
              </button>
            </div>

            <datalist id="delivery-batches">
              {activeStops.map((stop) => (
                <option key={stop.id} value={stop.shipment.batchId}>
                  {stop.shipment.customer.customerCode}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>

        <SectionCard
          title="Mobile Handoff Notes"
          description="The web workflow and future driver app should now share one execution model instead of inventing delivery state in two places."
        >
          <ul className="note-list">
            <li>Published stops are the driver inbox.</li>
            <li>`In Transit` mirrors the old driver pick-up / accepted-job step.</li>
            <li>`Delivered`, `Returned`, `Refused`, and `Exception` are stored as event history, not hidden side effects.</li>
            <li>Proof photo and signature fields are placeholders for the later upload/capture pipeline.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Delivery History"
        description="Recent route execution events now live in a dedicated audit trail instead of being scattered across emails and status changes."
      >
        <SimpleTable
          columns={[
            { key: "eventAt", label: "When" },
            { key: "batch", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "eventType", label: "Event" },
            { key: "route", label: "Route" },
            { key: "driver", label: "Driver" },
            { key: "recipient", label: "Recipient" },
            { key: "note", label: "Notes" }
          ]}
          rows={historyRows}
          emptyMessage="No delivery events have been recorded yet."
        />
      </SectionCard>
    </>
  );
}
