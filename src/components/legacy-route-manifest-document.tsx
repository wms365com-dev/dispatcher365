interface LegacyRouteManifestDocumentProps {
  fileName: string;
  routeDate: string;
  carrierName: string;
  truckCount: string;
  totalPallets: string;
  totalStops: string;
  rows: Array<{
    batchId: string;
    salesOrder: string;
    customerPo: string;
    customerName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    pallets: string;
    cartons: string;
  }>;
}

export function LegacyRouteManifestDocument({
  fileName,
  routeDate,
  carrierName,
  truckCount,
  totalPallets,
  totalStops,
  rows
}: LegacyRouteManifestDocumentProps) {
  return (
    <div className="legacy-manifest-paper">
      <table className="legacy-manifest-table">
        <tbody>
          <tr>
            <td rowSpan={2}>FILE NAME</td>
            <td rowSpan={2} className="legacy-manifest-table__center legacy-manifest-table__strong">
              {carrierName} {totalPallets} PALLETS {totalStops} STOPS
            </td>
            <td className="legacy-manifest-table__center" colSpan={3}>
              RUN
            </td>
          </tr>
          <tr className="legacy-manifest-table__center">
            <td>TRUCK</td>
            <td>PALLETS</td>
            <td>STOPS</td>
          </tr>
          <tr>
            <td>RUN DATE</td>
            <td className="legacy-manifest-table__center">{routeDate}</td>
            <td className="legacy-manifest-table__center">{truckCount}</td>
            <td className="legacy-manifest-table__center">{totalPallets}</td>
            <td className="legacy-manifest-table__center">{totalStops}</td>
          </tr>
        </tbody>
      </table>

      <table className="legacy-manifest-table legacy-manifest-table--detail">
        <thead>
          <tr className="legacy-manifest-table__center">
            <th>BATCH</th>
            <th>SO</th>
            <th>PURCHASE ORDER</th>
            <th>NAME</th>
            <th>ADDRESS</th>
            <th>CITY</th>
            <th>STATE</th>
            <th>ZIPCODE</th>
            <th>PHONE</th>
            <th>PLT</th>
            <th>CTNS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="legacy-manifest-table__center" key={`${fileName}-${row.batchId}`}>
              <td>{row.batchId}</td>
              <td>{row.salesOrder}</td>
              <td>{row.customerPo}</td>
              <td>{row.customerName}</td>
              <td>{row.address}</td>
              <td>{row.city}</td>
              <td>{row.state}</td>
              <td>{row.postalCode}</td>
              <td>{row.phone}</td>
              <td>{row.pallets}</td>
              <td>{row.cartons}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
