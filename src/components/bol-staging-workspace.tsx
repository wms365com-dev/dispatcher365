"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

type BolTableRow = {
  batchId: string;
  customerNumber: string;
  customerPo: string;
  orderNumber: string;
  startDate: string;
  cancelDate: string;
  salesPerson: string;
  routeDeskDate: string;
  status: string;
  shippedDate: string;
  truck: string;
  units: string;
  cartons: string;
  pallets: string;
  weight: string;
  height: string;
  freightClass: string;
  cube: string;
  comments: string;
  canStage: boolean;
};

interface BolStagingWorkspaceProps {
  initialBatchIds: string[];
  selectedRows: BolTableRow[];
  allRows: BolTableRow[];
  hasInvalidSelection?: boolean;
  selectedActions?: ReactNode;
}

function normalizeBatchId(value: string) {
  return value.trim().toUpperCase();
}

function uniqueBatchIds(values: string[]) {
  return [...new Set(values.map(normalizeBatchId).filter(Boolean))];
}

function getInitialSlots(batchIds: string[]) {
  return Math.max(batchIds.length ? batchIds.length + 1 : 1, 1);
}

export function BolStagingWorkspace({
  initialBatchIds,
  selectedRows,
  allRows,
  hasInvalidSelection = false,
  selectedActions
}: BolStagingWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [slotCount, setSlotCount] = useState(getInitialSlots(initialBatchIds));
  const [batchInputs, setBatchInputs] = useState(() => {
    const next = [...initialBatchIds];

    while (next.length < getInitialSlots(initialBatchIds)) {
      next.push("");
    }

    return next;
  });
  const [notice, setNotice] = useState<string | null>(
    hasInvalidSelection && initialBatchIds.length ? "This Packing Slip does not exist!" : null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const normalizedSelection = useMemo(
    () => uniqueBatchIds(batchInputs),
    [batchInputs]
  );

  const filteredRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return allRows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        row.batchId,
        row.customerNumber,
        row.customerPo,
        row.orderNumber,
        row.salesPerson,
        row.truck,
        row.comments,
        row.status
      ].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [allRows, searchTerm, statusFilter]);

  const statusOptions = useMemo(
    () => ["ALL", ...new Set(allRows.map((row) => row.status))],
    [allRows]
  );

  function syncInputArray(nextCount: number, nextValues: string[]) {
    const adjusted = [...nextValues];

    if (adjusted.length > nextCount) {
      adjusted.length = nextCount;
    }

    while (adjusted.length < nextCount) {
      adjusted.push("");
    }

    setSlotCount(nextCount);
    setBatchInputs(adjusted);
  }

  function handleUseChange(rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10);
    const nextCount = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 12)
      : 1;

    syncInputArray(nextCount, batchInputs);
    setNotice(null);
  }

  function handleBatchChange(index: number, value: string) {
    const next = [...batchInputs];
    next[index] = normalizeBatchId(value);
    setBatchInputs(next);
    setNotice(null);
  }

  function handleStageBatch(batchId: string) {
    if (!batchId) {
      return;
    }

    if (normalizedSelection.includes(batchId)) {
      setNotice(`This packing slip was already added: ${batchId}.`);
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
    const nextCount = Math.max(slotCount, usedCount + 1);
    syncInputArray(nextCount, next);
    setNotice(`Batch ${batchId} added to the grouped BOL selection.`);
  }

  function navigateWithSelection(batchIds: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("generated");
    params.delete("emailStatus");
    params.delete("error");

    if (batchIds.length) {
      params.set("batchIds", batchIds.join(","));
    } else {
      params.delete("batchIds");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.push(nextUrl as Route);
    });
  }

  function handleShowData() {
    if (!normalizedSelection.length) {
      setNotice("Please enter Batch ID!");
      return;
    }

    setNotice(null);
    navigateWithSelection(normalizedSelection);
  }

  function handleClear() {
    setNotice(null);
    syncInputArray(1, [""]);
    navigateWithSelection([]);
  }

  const selectedCountLabel = `${selectedRows.length || 0} selected`;

  return (
    <>
      <div className="split-grid">
        <section className="surface section-card">
          <div className="section-card__header">
            <h3>Enter Batch ID</h3>
            <p>
              Double-click batch IDs from the packing list below or type them here manually, then
              click <strong>Show Data</strong>.
            </p>
          </div>

          <div className="legacy-bol-stage">
            <div className="legacy-bol-stage__head">
              <span className="legacy-bol-stage__label">Use</span>
              <input
                className="legacy-bol-stage__use"
                inputMode="numeric"
                onChange={(event) => handleUseChange(event.target.value)}
                value={slotCount}
              />
              <span className="legacy-bol-stage__label">Batch ID</span>
            </div>

            <div className="legacy-bol-stage__list">
              {Array.from({ length: slotCount }, (_, index) => (
                <input
                  key={index}
                  className="legacy-bol-stage__input"
                  onChange={(event) => handleBatchChange(index, event.target.value)}
                  placeholder="Enter Batch ID"
                  value={batchInputs[index] ?? ""}
                />
              ))}
            </div>

            <div className="legacy-bol-stage__actions">
              <button
                className="button"
                onClick={handleShowData}
                type="button"
              >
                {isPending ? "Loading..." : "Show Data"}
              </button>
              <button
                className="button button--secondary"
                onClick={handleClear}
                type="button"
              >
                Clear
              </button>
            </div>

            {notice ? <p className="legacy-bol-stage__notice">{notice}</p> : null}
          </div>
        </section>

        <section className="surface section-card">
          <div className="section-card__header">
            <h3>Packing Slip Was Chosen</h3>
            <p>
              {selectedCountLabel}. The old system reviewed the chosen packing slips here before
              BOL generation.
            </p>
          </div>

          <div className="table-wrap">
            <table className="table legacy-bol-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Customer number</th>
                  <th>Customer PO</th>
                  <th>Order Number</th>
                  <th>Sales Person</th>
                  <th>Date Rev Routing</th>
                  <th>Status</th>
                  <th>Truck</th>
                  <th>Cartons</th>
                  <th>Pallets</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.length ? (
                  selectedRows.map((row) => (
                    <tr key={row.batchId}>
                      <td>{row.batchId}</td>
                      <td>{row.customerNumber}</td>
                      <td>{row.customerPo}</td>
                      <td>{row.orderNumber}</td>
                      <td>{row.salesPerson}</td>
                      <td>{row.routeDeskDate}</td>
                      <td>{row.status}</td>
                      <td>{row.truck}</td>
                      <td>{row.cartons}</td>
                      <td>{row.pallets}</td>
                      <td>{row.weight}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="table__empty" colSpan={11}>
                      NODATA
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedRows.length && selectedActions ? (
            <div className="legacy-bol-stage__selected-actions">{selectedActions}</div>
          ) : null}
        </section>
      </div>

      <section className="surface section-card">
        <div className="section-card__header">
          <h3>All Packing Slip</h3>
          <p>
            Double-click a batch ID to stage it into the grouped BOL. This is the key legacy
            interaction we carried over.
          </p>
        </div>

        <div className="legacy-bol-table-tools">
          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All" : option}
                </option>
              ))}
            </select>
          </label>
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
                <th>Customer number</th>
                <th>Customer PO</th>
                <th>Order Number</th>
                <th>Start date</th>
                <th>Cancel date</th>
                <th>Sales Person</th>
                <th>Date Rev Routing</th>
                <th>Status</th>
                <th>Shipped date</th>
                <th>Truck</th>
                <th>Units</th>
                <th>Cartons</th>
                <th>Pallets</th>
                <th>Weight</th>
                <th>Height</th>
                <th>Freight Class</th>
                <th>Cube</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const staged = normalizedSelection.includes(row.batchId);

                  return (
                    <tr key={row.batchId}>
                      <td>
                        <button
                          className="button button--secondary button--small"
                          disabled={!row.canStage}
                          onClick={() => handleStageBatch(row.batchId)}
                          type="button"
                        >
                          {staged ? "Added" : "Add"}
                        </button>
                      </td>
                      <td
                        className={`legacy-bol-table__batch${row.canStage ? " legacy-bol-table__batch--active" : ""}`}
                        onDoubleClick={() => {
                          if (row.canStage) {
                            handleStageBatch(row.batchId);
                          }
                        }}
                        title={row.canStage ? "Double-click to add this packing slip to the grouped BOL." : "Delivered packing slips cannot be staged again."}
                      >
                        {row.batchId}
                      </td>
                      <td>{row.customerNumber}</td>
                      <td>{row.customerPo}</td>
                      <td>{row.orderNumber}</td>
                      <td>{row.startDate}</td>
                      <td>{row.cancelDate}</td>
                      <td>{row.salesPerson}</td>
                      <td>{row.routeDeskDate}</td>
                      <td>{row.status}</td>
                      <td>{row.shippedDate}</td>
                      <td>{row.truck}</td>
                      <td>{row.units}</td>
                      <td>{row.cartons}</td>
                      <td>{row.pallets}</td>
                      <td>{row.weight}</td>
                      <td>{row.height}</td>
                      <td>{row.freightClass}</td>
                      <td>{row.cube}</td>
                      <td>{row.comments}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="table__empty" colSpan={20}>
                    No packing slips match the current filter.
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
