import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { queueLabelJobAction } from "@/lib/server/dispatch-actions";
import { getLabelsData } from "@/lib/server/dispatch-service";

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace("T", " ") : "Pending";
}

export default async function LabelsPage() {
  const { shipments, labelJobs } = await getLabelsData();

  const rows = labelJobs.map((job) => ({
    batchId: job.shipment?.batchId ?? "-",
    customer: job.shipment?.customer.customerCode ?? "-",
    kind: job.labelKind,
    template: job.templateVariant,
    quantity: String(job.quantity),
    printedAt: formatDate(job.printedAt)
  }));

  return (
    <>
      <PageHeader
        eyebrow="Print Label"
        title="Label Output"
        description="This module now mirrors the old three-label workflow more closely: simple label, simple with item info, and full or mixed cases."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Generate Label Job"
          description="Select the shipment and variant, then push it into the print queue."
        >
          <form action={queueLabelJobAction} className="legacy-form-grid">
            <label className="field">
              <span>Batch ID</span>
              <input name="batchId" list="label-batches" placeholder="1002513" required />
            </label>
            <label className="field">
              <span>Label Type</span>
              <select name="labelKind" defaultValue="CARTON">
                <option value="CARTON">Carton</option>
                <option value="PALLET">Pallet</option>
              </select>
            </label>
            <label className="field">
              <span>Template</span>
              <select name="templateVariant" defaultValue="SIMPLE">
                <option value="SIMPLE">Simple Label</option>
                <option value="ITEM">Simple with Item info</option>
                <option value="CASE">Full cases and mixed cases</option>
              </select>
            </label>
            <label className="field">
              <span>Quantity</span>
              <input name="quantity" type="number" min="1" defaultValue="1" />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Queue Label
              </button>
            </div>
            <datalist id="label-batches">
              {shipments.map((shipment) => (
                <option key={shipment.id} value={shipment.batchId}>
                  {shipment.customer.customerCode} / {shipment.customer.name}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>

        <SectionCard
          title="Label Preview Types"
          description="These match the old menu structure so we can verify missing behavior before polishing the print templates."
        >
          <div className="preview-card-grid">
            <article className="mini-preview-card">
              <h4>Simple Label</h4>
              <p>Customer code, batch, destination, and carton or pallet count.</p>
            </article>
            <article className="mini-preview-card">
              <h4>Simple with Item Info</h4>
              <p>Basic label plus product or carton detail from the item master.</p>
            </article>
            <article className="mini-preview-card">
              <h4>Full Cases and Mixed Cases</h4>
              <p>Case-aware print layout for pallet and mixed shipment handling.</p>
            </article>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Label Jobs"
        description="This is the live print queue that the rebuilt label module now uses."
      >
        <SimpleTable
          columns={[
            { key: "batchId", label: "Batch" },
            { key: "customer", label: "Customer" },
            { key: "kind", label: "Kind" },
            { key: "template", label: "Template" },
            { key: "quantity", label: "Quantity" },
            { key: "printedAt", label: "Printed" }
          ]}
          rows={rows}
          emptyMessage="No label jobs have been generated yet."
        />
      </SectionCard>
    </>
  );
}
