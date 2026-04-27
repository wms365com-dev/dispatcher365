import type { ReactNode } from "react";

interface Column<Row extends Record<string, ReactNode>> {
  key: keyof Row;
  label: string;
}

interface SimpleTableProps<Row extends Record<string, ReactNode>> {
  columns: Array<Column<Row>>;
  rows: Row[];
  emptyMessage?: string;
}

export function SimpleTable<Row extends Record<string, ReactNode>>({
  columns,
  rows,
  emptyMessage = "No records yet."
}: SimpleTableProps<Row>) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={String(column.key)}>{row[column.key]}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="table__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
