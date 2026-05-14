import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SimpleTable } from "@/components/simple-table";
import { createUserAction } from "@/lib/server/dispatch-actions";
import { getUsersData } from "@/lib/server/dispatch-service";

interface UserMembershipRecord {
  user: {
    fullName: string;
    email: string;
  };
  tenant: {
    name: string;
  };
  role: string;
  carrier?: {
    carrierCode: string;
  } | null;
  driver?: {
    driverCode: string;
  } | null;
  isPortalAccess: boolean;
  createdAt: Date;
}

interface TenantRecord {
  id: string;
  slug: string;
  name: string;
}

interface UserCarrierRecord {
  id: string;
  carrierCode: string;
  name: string;
}

interface UserDriverRecord {
  id: string;
  driverCode: string;
  fullName: string;
}

export default async function UsersPage() {
  const usersData = await getUsersData();
  const context = usersData.context as {
    tenant: {
      slug: string;
    };
  };
  const memberships = usersData.memberships as UserMembershipRecord[];
  const tenants = usersData.tenants as TenantRecord[];
  const carriers = usersData.carriers as UserCarrierRecord[];
  const drivers = usersData.drivers as UserDriverRecord[];

  const rows = memberships.map((membership) => ({
    user: membership.user.fullName,
    email: membership.user.email,
    company: membership.tenant.name,
    role: membership.role.replaceAll("_", " "),
    carrier: membership.carrier?.carrierCode ?? "-",
    driver: membership.driver?.driverCode ?? "-",
    portal: membership.isPortalAccess ? "Portal" : "Internal",
    created: membership.createdAt.toISOString().slice(0, 10)
  }));

  return (
    <>
      <PageHeader
        eyebrow="User Manage"
        title="Users List"
        description="This now handles both internal tenant users and carrier-portal accounts, including dispatcher, carrier admin, carrier dispatcher, and driver access."
      />

      <div className="legacy-page-grid">
        <SectionCard
          title="Add New User"
          description="Platform admins can add a user and attach them to a tenant and role."
        >
          <form action={createUserAction} className="legacy-form-grid">
            <label className="field">
              <span>Full Name</span>
              <input name="fullName" placeholder="Operations Manager" required />
            </label>
            <label className="field">
              <span>Company</span>
              <select name="tenantSlug" defaultValue={context.tenant.slug}>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.slug}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="user@example.com" required />
            </label>
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue="DISPATCHER">
                <option value="PLATFORM_ADMIN">Platform Admin</option>
                <option value="TENANT_ADMIN">Tenant Admin</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="CUSTOMER_SERVICE">Customer Service</option>
                <option value="CARRIER_ADMIN">Carrier Admin</option>
                <option value="CARRIER_DISPATCHER">Carrier Dispatcher</option>
                <option value="DRIVER">Driver</option>
              </select>
            </label>
            <label className="field">
              <span>Carrier Code</span>
              <input name="carrierCode" list="user-carriers" placeholder="OLJ" />
            </label>
            <label className="field">
              <span>Driver Code</span>
              <input name="driverCode" list="user-drivers" placeholder="LUIS" />
            </label>
            <label className="field field--wide">
              <span>Password</span>
              <input name="password" type="password" placeholder="Temporary password" required />
            </label>
            <div className="field field--wide form-actions">
              <button className="button" type="submit">
                Submit Form
              </button>
            </div>
            <datalist id="user-carriers">
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.carrierCode}>
                  {carrier.name}
                </option>
              ))}
            </datalist>
            <datalist id="user-drivers">
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.driverCode}>
                  {driver.fullName}
                </option>
              ))}
            </datalist>
          </form>
        </SectionCard>

        <SectionCard
          title="Users List"
          description="This table replaces the old admin grid with the same high-value fields: user, tenant, role, and created date."
        >
          <SimpleTable
            columns={[
              { key: "user", label: "User" },
              { key: "email", label: "Email" },
              { key: "company", label: "Company" },
              { key: "role", label: "Role" },
              { key: "carrier", label: "Carrier" },
              { key: "driver", label: "Driver" },
              { key: "portal", label: "Access" },
              { key: "created", label: "Created" }
            ]}
            rows={rows}
            emptyMessage="No users found."
          />
        </SectionCard>
      </div>
    </>
  );
}
