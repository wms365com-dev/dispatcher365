import type { Shipment } from "@/lib/types";

const freightClassBreaks = [
  { minimumDensity: 0, freightClass: "400" },
  { minimumDensity: 1, freightClass: "300" },
  { minimumDensity: 2, freightClass: "250" },
  { minimumDensity: 3, freightClass: "200" },
  { minimumDensity: 4, freightClass: "175" },
  { minimumDensity: 5, freightClass: "150" },
  { minimumDensity: 6, freightClass: "125" },
  { minimumDensity: 8, freightClass: "110" },
  { minimumDensity: 9, freightClass: "100" },
  { minimumDensity: 10.5, freightClass: "92.5" },
  { minimumDensity: 12, freightClass: "85" },
  { minimumDensity: 13, freightClass: "77.5" },
  { minimumDensity: 15, freightClass: "70" },
  { minimumDensity: 22.5, freightClass: "65" },
  { minimumDensity: 30, freightClass: "60" },
  { minimumDensity: 35, freightClass: "55" },
  { minimumDensity: 50, freightClass: "50" }
];

export function calculateCubeFromDimensions(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  handlingUnits = 1
): number {
  return Number((((lengthIn * widthIn * heightIn) / 1728) * handlingUnits).toFixed(2));
}

export function calculateDensity(weightLb: number, cubeCuFt: number): number {
  if (!cubeCuFt) {
    return 0;
  }

  return Number((weightLb / cubeCuFt).toFixed(2));
}

export function lookupFreightClass(density: number): string {
  if (!density) {
    return "";
  }

  let freightClass = freightClassBreaks[0].freightClass;

  for (const candidate of freightClassBreaks) {
    if (density >= candidate.minimumDensity) {
      freightClass = candidate.freightClass;
    }
  }

  return freightClass;
}

export function buildEmailSubject(customerCode: string, customerPo: string, salesOrder: string): string {
  return `${customerCode} PO ${customerPo} SO ${salesOrder}`;
}

export function buildRfqSubject(customerCode: string, salesOrder: string): string {
  return `RFQ ${customerCode} SO ${salesOrder}`;
}

export function buildBolNumber(
  shipment: Pick<Shipment, "customerCode" | "salesOrder">
): string {
  return `${shipment.customerCode}-${shipment.salesOrder}`;
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshteinDistance(left: string, right: string): number {
  const matrix = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0)
  );

  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function scoreCustomerMatch<T extends { customerCode: string; name: string }>(
  search: string,
  customer: T
): number {
  const normalizedSearch = normalizeSearchText(search);
  const code = normalizeSearchText(customer.customerCode);
  const name = normalizeSearchText(customer.name);

  if (code === normalizedSearch || name === normalizedSearch) {
    return 100;
  }

  if (code.startsWith(normalizedSearch)) {
    return 92;
  }

  if (name.startsWith(normalizedSearch)) {
    return 88;
  }

  if (code.includes(normalizedSearch)) {
    return 80;
  }

  if (name.includes(normalizedSearch)) {
    return 74;
  }

  const bestDistance = Math.min(
    levenshteinDistance(normalizedSearch, code),
    levenshteinDistance(normalizedSearch, name)
  );

  return Math.max(0, 60 - bestDistance * 7);
}

export function findClosestCustomerMatches<T extends { customerCode: string; name: string }>(
  search: string,
  tenantCustomers: T[],
  limit = 5
): T[] {
  const normalizedSearch = normalizeSearchText(search);

  if (!normalizedSearch) {
    return tenantCustomers.slice(0, limit);
  }

  return [...tenantCustomers]
    .map((customer) => ({ customer, score: scoreCustomerMatch(normalizedSearch, customer) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.customer.name.localeCompare(right.customer.name))
    .slice(0, limit)
    .map((entry) => entry.customer);
}
