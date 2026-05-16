"use client";

import { useMemo, useState } from "react";

import { createRouteRunAction } from "@/lib/server/dispatch-actions";

type RouteCandidateRow = {
  batchId: string;
  customer: string;
  carrier: string;
  shipDate: string;
  pallets: string;
  cartons: string;
  status: string;
};

type CarrierOption = {
  id: string;
  carrierCode: string;
  name: string;
};

type DriverOption = {
  id: string;
  driverCode: string;
  fullName: string;
};

interface TruckRunStagingWorkspaceProps {
  candidates: RouteCandidateRow[];
  carriers: CarrierOption[];
  drivers: DriverOption[];
}

function normalizeBatchId(value: string) {
  return value.trim().toUpperCase();
}

function uniqueBatchIds(values: string[]) {
  return [...new Set(values.map(normalizeBatchId).filter(Boolean))];
}

export function TruckRunStagingWorkspace({
  candidates,
  carriers,
  drivers
}: TruckRunStagingWorkspaceProps) {
  const [total, setTotal] = useState(1);
  const [batchInputs, setBatchInputs] = useState<string[]>([""]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const selectedBatchIds = useMemo(() => uniqueBatchIds(batchInputs), [batchInputs]);

  const filteredCandidates = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return candidates;
    }

    return candidates.filter((row) =>
      [row.batchId, row.customer, row.carrier, row.shipDate, row.status].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }, [candidates, searchTerm]);

  function syncInputs(nextCount: number, nextValues: string[]) {
    const values = [...nextValues];
    while (values.length < nextCount) {
      values.push("");
    }
    values.length = nextCount;
    setTotal(nextCount);
    setBatchInputs(values);
  }

  function handleUseChange(rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10);
    const nextCount = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : 1;
    syncInputs(nextCount, batchInputs);
  }

  function handleBatchChange(index: number, value: string) {
    const next = [...batchInputs];
    next[index] = normalizeBatchId(value);
    setBatchInputs(next);
    setNotice(null);
  }

  function handleStageBatch(batchId: string) {
    if (selectedBatchIds.includes(batchId)) {
      setNotice(`Batch ${batchId} was already added.`);
      return;
    }

    const next = [...batchInputs];
    const emptyIndex = next.findIndex((value) => !normalizeBatchId(value));

    if (emptyIndex >= 0) {
      next[emptyIndex] = batchId;
    } else {
      next.push(batchId);
    }

    const usedCount = uniqueBatchIds(next).length;
    syncInputs(Math.max(total, usedCount + 1), next);
    setNotice(`Batch ${batchId} added to the truck run.`);
  }

  return (
    <>
      <section className="surface section-card">
        <div className="section-card__header">
          <h3>Use Form Input</h3>
        </div>

        <form action={createRouteRunAction} className="legacy-form-grid">
          <label className="field">
            <span>Carrier Code</span>
            <input name="carrierCode" list="route-carriers" placeholder="Enter Carrier Code or Name" />
          </label>
          <label className="field">
            <span>Delivery Date</span>
            <input name="routeDate" type="date" required />
          </label>

          <div className="field field--wide">
            <div className="legacy-bol-stage__head">
              <span className="legacy-bol-stage__label">Add Packing</span>
              <span className="legacy-bol-stage__label">Use</span>
              <input
                className="legacy-bol-stage__use"
                inputMode="numeric"
                onChange={(event) => handleUseChange(event.target.value)}
                value={total}
              />
              <span className="legacy-bol-stage__label">Batch ID</span>
            </div>
            <div className="legacy-bol-stage__list">
              {Array.from({ length: total }, (_, index) => (
                <input
                  key={index}
                  className="legacy-bol-stage__input"
                  onChange={(event) => handleBatchChange(index, event.target.value)}
                  placeholder="Enter Batch ID"
                  value={batchInputs[index] ?? ""}
                />
              ))}
            </div>
            <input name="routeName" type="hidden" value="" />
            <input name="driverCode" type="hidden" value="" />
            <input type="hidden" name="batchIds" value={selectedBatchIds.join(",")} />
            {notice ? <p className="legacy-bol-stage__notice">{notice}</p> : null}
          </div>

          <div className="field field--wide form-actions">
            <button className="button" type="submit">
              Submit
            </button>
            <button
              className="button button--ghost"
              onClick={() => {
                syncInputs(1, [""]);
                setNotice(null);
              }}
              type="reset"
            >
              Reset
            </button>
          </div>

          <datalist id="route-carriers">
            {carriers.map((carrier) => (
              <option key={carrier.id} value={carrier.carrierCode}>
                {carrier.name}
              </option>
            ))}
          </datalist>
          <datalist id="route-drivers">
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.driverCode}>
                {driver.fullName}
              </option>
            ))}
          </datalist>
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-card__header">
          <h3>All Packing Slip</h3>
        </div>

        <div className="legacy-bol-table-tools">
          <label className="field">
            <span>Search</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search ..."
              value={searchTerm}
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="table legacy-bol-table">
            <thead>
              <tr>
                <th>Tools</th>
                <th>Batch ID</th>
                <th>Customer</th>
                <th>Carrier</th>
                <th>Ship Date</th>
                <th>Pallets</th>
                <th>Cartons</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length ? (
                filteredCandidates.map((row) => {
                  const staged = selectedBatchIds.includes(row.batchId);

                  return (
                    <tr key={row.batchId}>
                      <td>
                        <button
                          className="button button--secondary button--small"
                          onClick={() => handleStageBatch(row.batchId)}
                          type="button"
                        >
                          {staged ? "Added" : "Add"}
                        </button>
                      </td>
                      <td
                        className="legacy-bol-table__batch legacy-bol-table__batch--active"
                        onDoubleClick={() => handleStageBatch(row.batchId)}
                        title="Double-click to add this packing slip to the truck run."
                      >
                        {row.batchId}
                      </td>
                      <td>{row.customer}</td>
                      <td>{row.carrier}</td>
                      <td>{row.shipDate}</td>
                      <td>{row.pallets}</td>
                      <td>{row.cartons}</td>
                      <td>{row.status}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="table__empty" colSpan={8}>
                    No BOL-created packing slips are waiting for routing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
