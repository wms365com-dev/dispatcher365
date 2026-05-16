import { CustomerResolutionDemo } from "@/components/customer-resolution-demo";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createCustomerAction } from "@/lib/server/dispatch-actions";
import { getCustomersData } from "@/lib/server/dispatch-service";

interface CustomersPageProps {
  searchParams?: Promise<{
    view?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const view = params?.view === "list" ? "list" : "create";
  const { customers } = await getCustomersData();

  const rows = customers.map((customer: (typeof customers)[number]) => ({
    code: customer.customerCode,
    name: customer.name,
    address: customer.billingAddress1 ?? "-",
    city: customer.city ?? "-",
    postalCode: customer.postalCode ?? "-",
    tel: customer.phone ?? "-",
    email: customer.email ?? "-"
  }));

  return (
    <>
      <PageHeader
        eyebrow="Customer"
        title="Customer Info"
        description={
          view === "list"
            ? "Customer lookup follows the old separate lookup screen."
            : "Enter the customer first, then reuse the code during packing slip and BOL work."
        }
      />

      {view === "create" ? (
        <SectionCard
          title="Use Form Input"
          description="The old customer screen captured billing and ship-to details in one entry form."
        >
          <form action={createCustomerAction} className="legacy-form-grid">
            <label className="field">
              <span>Customer No</span>
              <input name="customerCode" placeholder="WG" required />
            </label>
            <label className="field">
              <span>Freight 3rd Party</span>
              <select name="freightTerms" defaultValue="prepaid">
                <option value="prepaid">Prepaid</option>
                <option value="collect">Collect</option>
                <option value="third-party">Yes</option>
              </select>
            </label>
            <label className="field">
              <span>Name</span>
              <input name="name" placeholder="WG Pro-Manufacturing Inc" required />
            </label>
            <label className="field">
              <span>Comments</span>
              <input name="comments" placeholder="Optional receiving note or customer comment" />
            </label>
            <label className="field">
              <span>Country</span>
              <input name="country" placeholder="CA" defaultValue="US" />
            </label>
            <label className="field">
              <span>Ship To Code</span>
              <input name="shipToCode" placeholder="Optional ship-to code" />
            </label>
            <label className="field">
              <span>Name</span>
              <input name="shipToName" placeholder="WG Pro-Manufacturing Inc" />
            </label>
            <label className="field field--wide">
              <span>Address</span>
              <input name="billingAddress1" placeholder="10 Auction Lane" required />
            </label>
            <label className="field field--wide">
              <span>Ship To Address</span>
              <input name="shipToAddress1" placeholder="10 Auction Lane" />
            </label>
            <label className="field">
              <span>City</span>
              <input name="city" placeholder="Brampton" required />
            </label>
            <label className="field">
              <span>Ship To City</span>
              <input name="shipToCity" placeholder="Brampton" />
            </label>
            <label className="field">
              <span>Zipcode</span>
              <input name="postalCode" placeholder="L6T5V8" required />
            </label>
            <label className="field">
              <span>Ship To Zip</span>
              <input name="shipToPostalCode" placeholder="L6T5V8" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="logistics@example.com" />
            </label>
            <label className="field">
              <span>Ship To Email</span>
              <input name="shipToEmail" type="email" placeholder="receiving@example.com" />
            </label>
            <label className="field">
              <span>Phone Number</span>
              <input name="phone" placeholder="9057903377" />
            </label>
            <label className="field">
              <span>Ship To Phone</span>
              <input name="shipToPhone" placeholder="9057903377" />
            </label>
            <label className="field">
              <span>State</span>
              <input name="state" placeholder="ON" required />
            </label>
            <label className="field">
              <span>Ship To State</span>
              <input name="shipToState" placeholder="ON" />
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
      ) : (
        <>
          <SectionCard
            title="Customer List"
            description="Customer lookup is separated from entry so dispatchers can scan without the form sitting beside it."
          >
            <SimpleTable
              columns={[
                { key: "code", label: "Customer number" },
                { key: "name", label: "Name" },
                { key: "address", label: "Address" },
                { key: "city", label: "City" },
                { key: "postalCode", label: "Zipcode" },
                { key: "tel", label: "Tel" },
                { key: "email", label: "Email" }
              ]}
              rows={rows}
              emptyMessage="No customers have been added for this tenant yet."
            />
          </SectionCard>

          <SectionCard
            title="Closest Match Preview"
            description="This keeps the add-or-select customer helper close to the lookup screen."
          >
            <CustomerResolutionDemo customers={customers} />
          </SectionCard>
        </>
      )}
    </>
  );
}
