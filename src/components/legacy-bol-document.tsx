import type { ReactNode } from "react";

interface LegacyBolDocumentProps {
  currentDateLabel: string;
  tenantName: string;
  shipFromAddress: string;
  shipFromCityStateZip: string;
  shipFromPhone: string;
  bolNumber: string;
  authorization: string;
  carrierName: string;
  scac: string;
  trailerNumber: string;
  sealNumber: string;
  customerCode: string;
  shipToName: string;
  shipToAddress: string;
  shipToCityStateZip: string;
  shipToPhone: string;
  thirdPartyName: string;
  thirdPartyAddress: string;
  thirdPartyCityStateZip: string;
  freightPrepaid: boolean;
  freightCollect: boolean;
  freightThirdParty: boolean;
  deliveryDate: string;
  approvedBy: string;
  checkOrCash: string;
  receivingHours: string;
  codInlineAmount: string;
  codLargeAmount: string;
  carrierRows: Array<{
    customerPo: string;
    cartons: string;
    weight: string;
    salesOrder: string;
    department: string;
    batchId: string;
    pallets: string;
  }>;
  totalCartons: string;
  totalWeight: string;
  totalPallets: string;
  commodity: string;
  nmfcCode: string;
  customerComments: string;
}

interface LegacyBolPageProps {
  props: LegacyBolDocumentProps;
  rows: LegacyBolDocumentProps["carrierRows"];
}

const CARRIER_ROWS_PER_PAGE = 6;

function chunkCarrierRows(rows: LegacyBolDocumentProps["carrierRows"]) {
  if (!rows.length) {
    return [[]];
  }

  const chunks: LegacyBolDocumentProps["carrierRows"][] = [];

  for (let index = 0; index < rows.length; index += CARRIER_ROWS_PER_PAGE) {
    chunks.push(rows.slice(index, index + CARRIER_ROWS_PER_PAGE));
  }

  return chunks;
}

function InlineCheck({ checked }: { checked: boolean }) {
  return <span className="legacy-bol-inline-box">{checked ? "x" : ""}</span>;
}

function OutlineSquare() {
  return <span className="legacy-bol-outline-square" aria-hidden="true" />;
}

function AddressRow({
  label,
  value,
  bold = false,
  fontSize = "9pt"
}: {
  label: string;
  value: string;
  bold?: boolean;
  fontSize?: string;
}) {
  return (
    <td width="50%">
      <div style={{ width: "30%", float: "left", fontSize: "8pt" }}>{label}</div>
      <div
        style={{
          width: "70%",
          float: "left",
          fontWeight: bold ? 700 : 400,
          fontSize
        }}
      >
        {value}
      </div>
    </td>
  );
}

function RightLabel({ children }: { children: ReactNode }) {
  return (
    <td width="25%" style={{ fontSize: "8pt" }}>
      {children}
    </td>
  );
}

