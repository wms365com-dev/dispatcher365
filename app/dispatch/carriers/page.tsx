import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import {
  createCarrierAction,
  createDriverAction
} from "@/lib/server/dispatch-actions";
import { getCarriersData } from "@/lib/server/dispatch-service";

export default async function CarriersPage() {
  const { carriers, drivers } = await getCarriersData();

  const carrierRows = carriers.map((carrier) => ({
    code: carrier.carrierCode,
    companyName: carrier.name,
    address: carrier.address1 ?? "-",
    city: carrier.city ?? "-",
    state: carrier.state ?? "-",
    postalCode: carrier.postalCode ?? "-",
    tel: carrier.phone ?? "-",
    cell: carrier.cell ?? "-",
    email: carrier.email ?? "-"
  }));

  const driverRows = drivers.map((driver) => ({
    code: driver.driverCode,
    name: driver.fullName,
    carrier: driver.carrier?.carrierCode ?? "-",
    phone: driver.phone ?? "-",
    email: driver.email ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Carriers"
        title="Carrier Info"
        description="This matches the old carrier module more closely: add the trucking company, keep richer dispatch contact details, then attach drivers for truck runs."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Use Form Input"
          description="Enter the trucking company details in the same two-column style the original system used."
        >
          <form action={createCarrierAction} className="legacy-form-grid">
            <label className="field">
              <span>Company Code</span>
              <input name="carrierCode" placeholder="OLJ" required />
            </label>
            <label className="field">
              <span>Cell</span>
              <input name="cell" placeholder="4163335600" />
            </label>
            <label className="field">
              <span>Name</span>
              <input name="name" placeholder="Oljeje Transport" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="dispatch@example.com" />
            </label>
            <label className="field">
              <span>Address</span>
              <input name="address1" placeholder="5320 Finch Ave E Unit 7" />
            </label>
            <label className="field">
              <span>Website</span>
              <input name="website" placeholder="https://carrier.example.com" />
            </label>
            <label className="field">
              <span>Address 2</span>
              <input name="address2" placeholder="Dock or Suite" />
            </label>
            <label className="field">
              <span>Website Pick Up</span>
              <input name="websitePickup" placeholder="https://carrier.example.com/pickup" />
            </label>
            <label className="field">
              <span>City</span>
              <input name="city" placeholder="Scarborough" />
            </label>
            <label className="field">
              <span>SCAC Code</span>
              <input name="scac" placeholder="OLJT" />
            </label>
            <label className="field">
              <span>State</span>
              <input name="state" placeholder="ON" />
            </label>
            <label className="checkbox-field">
              <input name="isLtl" type="checkbox" />
              <span>LTL</span>
            </label>
            <label className="field">
              <span>Zipcode</span>
              <input name="postalCode" placeholder="M1S5G3" />
            </label>
            <label className="checkbox-field">
              <input name="isFtl" type="checkbox" />
              <span>FTL</span>
            </label>
            <label className="field">
              <span>Telephone</span>
              <input name="phone" placeholder="4163353600" />
            </label>
            <label className="checkbox-field">
              <input name="isBroker" type="checkbox" />
              <span>Broker</span>
            </label>
            <label className="field">
              <span>Fax</span>
              <input name="fax" placeholder="4163353610" />
            </label>
            <label className="field">
              <span>Contact</span>
              <input name="contactName" placeholder="Dispatch Desk" />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Submit Form
              </button>
              <button className="button button--ghost" type="reset">
                Reset
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Carriers List"
          description="This list mirrors the old carrier lookup table and keeps the fields dispatch actually scans."
        >
          <SimpleTable
            columns={[
              { key: "code", label: "Code" },
              { key: "companyName", label: "Company Name" },
              { key: "address", label: "Address" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "postalCode", label: "Zipcode" },
              { key: "tel", label: "Tel" },
              { key: "cell", label: "Cell" },
              { key: "email", label: "Email" }
            ]}
            rows={carrierRows}
            emptyMessage="No carriers have been added for this tenant yet."
          />
        </SectionCard>
      </div>

      <div className="legacy-page-grid">
        <SectionCard
          title="Drivers"
          description="Drivers remain separate from carrier records so routes can be assigned and later synced to mobile."
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
          description="This keeps the route-run assignment flow simple: pick a carrier, then pick the driver already attached to it."
        >
          <form action={createDriverAction} className="legacy-form-grid">
            <label className="field">
              <span>Driver Code</span>
              <input name="driverCode" placeholder="LUIS" required />
            </label>
            <label className="field">
              <span>Carrier Code</span>
              <input name="carrierCode" list="carrier-codes" placeholder="OLJ" />
            </label>
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="Luis Rojas" required />
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
                Submit Form
              </button>
              <button className="button button--ghost" type="reset">
                Reset
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
