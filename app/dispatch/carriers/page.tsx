import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createCarrierAction, createDriverAction } from "@/lib/server/dispatch-actions";
import { getCarriersData } from "@/lib/server/dispatch-service";

export default async function CarriersPage() {
  const { carriers, drivers } = await getCarriersData();

  const carrierRows = carriers.map((carrier) => ({
    code: carrier.carrierCode,
    name: carrier.name,
    scac: carrier.scac ?? "-",
    phone: carrier.phone ?? "-",
    email: carrier.email ?? "-",
    drivers: String(carrier._count.drivers)
  }));

  const driverRows = drivers.map((driver) => ({
    code: driver.driverCode,
    name: driver.fullName,
    carrier: driver.carrier?.carrierCode ?? "Unassigned",
    phone: driver.phone ?? "-",
    email: driver.email ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Carrier + driver master data"
        title="Carriers & Drivers"
        description="Carrier assignment and driver readiness now live in relational tables instead of separate maintenance pages and workbook tabs."
      />

      <div className="split-grid">
        <SectionCard
          title="Carrier Directory"
          description="Carriers are tenant-owned and reused across shipments, BOLs, and route runs."
        >
          <SimpleTable
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Company" },
              { key: "scac", label: "SCAC" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "drivers", label: "Drivers" }
            ]}
            rows={carrierRows}
            emptyMessage="No carriers have been added for this tenant yet."
          />
        </SectionCard>

        <SectionCard
          title="Add Carrier"
          description="This is the clean replacement for the old carrier add/edit workflow."
        >
          <form action={createCarrierAction} className="field-grid">
            <label className="field">
              <span>Carrier code</span>
              <input name="carrierCode" placeholder="OLJ" required />
            </label>
            <label className="field">
              <span>Company name</span>
              <input name="name" placeholder="Oljeje Transport" required />
            </label>
            <label className="field">
              <span>SCAC</span>
              <input name="scac" placeholder="OLJT" />
            </label>
            <label className="field">
              <span>Dispatch phone</span>
              <input name="phone" placeholder="4165550199" />
            </label>
            <label className="field">
              <span>Dispatch email</span>
              <input name="email" type="email" placeholder="dispatch@example.com" />
            </label>
            <label className="field">
              <span>Contact name</span>
              <input name="contactName" placeholder="Carrier Ops" />
            </label>
            <label className="checkbox-field">
              <input name="isLtl" type="checkbox" />
              <span>LTL carrier</span>
            </label>
            <label className="checkbox-field">
              <input name="isFtl" type="checkbox" />
              <span>FTL carrier</span>
            </label>
            <label className="checkbox-field">
              <input name="isBroker" type="checkbox" />
              <span>Broker</span>
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Save carrier
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="split-grid">
        <SectionCard
          title="Drivers"
          description="Drivers are the future mobile recipients for published routes."
        >
          <SimpleTable
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Driver" },
              { key: "carrier", label: "Carrier" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" }
            ]}
            rows={driverRows}
            emptyMessage="No drivers have been added for this tenant yet."
          />
        </SectionCard>

        <SectionCard
          title="Add Driver"
          description="Attach a driver to a carrier now so route publishing has a clear target."
        >
          <form action={createDriverAction} className="field-grid">
            <label className="field">
              <span>Driver code</span>
              <input name="driverCode" placeholder="LUIS" required />
            </label>
            <label className="field">
              <span>Driver name</span>
              <input name="fullName" placeholder="Luis Rojas" required />
            </label>
            <label className="field">
              <span>Carrier code</span>
              <input name="carrierCode" list="carrier-codes" placeholder="OLJ" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" placeholder="9175550144" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="driver@example.com" />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Save driver
              </button>
            </div>
            <datalist id="carrier-codes">
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.carrierCode}>
                  {carrier.name}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>
      </div>
    </>
  );
}