function LegacyBolPage({ props, rows }: LegacyBolPageProps) {
  return (
    <div className="legacy-bol-paper">
      <table className="legacy-bol-tabledata legacy-bol-noborder">
        <tbody>
          <tr>
            <td width="30%">Date: {props.currentDateLabel}</td>
            <td style={{ fontSize: "12pt", textAlign: "center" }}>
              <strong>BILL OF LADING</strong>
            </td>
            <td width="30%"></td>
          </tr>
        </tbody>
      </table>

      <table className="legacy-bol-tabledata">
        <tbody>
          <tr>
            <td
              className="legacy-bol-bg"
              width="50%"
              style={{ color: "white", fontWeight: "bold", fontSize: "8pt", position: "relative", textAlign: "center" }}
            >
              <span>SHIP FROM</span>
            </td>
            <RightLabel>Bill of Lading Number:</RightLabel>
            <td width="25%">{props.bolNumber}</td>
          </tr>
          <tr>
            <AddressRow bold fontSize="10pt" label=" Name:" value={props.tenantName} />
            <RightLabel>AUTHORIZATION NUMBER</RightLabel>
            <td width="25%">{props.authorization}</td>
          </tr>
          <tr>
            <AddressRow label=" Address:" value={props.shipFromAddress} />
            <RightLabel>CARRIER NAME:</RightLabel>
            <td width="25%">{props.carrierName}</td>
          </tr>
          <tr>
            <AddressRow label=" City/State/Zip:" value={props.shipFromCityStateZip} />
            <RightLabel>SCAC:</RightLabel>
            <td width="25%">{props.scac}</td>
          </tr>
          <tr>
            <td width="50%">
              <div style={{ width: "30%", float: "left", fontSize: "8pt" }}> SID#:</div>
              <div style={{ width: "70%", float: "left" }}>
                TEL: {props.shipFromPhone} &nbsp;&nbsp;FOB: <OutlineSquare />
              </div>
            </td>
            <RightLabel>Trailer Number:</RightLabel>
            <td width="25%">{props.trailerNumber}</td>
          </tr>

          <tr>
            <td
              className="legacy-bol-bg"
              width="50%"
              style={{ color: "white", fontWeight: "bold", fontSize: "8pt", position: "relative", textAlign: "center" }}
            >
              <span>SHIP TO</span>
            </td>
            <RightLabel>Seal Number(s):</RightLabel>
            <td width="25%">{props.sealNumber}</td>
          </tr>
          <tr>
            <AddressRow bold fontSize="10pt" label=" Name:" value={props.shipToName} />
            <RightLabel>Customer Code</RightLabel>
            <td width="25%">{props.customerCode}</td>
          </tr>
          <tr>
            <AddressRow label=" Address:" value={props.shipToAddress} />
            <td colSpan={2}></td>
          </tr>
          <tr>
            <AddressRow label=" City/State/Zip:" value={props.shipToCityStateZip} />
            <td colSpan={2} rowSpan={2}></td>
          </tr>
          <tr>
            <td width="50%">
              <div style={{ width: "30%", float: "left", fontSize: "8pt" }}> SID#:</div>
              <div style={{ width: "70%", float: "left" }}>TEL: {props.shipToPhone}</div>
            </td>
          </tr>

          <tr>
            <td
              className="legacy-bol-bg"
              width="50%"
              style={{ color: "white", fontWeight: "bold", fontSize: "8pt", position: "relative", textAlign: "center" }}
            >
              <span>THIRD PARTY FREIGHT CHARGES BILL TO</span>
            </td>
            <td colSpan={2} rowSpan={4}></td>
          </tr>
          <tr>
            <AddressRow bold fontSize="10pt" label=" Name:" value={props.thirdPartyName} />
          </tr>
          <tr>
            <AddressRow label=" Address:" value={props.thirdPartyAddress} />
          </tr>
          <tr>
            <AddressRow label=" City/State/Zip:" value={props.thirdPartyCityStateZip} />
          </tr>
        </tbody>
      </table>

      <table className="legacy-bol-tabledata" style={{ fontSize: "8pt" }}>
        <tbody>
          <tr>
            <td width="18%"></td>
            <td style={{ textAlign: "center" }}></td>
            <td width="18%">&nbsp;</td>
            <td rowSpan={2} width="50%">
              <span style={{ fontSize: "8pt" }}>Freight Charge Terms:</span>
              <span style={{ fontSize: "6pt" }}> (freight charges are prepaid unless marked otherwise)</span>
              <br />
              <div style={{ marginTop: "5px" }}>
                <div style={{ width: "33%", float: "left" }}>
                  <span style={{ fontSize: "8pt", float: "left" }}>Prepaid</span>
                  <span style={{ float: "right", marginRight: "50px" }}>
                    <InlineCheck checked={props.freightPrepaid} />
                  </span>
                </div>
                <div style={{ width: "33%", float: "left" }}>
                  <span style={{ fontSize: "8pt", float: "left" }}>Collect</span>
                  <span style={{ float: "right", marginRight: "50px" }}>
                    <InlineCheck checked={props.freightCollect} />
                  </span>
                </div>
                <div style={{ width: "33%", float: "left" }}>
                  <span style={{ fontSize: "8pt", float: "left" }}>3rd Party</span>
                  <span style={{ float: "right", marginRight: "50px" }}>
                    <InlineCheck checked={props.freightThirdParty} />
                  </span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td width="18%">DELVERY DATE:</td>
            <td style={{ textAlign: "center" }}>{props.deliveryDate}</td>
            <td style={{ textAlign: "center" }} width="18%">
              SPECIAL INSTRUCTIONS
            </td>
          </tr>
          <tr>
            <td>APPROVED BY:</td>
            <td style={{ textAlign: "center" }}>{props.approvedBy}</td>
            <td style={{ textAlign: "center" }}>{props.checkOrCash}</td>
            <td rowSpan={2} width="50%">
              <div style={{ width: "100%", textAlign: "center", float: "left", fontSize: "8pt" }}>
                Master Bill of Lading with attached
              </div>
              <div style={{ float: "left", width: "30%", fontSize: "6pt", paddingTop: "10px", textAlign: "center" }}>
                (check box)
              </div>
              <div style={{ float: "left", width: "70%", fontSize: "9pt", paddingTop: "5px" }}>
                underlying Bills of Lading
              </div>
            </td>
          </tr>
          <tr>
            <td>RECEIVING HOURS:</td>
            <td style={{ textAlign: "center" }}>{props.receivingHours}</td>
            <td style={{ textAlign: "center" }}>{props.codInlineAmount}</td>
          </tr>
        </tbody>
      </table>

      <table className="legacy-bol-tabledata">
        <tbody>
          <tr>
            <td
              colSpan={9}
              className="legacy-bol-bg"
              width="100%"
              style={{ color: "white", fontWeight: "bold", fontSize: "8pt", position: "relative", textAlign: "center" }}
            >
              <span>CARRIER INFORMATION</span>
            </td>
          </tr>
          <tr style={{ fontSize: "8pt", textAlign: "center" }}>
            <td rowSpan={2} style={{ fontWeight: "bold", fontSize: "8pt" }}>
              CUSTOMER ORDER NO.
            </td>
            <td rowSpan={2}># PKGS</td>
            <td rowSpan={2}>WEIGHT</td>
            <td rowSpan={2} colSpan={2}>
              PALLETS / SLIP <br />
              (circle one)
            </td>
            <td colSpan={3} style={{ fontWeight: "bold" }}>
              ADDITIONAL SHIPPER INFORMATION
            </td>
          </tr>
          <tr style={{ fontWeight: "bold", fontSize: "8pt", textAlign: "center" }}>
            <td>HDS SALES ORDER NUMBER</td>
            <td>DEPT #</td>
            <td>BATCH ID</td>
          </tr>
          {rows.map((row) => (
            <tr key={row.batchId} style={{ fontWeight: "bold", textAlign: "center" }}>
              <td>{row.customerPo}</td>
              <td>{row.cartons}</td>
              <td>{row.weight}</td>
              <td>Y</td>
              <td>N</td>
              <td>{row.salesOrder}</td>
              <td>{row.department}</td>
              <td>{row.batchId}</td>
            </tr>
          ))}
          <tr style={{ textAlign: "center" }}>
            <td>GRAND TOTAL</td>
            <td style={{ fontWeight: "bold" }}>{props.totalCartons}</td>
            <td style={{ fontWeight: "bold" }}>{props.totalWeight}</td>
            <td colSpan={5} className="legacy-bol-grey-cell"></td>
          </tr>
        </tbody>
      </table>

      <table className="legacy-bol-tabledata">
        <tbody>
          <tr>
            <td
              colSpan={9}
              className="legacy-bol-bg"
              width="100%"
              style={{ color: "white", fontWeight: "bold", fontSize: "8pt", position: "relative", textAlign: "center" }}
            >
              <span>CUSTOMER ORDER INFORMATION</span>
            </td>
          </tr>
          <tr style={{ fontSize: "8pt", textAlign: "center" }}>
            <td colSpan={2}>HANDLING UNIT</td>
            <td colSpan={2}>PACKAGE</td>
            <td rowSpan={2}>WEIGHT</td>
            <td rowSpan={2}>
              HM
              <br /> (X)
            </td>
            <td width="40%">COMMODITY DESCRIPTION</td>
            <td colSpan={2}>LTL ONLY</td>
          </tr>
          <tr style={{ fontSize: "8pt", textAlign: "center" }}>
            <td>QTY</td>
            <td>TYPE</td>
            <td>QTY</td>
            <td>TYPE</td>
            <td style={{ fontSize: "5pt" }}>
              Commodities requiring special or additional care or attention in handling or stowing must be so marked and
              packaged as ensure sage transportation with ordinary care. See Section 2(e) of NMFC Item 360
            </td>
            <td>NMFC #</td>
            <td width="12%">CLASS</td>
          </tr>
          <tr style={{ textAlign: "center" }}>
            <td>{props.totalPallets}</td>
            <td>PLT</td>
            <td>{props.totalCartons}</td>
            <td>CTN</td>
            <td>{props.totalWeight}</td>
            <td></td>
            <td>{props.commodity}</td>
            <td>{props.nmfcCode}</td>
            <td></td>
          </tr>
          <tr style={{ textAlign: "center" }}>
            <td>{props.totalPallets}</td>
            <td className="legacy-bol-grey-cell"></td>
            <td>{props.totalCartons}</td>
            <td className="legacy-bol-grey-cell"></td>
            <td>{props.totalWeight}</td>
            <td className="legacy-bol-grey-cell"></td>
            <td style={{ fontSize: "8pt" }}>GRAND TOTAL</td>
            <td className="legacy-bol-grey-cell"></td>
            <td className="legacy-bol-grey-cell"></td>
          </tr>
        </tbody>
      </table>

      <table className="legacy-bol-tabledata">
        <tbody>
          <tr>
            <td style={{ fontSize: "6pt", lineHeight: "12pt", verticalAlign: "top" }} width="50%">
              Where the rate is dependent on value, shippers are required to state specifically in writing the agreed or
              declared value of the property as follows: "The agreed or declared value of the property is specifically stated
              by the shipper to be not exceeding ____________ per ____________"
            </td>
            <td style={{ verticalAlign: "middle" }}>
              <div style={{ width: "100%", float: "left" }}>
                <div style={{ float: "left", width: "30%", fontSize: "8pt", textAlign: "right", paddingTop: "4px" }}>
                  COD Amount $
                </div>
                <div
                  style={{ float: "left", width: "70%", fontSize: "12pt", fontWeight: "bold", paddingLeft: "20px" }}
                >
                  $ {props.codLargeAmount}
                </div>
              </div>
              <div style={{ width: "100%", float: "left", paddingTop: "4px" }}>
                <div style={{ float: "left", width: "30%", fontSize: "8pt", textAlign: "right" }}>Fee Terms:</div>
                <div style={{ float: "left", width: "30%", fontSize: "8pt", paddingLeft: "20px" }}>
                  Collect:<span style={{ marginLeft: "20px" }}><OutlineSquare /></span>
                </div>
                <div style={{ float: "left", width: "30%", fontSize: "8pt", paddingLeft: "20px" }}>
                  Prepaid:<span style={{ marginLeft: "20px" }}><OutlineSquare /></span>
                </div>
              </div>
              <div style={{ width: "100%", float: "left", paddingTop: "4px" }}>
                <div style={{ float: "left", width: "30%", fontSize: "8pt", textAlign: "right" }}>&nbsp;</div>
                <div style={{ float: "left", width: "70%", fontSize: "8pt", paddingLeft: "20px" }}>
                  Customer check acceptable:<span style={{ marginLeft: "20px" }}><OutlineSquare /></span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ fontSize: "8pt" }} width="100%">
              NOTE: Liability Limitation for loss or damage in this shipment may be applicable. See 49 U.S.C. -
              14706(c)(1)(A) and (B).
            </td>
          </tr>
          <tr>
            <td style={{ fontSize: "6pt", lineHeight: "12pt", verticalAlign: "top" }} width="50%">
              RECEIVED, subject to individually determined rates or contracts that have been agreed upon in writing between
              the carrier and shipper, otherwixe to the rates, classifications and rules that have been established by the
              carrier and are available to the shipper, on request, and to all applicable state and federal regulations.
            </td>
            <td style={{ verticalAlign: "top" }}>
              <div style={{ width: "100%", fontSize: "6pt", textAlign: "center", float: "left", marginBottom: "30px" }}>
                The carrier shall not make delivery of this shipment withour payment of freight and all other lawful charges.
              </div>
              <div style={{ width: "70%", borderBottom: "1px solid black", float: "left" }}>&nbsp;</div>
              <div style={{ width: "30%", fontSize: "8pt", float: "left", paddingTop: "6px", paddingLeft: "10px" }}>
                Shipper Signature
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="legacy-bol-tabledata">
        <tbody>
          <tr>
            <td style={{ fontSize: "8pt", verticalAlign: "top" }} width="33%">
              <div style={{ width: "100%", textAlign: "center", fontWeight: "bold" }}>SHIPPER SIGNATURE / SHIP DATE</div>
              <div style={{ width: "100%", fontSize: "6pt", lineHeight: "12pt" }}>
                This is to certify that the above named materials are properly classified, packaged, marked and labeled, and
                are in proper condition for transportation according to the applicable regulations of the DOT.
              </div>
            </td>
            <td style={{ verticalAlign: "top" }} width="33%">
              <div style={{ width: "100%", float: "left", fontSize: "6pt", paddingLeft: "10px", lineHeight: "12pt" }}>
                <div style={{ width: "40%", float: "left" }}>
                  <u style={{ fontSize: "8pt" }}>Trailer Loaded</u>
                  <p>
                    <OutlineSquare /> By Shipper
                  </p>
                  <p>
                    <OutlineSquare /> By Driver
                  </p>
                </div>
                <div style={{ width: "60%", float: "left" }}>
                  <u style={{ fontSize: "8pt" }}>Freight Counted</u>
                  <p>
                    <OutlineSquare /> By Shipper
                  </p>
                  <p>
                    <OutlineSquare /> By Driver/pallets said to contain
                  </p>
                  <p>
                    <OutlineSquare /> By Driver/Pieces
                  </p>
                </div>
              </div>
            </td>
            <td style={{ verticalAlign: "top" }} width="33%">
              <div style={{ width: "100%", textAlign: "center", fontWeight: "bold", fontSize: "8pt" }}>
                CARRIER SIGNATURE / PICKUP DATE
              </div>
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "10pt",
                  padding: "25px",
                  color: "#bcbcbc"
                }}
              >
                DRIVER
              </div>
              <div style={{ width: "100%", textAlign: "center", fontWeight: "bold", fontSize: "8pt" }}>
                _____________________/________
              </div>
            </td>
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{ fontSize: "10pt", fontWeight: "bold", textAlign: "center", verticalAlign: "middle" }}
            >
              {props.customerComments}
            </td>
            <td style={{ verticalAlign: "top" }}>
              <div style={{ width: "100%", textAlign: "center", fontWeight: "bold", fontSize: "8pt" }}>
                RECEIVER SIGNATURE / DELIVERY DATE
              </div>
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "10pt",
                  padding: "25px",
                  color: "#bcbcbc"
                }}
              >
                RECEIVER
              </div>
              <div style={{ width: "100%", textAlign: "center", fontWeight: "bold", fontSize: "8pt" }}>
                _____________________/________
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function LegacyBolDocument(props: LegacyBolDocumentProps) {
  const pages = chunkCarrierRows(props.carrierRows);

  return (
    <div className="legacy-bol-stack">
      {pages.map((rows, index) => (
        <LegacyBolPage key={`${props.bolNumber}-${index + 1}`} props={props} rows={rows} />
      ))}
    </div>
  );
}
