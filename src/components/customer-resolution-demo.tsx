"use client";

import { useMemo, useState } from "react";

import { findClosestCustomerMatches } from "@/lib/workbook/formulas";

interface ResolverCustomer {
  id: string;
  customerCode: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

interface CustomerResolutionDemoProps {
  customers: ResolverCustomer[];
  initialValue?: string;
}

export function CustomerResolutionDemo({
  customers,
  initialValue = "BEAOUT"
}: CustomerResolutionDemoProps) {
  const [value, setValue] = useState(initialValue);

  const matches = useMemo(() => findClosestCustomerMatches(value, customers, 4), [value]);

  return (
    <div className="resolver">
      <label className="field">
        <span>Customer code or name</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type a customer code"
        />
      </label>

      <div className="resolver__results">
        <div>
          <p className="kicker">Workbook behavior rebuilt</p>
          <h4>Closest tenant matches</h4>
          <p>
            If a typed customer does not resolve exactly, the web app should show tenant-scoped
            matches and allow the dispatcher to select or create the customer.
          </p>
        </div>

        <ul className="resolver__list">
          {matches.map((customer) => (
            <li key={customer.id}>
              <strong>{customer.customerCode}</strong>
              <span>{customer.name}</span>
              <small>
                {[customer.city, customer.state].filter(Boolean).join(", ") || "Location pending"}
              </small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
