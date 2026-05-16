import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { queueLabelJobAction } from "@/lib/server/dispatch-actions";
import { getLabelsData } from "@/lib/server/dispatch-service";

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace("T", " ") : "Pending";
}

interface LabelsPageProps {
  searchParams?: Promise<{
    view?: string;
  }>;
}

export default async function LabelsPage({ searchParams }: LabelsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const view = params?.view === "item" || params?.view === "cases" ? params.view : "simple";
  const { shipments, labelJobs } = await getLabelsData();

  const rows = labelJobs.map((job: (typeof labelJobs)[number]) => ({
    batchId: job.shipment?.batchId ?? "-",
    customer: job.shipment?.customer.customerCode ?? "-",
    kind: job.labelKind,
    template: job.templateVariant,
    quantity: String(job.quantity),
    printedAt: formatDate(job.printedAt)
  }));

  const templateVariant = view === "item" ? "ITEM" : view === "cases" ? "CASE" : "SIMPLE";
  const viewTitle =
    view === "item"
      ? "Simple with Item Info"
      : view === "cases"
        ? "Full cases and mixed cases"
        : "Simple Label";

  return (
    <>
      <PageHeader
        eyebrow="Print Label"
        title={viewTitle}
        description="Label entry is split by the old navigation pattern so print operators can choose the exact mode first."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Generate Label Job"
          description="Enter the order or batch and print the selected label mode."
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
              <select name="templateVariant" defaultValue={templateVariant}>
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
              {shipments.map((shipment: (typeof shipments)[number]) => (
                <option key={shipment.id} value={shipment.batchId}>
                  {shipment.customer.customerCode} / {shipment.customer.name}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>

        <SectionCard
          title="Mode Notes"
          description="This keeps the legacy operator flow where the print mode is selected from the left navigation, not from a combined dashboard."
        >
          <div className="preview-card-grid">
            <article className="mini-preview-card">
              <h4>{viewTitle}</h4>
              <p>
                {view === "item"
                  ? "Basic label plus product or carton detail from the item master."
                  : view === "cases"
                    ? "Case-aware print layout for pallet and mixed shipment handling."
                    : "Customer code, batch, destination, and carton or pallet count."}
              </p>
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
