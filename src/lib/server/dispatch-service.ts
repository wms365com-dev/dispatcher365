import { prisma } from "@/lib/prisma";
import {
  bolGenerateSchema,
  carrierCreateSchema,
  companyCreateSchema,
  customerCreateSchema,
  deliveryEventCreateSchema,
  driverLocationPingCreateSchema,
  driverCreateSchema,
  issueReportCreateSchema,
  issueReportUpdateSchema,
  labelJobCreateSchema,
  outboundEmailSchema,
  productCreateSchema,
  routeAssignmentDriverSchema,
  routeAssignmentRespondSchema,
  routeAssignmentStartSchema,
  routeCreateSchema,
  routePublishSchema,
  salesRepCreateSchema,
  shipmentCreateSchema,
  userCreateSchema
} from "@/lib/validators";
import {
  buildBolNumber,
  buildVicsBolNumber,
  buildEmailSubject,
  buildRfqSubject,
  calculateDensity,
  findClosestCustomerMatches,
  lookupFreightClass
} from "@/lib/workbook/formulas";

import { requireTenantSession } from "./auth";
import { ensureDemoSeed } from "./demo-seed";
import { emailTransportConfigured, sendLoggedEmail } from "./email";
import { createPasswordHash } from "./password";

function parseDateValue(value?: string) {
  return value ? new Date(value) : undefined;
}

function parseBatchIds(value: string) {
  return [...new Set(value.split(/[,\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))];
}

function normalizeBatchIdInputs(values?: string[]) {
  return [...new Set((values ?? []).flatMap((value) => parseBatchIds(value)))];
}

function trimOrUndefined(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function isAdminRole(role: string) {
  return role === "PLATFORM_ADMIN" || role === "TENANT_ADMIN";
}

function isCarrierRole(role: string) {
  return role === "CARRIER_ADMIN" || role === "CARRIER_DISPATCHER";
}

function isInternalOperationsRole(role: string) {
  return [
    "PLATFORM_ADMIN",
    "TENANT_ADMIN",
    "DISPATCHER",
    "WAREHOUSE",
    "CUSTOMER_SERVICE"
  ].includes(role);
}

function normalizeStatusLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dispatcher365-production.up.railway.app";
}

function formatDateLabel(value: Date) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildBolEmailHtml(input: {
  tenantName: string;
  bolNumber: string;
  batchIds: string[];
  customerName: string;
  carrierName?: string | null;
}) {
  const previewUrl = `${getAppBaseUrl()}/dispatch/bols?generated=${encodeURIComponent(input.bolNumber)}&batchIds=${encodeURIComponent(input.batchIds.join(","))}`;

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #243746; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${escapeHtml(input.tenantName)} Bill of Lading</h2>
      <p style="margin: 0 0 12px;">BOL <strong>${escapeHtml(input.bolNumber)}</strong> was generated for ${escapeHtml(input.customerName)}.</p>
      <ul style="margin: 0 0 14px; padding-left: 20px;">
        <li><strong>Batch IDs:</strong> ${escapeHtml(input.batchIds.join(", "))}</li>
        <li><strong>Carrier:</strong> ${escapeHtml(input.carrierName ?? "Unassigned")}</li>
      </ul>
      <p style="margin: 0 0 14px;">Open the live dispatch preview here:</p>
      <p style="margin: 0;"><a href="${previewUrl}">${previewUrl}</a></p>
    </div>
  `;
}

function buildRouteManifestEmailHtml(input: {
  tenantName: string;
  routeName: string;
  routeDateLabel: string;
  carrierName?: string | null;
  driverName?: string | null;
  stopCount: number;
  batchIds: string[];
  manifestUrl: string;
}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #243746; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${escapeHtml(input.tenantName)} Truck Run Manifest</h2>
      <p style="margin: 0 0 12px;">Route <strong>${escapeHtml(input.routeName)}</strong> is ready for dispatch.</p>
      <ul style="margin: 0 0 14px; padding-left: 20px;">
        <li><strong>Run date:</strong> ${escapeHtml(input.routeDateLabel)}</li>
        <li><strong>Carrier:</strong> ${escapeHtml(input.carrierName ?? "Unassigned")}</li>
        <li><strong>Driver:</strong> ${escapeHtml(input.driverName ?? "Unassigned")}</li>
        <li><strong>Stops:</strong> ${String(input.stopCount)}</li>
        <li><strong>Batches:</strong> ${escapeHtml(input.batchIds.join(", "))}</li>
      </ul>
      <p style="margin: 0 0 14px;">Open the printable manifest here:</p>
      <p style="margin: 0;"><a href="${input.manifestUrl}">${input.manifestUrl}</a></p>
    </div>
  `;
}

const terminalRouteStopStatuses = new Set([
  "DELIVERED",
  "REFUSED",
  "RETURNED",
  "EXCEPTION"
]);

function routeStopStatusFromEvent(eventType: string) {
  switch (eventType) {
    case "IN_TRANSIT":
      return "IN_TRANSIT" as const;
    case "DELIVERED":
    case "PAYMENT_COLLECTED":
      return "DELIVERED" as const;
    case "RETURNED":
      return "RETURNED" as const;
    case "REFUSED":
      return "REFUSED" as const;
    default:
      return "EXCEPTION" as const;
  }
}

function shipmentStatusFromEvent(eventType: string) {
  switch (eventType) {
    case "IN_TRANSIT":
      return "IN_TRANSIT" as const;
    case "DELIVERED":
    case "PAYMENT_COLLECTED":
      return "DELIVERED" as const;
    default:
      return "EXCEPTION" as const;
  }
}

async function syncRouteRunStatus(routeRunId: string) {
  const route = await prisma.routeRun.findUnique({
    where: { id: routeRunId },
    include: {
      stops: {
        select: {
          status: true
        }
      }
    }
  });

  if (!route) {
    return null;
  }

  const statuses = route.stops.map((stop: { status: string }) => stop.status);

  let status: "DRAFT" | "PUBLISHED" | "IN_TRANSIT" | "COMPLETED" = "DRAFT";

  if (statuses.length && statuses.every((value: string) => terminalRouteStopStatuses.has(value))) {
    status = "COMPLETED";
  } else if (statuses.some((value: string) => value !== "PLANNED" && value !== "PUBLISHED")) {
    status = "IN_TRANSIT";
  } else if (statuses.some((value: string) => value === "PUBLISHED")) {
    status = "PUBLISHED";
  }

  return prisma.routeRun.update({
    where: { id: routeRunId },
    data: { status }
  });
}

async function getTenantScope() {
  await ensureDemoSeed();
  const session = await requireTenantSession();

  return {
    tenantId: session.activeTenant.id,
    tenant: session.activeTenant,
    user: session.user,
    role: session.activeMembership.role,
    membership: session.activeMembership
  };
}

async function createUniqueBolNumber(input: {
  tenantId: string;
  gs1CompanyPrefix: string | null | undefined;
  uniqueSeed: string;
  customerCode: string;
  salesOrder?: string | null;
  fallbackBatchId: string;
  reusableShipmentId?: string | null;
}) {
  const {
    tenantId,
    gs1CompanyPrefix,
    uniqueSeed,
    customerCode,
    salesOrder,
    fallbackBatchId,
    reusableShipmentId
  } = input;

  if (gs1CompanyPrefix) {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate =
        buildVicsBolNumber({
          companyPrefix: gs1CompanyPrefix,
          uniqueSeed: `${tenantId}:${uniqueSeed}:${attempt}`
        }) ?? undefined;

      if (!candidate) {
        break;
      }

      const existing = await prisma.billOfLading.findFirst({
        where: {
          tenantId,
          bolNumber: candidate
        }
      });

      if (!existing || (reusableShipmentId && existing.shipmentId === reusableShipmentId)) {
        return candidate;
      }
    }
  }

  const baseNumber = buildBolNumber({
    customerCode,
    salesOrder: salesOrder ?? fallbackBatchId
  });

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const candidate = attempt === 0 ? baseNumber : `${baseNumber}-${attempt + 1}`;
    const existing = await prisma.billOfLading.findFirst({
      where: {
        tenantId,
        bolNumber: candidate
      }
    });

    if (!existing || (reusableShipmentId && existing.shipmentId === reusableShipmentId)) {
      return candidate;
    }
  }

  return `${baseNumber}-${Date.now().toString().slice(-6)}`;
}

async function createUniqueRouteTrackingNumber(input: {
  tenantId: string;
  tenantSlug: string;
  carrierCode: string;
  routeDate: Date;
  routeRunId: string;
}) {
  const base = [
    input.tenantSlug.replace(/[^A-Z0-9]+/gi, "").toUpperCase().slice(0, 4) || "WMS",
    input.carrierCode.replace(/[^A-Z0-9]+/gi, "").toUpperCase().slice(0, 4) || "CAR",
    formatDateLabel(input.routeDate)
  ].join("-");

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const suffix = `${input.routeRunId.replace(/[^A-Z0-9]+/gi, "").toUpperCase().slice(-5)}${attempt}`
      .padStart(6, "0")
      .slice(-6);
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.routeAssignment.findFirst({
      where: {
        tenantId: input.tenantId,
        trackingNumber: candidate
      }
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
}

function getAssignmentWhereForMembership(input: {
  tenantId: string;
  role: string;
  membershipCarrierId?: string | null;
  membershipDriverId?: string | null;
}) {
  if (isCarrierRole(input.role)) {
    return {
      tenantId: input.tenantId,
      carrierId: input.membershipCarrierId ?? "__no-carrier__"
    };
  }

  if (input.role === "DRIVER") {
    return {
      tenantId: input.tenantId,
      driverId: input.membershipDriverId ?? "__no-driver__"
    };
  }

  return {
    tenantId: input.tenantId
  };
}

async function syncRouteAssignmentStatus(routeAssignmentId: string, input?: {
  eventType?: string;
  eventAt?: Date;
}) {
  const assignment = await prisma.routeAssignment.findUnique({
    where: { id: routeAssignmentId },
    include: {
      routeRun: {
        include: {
          stops: {
            select: {
              status: true
            }
          }
        }
      }
    }
  });

  if (!assignment) {
    return null;
  }

  const statuses = assignment.routeRun.stops.map((stop: { status: string }) => stop.status);
  const routeCompleted = statuses.length > 0 && statuses.every((value: string) => terminalRouteStopStatuses.has(value));

  let status = assignment.status;
  const data: Record<string, Date | string | null> = {};

  if (input?.eventType === "IN_TRANSIT") {
    status = "IN_TRANSIT";
    data.startedAt = assignment.startedAt ?? input.eventAt ?? new Date();
  } else if (routeCompleted) {
    status = statuses.some((value: string) => value === "EXCEPTION" || value === "REFUSED" || value === "RETURNED")
      ? "EXCEPTION"
      : "COMPLETED";
    data.completedAt = assignment.completedAt ?? input?.eventAt ?? new Date();
  }

  if (status === assignment.status && !Object.keys(data).length) {
    return assignment;
  }

  return prisma.routeAssignment.update({
    where: { id: routeAssignmentId },
    data: {
      status,
      ...data
    }
  });
}

export async function getAppContext() {
  const { tenant, user, role, membership } = await getTenantScope();

  return {
    tenant,
    user,
    role,
    membership
  };
}

export async function getDashboardData() {
  const { tenantId, tenant, user, role, membership } = await getTenantScope();

  const assignmentWhere = getAssignmentWhereForMembership({
    tenantId,
    role,
    membershipCarrierId: membership.carrierId,
    membershipDriverId: membership.driverId
  });

  const [
    shipmentCount,
    customerCount,
    readyForBolCount,
    bolCreatedCount,
    routedCount,
    publishedRouteCount,
    recentShipments,
    assignmentCount,
    offeredAssignmentCount,
    inTransitAssignmentCount,
    recentAssignments
  ] = await Promise.all([
    prisma.shipment.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.shipment.count({ where: { tenantId, status: "READY_FOR_BOL" } }),
    prisma.shipment.count({ where: { tenantId, status: "BOL_CREATED" } }),
    prisma.shipment.count({ where: { tenantId, status: "ROUTED" } }),
    prisma.routeRun.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.shipment.findMany({
      where: { tenantId },
      include: {
        customer: true,
        carrier: true,
        bol: true
      },
      orderBy: [{ updatedAt: "desc" }, { batchId: "desc" }],
      take: 6
    }),
    prisma.routeAssignment.count({ where: assignmentWhere }),
    prisma.routeAssignment.count({
      where: {
        ...assignmentWhere,
        status: "OFFERED"
      }
    }),
    prisma.routeAssignment.count({
      where: {
        ...assignmentWhere,
        status: "IN_TRANSIT"
      }
    }),
    prisma.routeAssignment.findMany({
      where: assignmentWhere,
      include: {
        carrier: true,
        driver: true,
        routeRun: true
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 6
    })
  ]);

  return {
    context: { tenant, user, role, membership },
    metrics: {
      shipmentCount,
      customerCount,
      readyForBolCount,
      bolCreatedCount,
      routedCount,
      publishedRouteCount
    },
    recentShipments,
    assignmentMetrics: {
      assignmentCount,
      offeredAssignmentCount,
      inTransitAssignmentCount
    },
    recentAssignments
  };
}

export async function getCustomersData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: [{ name: "asc" }]
  });

  return {
    context: { tenant, user },
    customers
  };
}

export async function getCarriersData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const [carriers, drivers] = await Promise.all([
    prisma.carrier.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { drivers: true, routes: true, portalUsers: true, assignments: true }
        }
      },
      orderBy: [{ name: "asc" }]
    }),
    prisma.driver.findMany({
      where: { tenantId },
      include: {
        carrier: true
      },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  return {
    context: { tenant, user },
    carriers,
    drivers
  };
}

export async function getSalesRepsData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const salesReps = await prisma.salesRep.findMany({
    where: { tenantId },
    orderBy: [{ fullName: "asc" }]
  });

  return {
    context: { tenant, user },
    salesReps
  };
}

export async function getCartonInfoData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: [{ sku: "asc" }]
  });

  return {
    context: { tenant, user },
    products
  };
}

export async function getPackingSlipsData(customerLookup?: string) {
  const { tenantId, tenant, user } = await getTenantScope();

  const [customers, carriers, salesReps, products, shipments] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.carrier.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.salesRep.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ fullName: "asc" }]
    }),
    prisma.product.findMany({
      where: { tenantId },
      orderBy: [{ sku: "asc" }]
    }),
    prisma.shipment.findMany({
      where: { tenantId },
      include: {
        customer: true,
        carrier: true,
        bol: true
      },
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  return {
    context: { tenant, user },
    customers,
    carriers,
    salesReps,
    products,
    shipments,
    lookupQuery: customerLookup,
    lookupMatches: customerLookup ? findClosestCustomerMatches(customerLookup, customers, 5) : []
  };
}

export async function getBolsData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const [shipments, bills] = await Promise.all([
    prisma.shipment.findMany({
      where: { tenantId },
      include: {
        customer: {
          include: {
            locations: {
              orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
            }
          }
        },
        carrier: true,
        bol: true
      },
      orderBy: [{ createdAt: "desc" }, { batchId: "desc" }]
    }),
    prisma.billOfLading.findMany({
      where: { tenantId },
      include: {
        shipment: {
          include: {
            customer: {
              include: {
                locations: {
                  orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
                }
              }
            },
            carrier: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  type BillRecord = (typeof bills)[number];
  type GroupedBillRecord = {
    id: string;
    billIds: string[];
    bolNumber: string;
    templateVariant: string;
    freightTerms: string | null;
    carrierName: string | null;
    updatedAt: Date;
    shipments: BillRecord["shipment"][];
  };

  const groupedBillMap = new Map<string, GroupedBillRecord>();

  for (const bill of bills as BillRecord[]) {
    const current = groupedBillMap.get(bill.bolNumber);

    if (current) {
      current.shipments.push(bill.shipment);
      current.billIds.push(bill.id);
      if (bill.updatedAt > current.updatedAt) {
        current.updatedAt = bill.updatedAt;
        current.templateVariant = bill.templateVariant;
        current.freightTerms = bill.freightTerms;
        current.carrierName = bill.carrierName;
      }
      continue;
    }

    groupedBillMap.set(bill.bolNumber, {
      id: bill.id,
      billIds: [bill.id],
      bolNumber: bill.bolNumber,
      templateVariant: bill.templateVariant,
      freightTerms: bill.freightTerms,
      carrierName: bill.carrierName,
      updatedAt: bill.updatedAt,
      shipments: [bill.shipment]
    });
  }

  const groupedBills = [...groupedBillMap.values()]
    .map((group) => ({
      ...group,
      shipments: [...group.shipments].sort((left, right) => left.batchId.localeCompare(right.batchId))
    }))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return {
    context: { tenant, user },
    shipments,
    readyShipments: shipments.filter((shipment: (typeof shipments)[number]) => shipment.status === "READY_FOR_BOL"),
    groupedBills,
    emailConfigured: emailTransportConfigured()
  };
}

export async function getLabelsData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const [shipments, labelJobs] = await Promise.all([
    prisma.shipment.findMany({
      where: { tenantId },
      include: {
        customer: true,
        carrier: true
      },
      orderBy: [{ batchId: "asc" }]
    }),
    prisma.labelJob.findMany({
      where: { tenantId },
      include: {
        shipment: {
          include: {
            customer: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  return {
    context: { tenant, user },
    shipments,
    labelJobs
  };
}

export async function getUsersData() {
  const { tenantId, tenant, user, role } = await getTenantScope();

  const [memberships, tenants, carriers, drivers] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: role === "PLATFORM_ADMIN" ? undefined : { tenantId },
      include: {
        tenant: true,
        user: true,
        carrier: true,
        driver: true
      },
      orderBy: [{ createdAt: "asc" }]
    }),
    prisma.tenant.findMany({
      orderBy: [{ name: "asc" }]
    }),
    prisma.carrier.findMany({
      where: role === "PLATFORM_ADMIN" ? undefined : { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.driver.findMany({
      where: role === "PLATFORM_ADMIN" ? undefined : { tenantId },
      include: {
        carrier: true
      },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  return {
    context: { tenant, user, role },
    memberships,
    tenants,
    carriers,
    drivers
  };
}

export async function getCompaniesData() {
  const { tenantId, tenant, user, role } = await getTenantScope();

  const tenants = await prisma.tenant.findMany({
    where: role === "PLATFORM_ADMIN" ? undefined : { id: tenantId },
    include: {
      _count: {
        select: {
          memberships: true,
          customers: true,
          shipments: true
        }
      }
    },
    orderBy: [{ name: "asc" }]
  });

  return {
    context: { tenant, user, role },
    tenants
  };
}

export async function getIssueReportsData() {
  const { tenantId, tenant, user, role } = await getTenantScope();

  const reports = await prisma.issueReport.findMany({
    where: isAdminRole(role) ? (role === "PLATFORM_ADMIN" ? undefined : { tenantId }) : { tenantId, userId: user.id },
    include: {
      tenant: true,
      user: true
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return {
    context: { tenant, user, role },
    reports
  };
}

export async function getRoutesData(routeIssue?: string) {
  const { tenantId, tenant, user, role, membership } = await getTenantScope();

  const routeRunWhere =
    role === "DRIVER"
      ? {
          tenantId,
          driverId: membership.driverId ?? "__no-driver__"
        }
      : isCarrierRole(role)
        ? {
            tenantId,
            carrierId: membership.carrierId ?? "__no-carrier__"
          }
        : {
            tenantId
          };

  const assignmentWhere = getAssignmentWhereForMembership({
    tenantId,
    role,
    membershipCarrierId: membership.carrierId,
    membershipDriverId: membership.driverId
  });

  const [carriers, drivers, routeCandidates, routes, mobileAlerts, assignments] = await Promise.all([
    prisma.carrier.findMany({
      where:
        isCarrierRole(role)
          ? { id: membership.carrierId ?? "__no-carrier__" }
          : { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.driver.findMany({
      where:
        role === "DRIVER"
          ? { id: membership.driverId ?? "__no-driver__" }
          : isCarrierRole(role)
            ? { tenantId, carrierId: membership.carrierId ?? "__no-carrier__" }
            : { tenantId },
      include: { carrier: true },
      orderBy: [{ fullName: "asc" }]
    }),
    isInternalOperationsRole(role)
      ? prisma.shipment.findMany({
          where: {
            tenantId,
            status: "BOL_CREATED"
          },
          include: {
            customer: true,
            carrier: true
          },
          orderBy: [{ batchId: "asc" }]
        })
      : Promise.resolve([]),
    prisma.routeRun.findMany({
      where: routeRunWhere,
      include: {
        carrier: true,
        driver: true,
        stops: {
          orderBy: [{ stopNumber: "asc" }],
          include: {
            shipment: {
              include: {
                customer: true
              }
            }
          }
        }
      },
      orderBy: [{ routeDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.mobileAlert.findMany({
      where: {
        tenantId,
        ...(role === "DRIVER" ? { driverId: membership.driverId ?? "__no-driver__" } : {})
      },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.routeAssignment.findMany({
      where: assignmentWhere,
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  return {
    context: { tenant, user, role, membership },
    carriers,
    drivers,
    routeCandidates,
    routes,
    mobileAlerts,
    assignments,
    emailConfigured: emailTransportConfigured(),
    routeIssue
  };
}

export async function getRouteManifestData(routeRunId: string) {
  const { tenantId, tenant, user } = await getTenantScope();

  const routeRun = await prisma.routeRun.findFirst({
    where: {
      id: routeRunId,
      tenantId
    },
    include: {
      carrier: true,
      driver: true,
      mobileAlerts: {
        orderBy: [{ createdAt: "desc" }]
      },
      stops: {
        orderBy: [{ stopNumber: "asc" }],
        include: {
          shipment: {
            include: {
              customer: true,
              carrier: true,
              bol: true
            }
          }
        }
      }
    }
  });

  if (!routeRun) {
    return null;
  }

  const totalPallets = routeRun.stops.reduce((sum: number, stop: (typeof routeRun.stops)[number]) => sum + stop.shipment.pallets, 0);
  const totalCartons = routeRun.stops.reduce((sum: number, stop: (typeof routeRun.stops)[number]) => sum + stop.shipment.cartons, 0);
  const totalStops = routeRun.stops.length;
  const totalTrucks = routeRun.truckCount;

  return {
    context: { tenant, user },
    routeRun,
    totalPallets,
    totalCartons,
    totalStops,
    totalTrucks,
    emailConfigured: emailTransportConfigured()
  };
}

export async function getAssignmentsData() {
  const { tenantId, tenant, user, role, membership } = await getTenantScope();

  const assignmentWhere = getAssignmentWhereForMembership({
    tenantId,
    role,
    membershipCarrierId: membership.carrierId,
    membershipDriverId: membership.driverId
  });

  const [assignments, carriers, drivers] = await Promise.all([
    prisma.routeAssignment.findMany({
      where: assignmentWhere,
      include: {
        carrier: true,
        driver: {
          include: {
            carrier: true
          }
        },
        assignedBy: true,
        respondedBy: true,
        locationPings: {
          orderBy: [{ capturedAt: "desc" }],
          take: 3
        },
        routeRun: {
          include: {
            stops: {
              orderBy: [{ stopNumber: "asc" }],
              include: {
                shipment: {
                  include: {
                    customer: true,
                    bol: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ offeredAt: "desc" }]
    }),
    prisma.carrier.findMany({
      where:
        isCarrierRole(role)
          ? { id: membership.carrierId ?? "__no-carrier__" }
          : { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.driver.findMany({
      where:
        role === "DRIVER"
          ? { id: membership.driverId ?? "__no-driver__" }
          : isCarrierRole(role)
            ? { tenantId, carrierId: membership.carrierId ?? "__no-carrier__" }
            : { tenantId },
      include: {
        carrier: true
      },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  return {
    context: { tenant, user, role, membership },
    assignments,
    carriers,
    drivers,
    canRespond: isCarrierRole(role),
    canAssignDriver: isInternalOperationsRole(role) || isCarrierRole(role),
    canTrack:
      isInternalOperationsRole(role) ||
      isCarrierRole(role) ||
      role === "DRIVER"
  };
}

export async function startRouteAssignment(input: unknown) {
  const data = routeAssignmentStartSchema.parse(input);
  const { tenantId, role, membership } = await getTenantScope();

  const assignment = await prisma.routeAssignment.findFirst({
    where: {
      id: data.routeAssignmentId,
      ...getAssignmentWhereForMembership({
        tenantId,
        role,
        membershipCarrierId: membership.carrierId,
        membershipDriverId: membership.driverId
      })
    },
    include: {
      routeRun: {
        include: {
          stops: true
        }
      }
    }
  });

  if (!assignment) {
    return null;
  }

  const now = new Date();
  const activeStopIds = assignment.routeRun.stops
    .filter((stop: (typeof assignment.routeRun.stops)[number]) => stop.status === "PUBLISHED" || stop.status === "PLANNED")
    .map((stop: (typeof assignment.routeRun.stops)[number]) => stop.id);
  const shipmentIds = assignment.routeRun.stops.map(
    (stop: (typeof assignment.routeRun.stops)[number]) => stop.shipmentId
  );

  const updatedAssignment = await prisma.routeAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "IN_TRANSIT",
      startedAt: assignment.startedAt ?? now,
      acceptedAt: assignment.acceptedAt ?? now
    }
  });

  await prisma.routeRun.update({
    where: { id: assignment.routeRunId },
    data: {
      status: "IN_TRANSIT",
      mobileSyncAt: now
    }
  });

  if (activeStopIds.length) {
    await prisma.routeStop.updateMany({
      where: {
        id: { in: activeStopIds }
      },
      data: {
        status: "IN_TRANSIT"
      }
    });
  }

  if (shipmentIds.length) {
    await prisma.shipment.updateMany({
      where: {
        id: { in: shipmentIds }
      },
      data: {
        status: "IN_TRANSIT"
      }
    });
  }

  await syncRouteRunStatus(assignment.routeRunId);

  return updatedAssignment;
}

export async function getDeliveriesData() {
  const { tenantId, tenant, user, role, membership } = await getTenantScope();

  const routeRunScope =
    role === "DRIVER"
      ? { driverId: membership.driverId ?? "__no-driver__" }
      : isCarrierRole(role)
        ? { carrierId: membership.carrierId ?? "__no-carrier__" }
        : {};

  const [activeStops, deliveryEvents] = await Promise.all([
    prisma.routeStop.findMany({
      where: {
        tenantId,
        status: {
          in: ["PUBLISHED", "IN_TRANSIT"]
        },
        routeRun: routeRunScope
      },
      include: {
        routeRun: {
          include: {
            carrier: true,
            driver: true
          }
        },
        shipment: {
          include: {
            customer: true,
            carrier: true,
            bol: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }, { stopNumber: "asc" }]
    }),
    prisma.deliveryEvent.findMany({
      where: {
        tenantId,
        ...(role === "DRIVER" ? { driverId: membership.driverId ?? "__no-driver__" } : {}),
        ...(isCarrierRole(role)
          ? {
              shipment: {
                carrierId: membership.carrierId ?? "__no-carrier__"
              }
            }
          : {})
      },
      include: {
        driver: true,
        shipment: {
          include: {
            customer: true
          }
        },
        routeAssignment: {
          include: {
            carrier: true
          }
        },
        routeStop: {
          include: {
            routeRun: true
          }
        }
      },
      orderBy: [{ eventAt: "desc" }, { createdAt: "desc" }],
      take: 20
    })
  ]);

  return {
    context: { tenant, user, role, membership },
    activeStops,
    deliveryEvents
  };
}

export async function createCustomer(input: unknown) {
  const data = customerCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  const customer = await prisma.customer.create({
    data: {
      tenantId,
      customerCode: data.customerCode,
      name: data.name,
      billingAddress1: data.billingAddress1,
      billingAddress2: data.billingAddress2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone,
      email: data.email,
      comments: data.comments,
      shipCode: data.shipToCode ?? data.customerCode,
      shipName: data.shipToName ?? data.name,
      shipAddress1: data.shipToAddress1 ?? data.billingAddress1,
      shipAddress2: data.shipToAddress2 ?? data.billingAddress2,
      shipCity: data.shipToCity ?? data.city,
      shipState: data.shipToState ?? data.state,
      shipPostalCode: data.shipToPostalCode ?? data.postalCode,
      shipCountry: data.shipToCountry ?? data.country,
      shipPhone: data.shipToPhone ?? data.phone,
      shipEmail: data.shipToEmail ?? data.email,
      freightTerms: data.freightTerms
    }
  });

  await prisma.customerLocation.create({
    data: {
      tenantId,
      customerId: customer.id,
      code: data.shipToCode ?? data.customerCode,
      name: data.shipToName ?? data.name,
      address1: data.shipToAddress1 ?? data.billingAddress1,
      address2: data.shipToAddress2 ?? data.billingAddress2,
      city: data.shipToCity ?? data.city,
      state: data.shipToState ?? data.state,
      postalCode: data.shipToPostalCode ?? data.postalCode,
      country: data.shipToCountry ?? data.country,
      phone: data.shipToPhone ?? data.phone,
      email: data.shipToEmail ?? data.email,
      isDefault: true
    }
  });

  return customer;
}

export async function createCarrier(input: unknown) {
  const data = carrierCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  return prisma.carrier.create({
    data: {
      tenantId,
      carrierCode: data.carrierCode,
      name: data.name,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      scac: data.scac,
      email: data.email,
      phone: data.phone,
      fax: data.fax,
      cell: data.cell,
      contactName: data.contactName,
      website: data.website,
      websitePickup: data.websitePickup,
      isLtl: data.isLtl,
      isFtl: data.isFtl,
      isBroker: data.isBroker
    }
  });
}

export async function createSalesRep(input: unknown) {
  const data = salesRepCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  return prisma.salesRep.create({
    data: {
      tenantId,
      repCode: data.repCode,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone
    }
  });
}

export async function createDriver(input: unknown) {
  const data = driverCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  const carrier = data.carrierCode
    ? await prisma.carrier.findUnique({
        where: {
          tenantId_carrierCode: {
            tenantId,
            carrierCode: data.carrierCode
          }
        }
      })
    : null;

  return prisma.driver.create({
    data: {
      tenantId,
      driverCode: data.driverCode,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      carrierId: carrier?.id
    }
  });
}

export async function createProduct(input: unknown) {
  const data = productCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  return prisma.product.create({
    data: {
      tenantId,
      sku: data.sku,
      description: data.description,
      productLine: data.productLine,
      productType: data.productType,
      packageType: data.packageType,
      nmfcCode: data.nmfcCode,
      defaultWeightLb: data.defaultWeightLb,
      lengthIn: data.lengthIn,
      widthIn: data.widthIn,
      heightIn: data.heightIn,
      casePack: data.casePack,
      volumeCuFt: data.volumeCuFt
    }
  });
}

export async function createShipment(input: unknown) {
  const data = shipmentCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  const [customer, carrier, tenantCustomers] = await Promise.all([
    prisma.customer.findUnique({
      where: {
        tenantId_customerCode: {
          tenantId,
          customerCode: data.customerCode
        }
      }
    }),
    data.carrierCode
      ? prisma.carrier.findUnique({
          where: {
            tenantId_carrierCode: {
              tenantId,
              carrierCode: data.carrierCode
            }
          }
        })
      : Promise.resolve(null),
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }]
    })
  ]);

  if (!customer) {
    return {
      created: false as const,
      lookupQuery: data.customerCode,
      matches: findClosestCustomerMatches(data.customerCode, tenantCustomers, 5)
    };
  }

  const weightLb = data.weightLb ?? data.cartons * 20;
  const cubeCuFt = data.cubeCuFt ?? 0;
  const freightClass =
    trimOrUndefined(data.freightClass) ??
    (cubeCuFt > 0 ? lookupFreightClass(calculateDensity(weightLb, cubeCuFt)) : undefined);

  const shipment = await prisma.shipment.create({
    data: {
      tenantId,
      customerId: customer.id,
      carrierId: carrier?.id,
      batchId: data.batchId,
      customerPo: data.customerPo,
      salesOrder: data.salesOrder,
      salesperson: data.salesperson,
      status: "READY_FOR_BOL",
      shipDate: parseDateValue(data.shipDate),
      cancelDate: parseDateValue(data.cancelDate),
      deliveryDate: parseDateValue(data.deliveryDate),
      deliveryWindow: data.deliveryWindow,
      routeDeskDate: parseDateValue(data.routeDeskDate),
      routedDate: parseDateValue(data.routedDate),
      authorization: data.authorization,
      approvedBy: data.approvedBy,
      approvalNotes: data.approvalNotes,
      scac: data.scac ?? carrier?.scac,
      checkOrCash: data.checkOrCash,
      comments: data.comments,
      codAmount: data.codAmount,
      units: Math.round(data.units),
      cartons: Math.round(data.cartons),
      pallets: Math.round(data.pallets),
      weightLb,
      cubeCuFt,
      heightIn: data.heightIn,
      freightClass,
      department: data.department,
      emailSubject: buildEmailSubject(
        data.customerCode,
        data.customerPo ?? "TBD",
        data.salesOrder ?? data.batchId
      ),
      rfqSubject: buildRfqSubject(data.customerCode, data.salesOrder ?? data.batchId)
    },
    include: {
      customer: true,
      carrier: true
    }
  });

  return {
    created: true as const,
    shipment
  };
}

export async function generateBillOfLading(input: unknown) {
  const data = bolGenerateSchema.parse(input);
  const { tenantId, tenant } = await getTenantScope();

  const batchIds = parseBatchIds(data.batchIds);
  const shipments = await prisma.shipment.findMany({
    where: {
      tenantId,
      batchId: {
        in: batchIds
      }
    },
    include: {
      customer: true,
      carrier: true,
      bol: true
    },
    orderBy: [{ batchId: "asc" }]
  });

  if (!shipments.length) {
    return null;
  }

  const primaryShipment = shipments[0];
  type GeneratedBolShipment = (typeof shipments)[number];
  const normalizedSelection = shipments.map((shipment: GeneratedBolShipment) => shipment.batchId).sort();
  const existingGroupedNumbers = [
    ...new Set(
      shipments
        .map((shipment: GeneratedBolShipment) => shipment.bol?.bolNumber)
        .filter((value: string | null | undefined): value is string => Boolean(value))
    )
  ];
  const reusableSingleShipmentBolNumber =
    shipments.length === 1 ? shipments[0].bol?.bolNumber ?? null : null;

  const bolNumber =
    reusableSingleShipmentBolNumber ??
    (await createUniqueBolNumber({
      tenantId,
      gs1CompanyPrefix: tenant.gs1CompanyPrefix,
      uniqueSeed: `${normalizedSelection.join(":")}:${existingGroupedNumbers.join(":")}:${Date.now()}`,
      customerCode: primaryShipment.customer.customerCode,
      salesOrder: primaryShipment.salesOrder ?? primaryShipment.batchId,
      fallbackBatchId: primaryShipment.batchId,
      reusableShipmentId: shipments.length === 1 ? primaryShipment.id : undefined
    }));

  const shipmentIds = shipments.map((shipment: GeneratedBolShipment) => shipment.id);

  await prisma.$transaction([
    prisma.billOfLading.deleteMany({
      where: {
        tenantId,
        shipmentId: {
          in: shipmentIds
        }
      }
    }),
    prisma.billOfLading.createMany({
      data: shipments.map((shipment: GeneratedBolShipment) => ({
        tenantId,
        shipmentId: shipment.id,
        bolNumber,
        templateVariant: data.template,
        freightTerms: shipment.customer.freightTerms,
        carrierName: shipment.carrier?.name,
        printedAt: null
      }))
    }),
    prisma.shipment.updateMany({
      where: {
        tenantId,
        id: {
          in: shipmentIds
        }
      },
      data: { status: "BOL_CREATED" }
    })
  ]);

  return {
    bolNumber,
    batchIds: shipments.map((shipment: GeneratedBolShipment) => shipment.batchId)
  };
}

export async function createRouteRun(input: unknown) {
  const data = routeCreateSchema.parse(input);
  const { tenantId, user } = await getTenantScope();
  const batchIds = parseBatchIds(data.batchIds);

  const [carrier, driver, shipments] = await Promise.all([
    data.carrierCode
      ? prisma.carrier.findUnique({
          where: {
            tenantId_carrierCode: {
              tenantId,
              carrierCode: data.carrierCode
            }
          }
        })
      : Promise.resolve(null),
    data.driverCode
      ? prisma.driver.findUnique({
          where: {
            tenantId_driverCode: {
              tenantId,
              driverCode: data.driverCode
            }
          }
        })
      : Promise.resolve(null),
    prisma.shipment.findMany({
      where: {
        tenantId,
        batchId: { in: batchIds },
        status: "BOL_CREATED"
      },
      orderBy: [{ batchId: "asc" }]
    })
  ]);

  if (!shipments.length) {
    return null;
  }

  const routeRun = await prisma.routeRun.create({
    data: {
      tenantId,
      routeName: data.routeName,
      routeDate: new Date(data.routeDate),
      carrierId: carrier?.id ?? driver?.carrierId ?? undefined,
      driverId: driver?.id,
      createdById: user.id,
      truckCount: 1,
      status: "DRAFT"
    }
  });

  for (const [index, shipment] of shipments.entries()) {
    await prisma.routeStop.create({
      data: {
        tenantId,
        routeRunId: routeRun.id,
        shipmentId: shipment.id,
        stopNumber: index + 1,
        status: "PLANNED"
      }
    });
  }

  await prisma.shipment.updateMany({
    where: {
      tenantId,
        id: { in: shipments.map((shipment: (typeof shipments)[number]) => shipment.id) }
    },
    data: {
      status: "ROUTED",
      routedDate: new Date(data.routeDate),
      carrierId: carrier?.id ?? driver?.carrierId ?? undefined
    }
  });

  return routeRun;
}

export async function publishRouteRun(input: unknown) {
  const data = routePublishSchema.parse(input);
  const { tenantId, tenant, user } = await getTenantScope();

  const route = await prisma.routeRun.findFirst({
    where: {
      id: data.routeRunId,
      tenantId
    },
    include: {
      carrier: true,
      driver: true,
      stops: {
        include: {
          shipment: true
        }
      }
    }
  });

  if (!route) {
    return null;
  }

  const publishedAt = new Date();

  const updatedRoute = await prisma.routeRun.update({
    where: { id: route.id },
    data: {
      status: "PUBLISHED",
      publishedAt,
      mobileSyncAt: publishedAt
    }
  });

  await prisma.shipment.updateMany({
    where: {
      tenantId,
        id: { in: route.stops.map((stop: (typeof route.stops)[number]) => stop.shipmentId) }
    },
    data: {
      status: "PUBLISHED"
    }
  });

  await prisma.routeStop.updateMany({
    where: {
      tenantId,
      routeRunId: route.id
    },
    data: {
      status: "PUBLISHED"
    }
  });

  let routeAssignmentId: string | undefined;

  if (route.carrierId && route.carrier) {
    const activeStatuses = ["OFFERED", "ACCEPTED", "DRIVER_ASSIGNED", "IN_TRANSIT"] as const;

    await prisma.routeAssignment.updateMany({
      where: {
        tenantId,
        routeRunId: route.id,
        carrierId: {
          not: route.carrierId
        },
        status: {
          in: [...activeStatuses]
        }
      },
      data: {
        status: "REASSIGNED",
        cancelledAt: publishedAt
      }
    });

    const existingAssignment = await prisma.routeAssignment.findFirst({
      where: {
        tenantId,
        routeRunId: route.id,
        carrierId: route.carrierId
      },
      orderBy: [{ updatedAt: "desc" }]
    });

    const routeAssignment =
      existingAssignment
        ? await prisma.routeAssignment.update({
            where: { id: existingAssignment.id },
            data: {
              driverId: route.driverId,
              status:
                route.driverId
                  ? "DRIVER_ASSIGNED"
                  : existingAssignment.status === "ACCEPTED"
                    ? "ACCEPTED"
                    : "OFFERED",
              driverAssignedAt: route.driverId ? publishedAt : existingAssignment.driverAssignedAt,
              notes: existingAssignment.notes ?? `Published from truck run ${route.routeName}`
            }
          })
        : await prisma.routeAssignment.create({
            data: {
              tenantId,
              routeRunId: route.id,
              carrierId: route.carrierId,
              driverId: route.driverId,
              assignedByUserId: user.id,
              trackingNumber: await createUniqueRouteTrackingNumber({
                tenantId,
                tenantSlug: tenant.slug,
                carrierCode: route.carrier.carrierCode,
                routeDate: route.routeDate,
                routeRunId: route.id
              }),
              status: route.driverId ? "DRIVER_ASSIGNED" : "OFFERED",
              acceptedAt: route.driverId ? publishedAt : null,
              driverAssignedAt: route.driverId ? publishedAt : null,
              notes: `Published from truck run ${route.routeName}`
            }
          });

    routeAssignmentId = routeAssignment.id;
  }

  if (route.driverId) {
    await prisma.mobileAlert.create({
      data: {
        tenantId,
        routeRunId: route.id,
        driverId: route.driverId,
        routeAssignmentId,
        title: `${tenant.name} route assigned`,
        body: `${route.routeName} has ${route.stops.length} stop${route.stops.length === 1 ? "" : "s"} ready for driver review.`,
        payloadJson: JSON.stringify({
          routeAssignmentId,
          routeRunId: route.id,
          routeName: route.routeName,
          batchIds: route.stops.map((stop: (typeof route.stops)[number]) => stop.shipment.batchId),
          publishedBy: user.email
        }),
        status: "PENDING"
      }
    });
  }

  return updatedRoute;
}

export async function respondToRouteAssignment(input: unknown) {
  const data = routeAssignmentRespondSchema.parse(input);
  const { tenantId, user, role, membership } = await getTenantScope();

  if (!isCarrierRole(role) && !isInternalOperationsRole(role)) {
    return null;
  }

  const assignment = await prisma.routeAssignment.findFirst({
    where: {
      id: data.routeAssignmentId,
      ...getAssignmentWhereForMembership({
        tenantId,
        role,
        membershipCarrierId: membership.carrierId,
        membershipDriverId: membership.driverId
      })
    }
  });

  if (!assignment) {
    return null;
  }

  const now = new Date();
  return prisma.routeAssignment.update({
    where: { id: assignment.id },
    data: {
      status: data.status,
      respondedByUserId: user.id,
      acceptedAt: data.status === "ACCEPTED" ? (assignment.acceptedAt ?? now) : assignment.acceptedAt,
      declinedAt: data.status === "DECLINED" ? now : null,
      declineReason: data.status === "DECLINED" ? data.declineReason : null
    }
  });
}

export async function assignDriverToRouteAssignment(input: unknown) {
  const data = routeAssignmentDriverSchema.parse(input);
  const { tenantId, user, role, membership } = await getTenantScope();

  if (!isCarrierRole(role) && !isInternalOperationsRole(role)) {
    return null;
  }

  const assignment = await prisma.routeAssignment.findFirst({
    where: {
      id: data.routeAssignmentId,
      tenantId,
      ...(isCarrierRole(role) ? { carrierId: membership.carrierId ?? "__no-carrier__" } : {})
    },
    include: {
      routeRun: {
        include: {
          stops: {
            include: {
              shipment: true
            }
          }
        }
      }
    }
  });

  if (!assignment) {
    return null;
  }

  const driver = await prisma.driver.findUnique({
    where: {
      tenantId_driverCode: {
        tenantId,
        driverCode: data.driverCode
      }
    }
  });

  if (!driver || (assignment.carrierId && driver.carrierId !== assignment.carrierId)) {
    return null;
  }

  const now = new Date();

  const updatedAssignment = await prisma.routeAssignment.update({
    where: { id: assignment.id },
    data: {
      driverId: driver.id,
      status: assignment.status === "IN_TRANSIT" ? "IN_TRANSIT" : "DRIVER_ASSIGNED",
      respondedByUserId: user.id,
      acceptedAt: assignment.acceptedAt ?? now,
      driverAssignedAt: now
    }
  });

  await prisma.routeRun.update({
    where: { id: assignment.routeRunId },
    data: {
      driverId: driver.id,
      mobileSyncAt: now
    }
  });

  await prisma.mobileAlert.create({
    data: {
      tenantId,
      routeRunId: assignment.routeRunId,
      driverId: driver.id,
      routeAssignmentId: assignment.id,
      title: "Load assigned to driver",
      body: `${assignment.routeRun.routeName} is ready for driver dispatch review.`,
      payloadJson: JSON.stringify({
        routeAssignmentId: assignment.id,
        routeRunId: assignment.routeRunId,
        trackingNumber: assignment.trackingNumber,
        batchIds: assignment.routeRun.stops.map((stop: (typeof assignment.routeRun.stops)[number]) => stop.shipment.batchId),
        assignedBy: user.email
      }),
      status: "PENDING"
    }
  });

  return updatedAssignment;
}

export async function recordDriverLocationPing(input: unknown) {
  const data = driverLocationPingCreateSchema.parse(input);
  const { tenantId, role, membership } = await getTenantScope();

  const assignment = await prisma.routeAssignment.findFirst({
    where: {
      id: data.routeAssignmentId,
      tenantId,
      ...(role === "DRIVER" ? { driverId: membership.driverId ?? "__no-driver__" } : {})
    }
  });

  if (!assignment?.driverId) {
    return null;
  }

  const ping = await prisma.driverLocationPing.create({
    data: {
      tenantId,
      routeAssignmentId: assignment.id,
      driverId: assignment.driverId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: data.accuracyMeters,
      speedMph: data.speedMph,
      headingDegrees: data.headingDegrees,
      batteryLevel: data.batteryLevel
    }
  });

  await prisma.routeAssignment.update({
    where: { id: assignment.id },
    data: {
      lastLocationAt: ping.capturedAt,
      status: assignment.status === "COMPLETED" ? assignment.status : "IN_TRANSIT",
      startedAt: assignment.startedAt ?? ping.capturedAt
    }
  });

  return ping;
}

export async function queueLabelJob(input: unknown) {
  const data = labelJobCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  const shipment = await prisma.shipment.findUnique({
    where: {
      tenantId_batchId: {
        tenantId,
        batchId: data.batchId
      }
    }
  });

  if (!shipment) {
    return null;
  }

  return prisma.labelJob.create({
    data: {
      tenantId,
      shipmentId: shipment.id,
      labelKind: data.labelKind,
      templateVariant: data.templateVariant,
      quantity: data.quantity
    }
  });
}

export async function createIssueReport(input: unknown) {
  const data = issueReportCreateSchema.parse(input);
  const { tenantId, user } = await getTenantScope();

  return prisma.issueReport.create({
    data: {
      tenantId,
      userId: user.id,
      pagePath: data.pagePath,
      title: data.title,
      details: data.details
    }
  });
}

export async function updateIssueReport(input: unknown) {
  const data = issueReportUpdateSchema.parse(input);
  const { tenantId, role } = await getTenantScope();

  if (!isAdminRole(role)) {
    return null;
  }

  return prisma.issueReport.updateMany({
    where: {
      id: data.issueReportId,
      tenantId: role === "PLATFORM_ADMIN" ? undefined : tenantId
    },
    data: {
      status: data.status,
      adminNotes: data.adminNotes
    }
  });
}

export async function sendBolEmail(input: unknown) {
  const data = outboundEmailSchema.parse(input);
  const { tenantId, tenant, user } = await getTenantScope();

  if (!data.bolNumber) {
    return null;
  }

  const bills = await prisma.billOfLading.findMany({
    where: {
      tenantId,
      bolNumber: data.bolNumber
    },
    include: {
      shipment: {
        include: {
          customer: true,
          carrier: true
        }
      }
    },
    orderBy: [{ shipment: { batchId: "asc" } }]
  });

  if (!bills.length) {
    return null;
  }

  const shipments = bills.map((bill: (typeof bills)[number]) => bill.shipment);
  const primaryShipment = shipments[0];
  const subject = `${tenant.name} BOL ${data.bolNumber}`;
  const htmlBody = buildBolEmailHtml({
    tenantName: tenant.name,
    bolNumber: data.bolNumber,
    batchIds: shipments.map((shipment: (typeof shipments)[number]) => shipment.batchId),
    customerName: primaryShipment.customer.name,
    carrierName: primaryShipment.carrier?.name ?? bills[0]?.carrierName
  });

  const emailLog = await sendLoggedEmail({
    tenantId,
    userId: user.id,
    toEmail: data.toEmail,
    subject,
    htmlBody
  });

  if (emailLog.status === "SENT") {
    await prisma.billOfLading.updateMany({
      where: {
        tenantId,
        bolNumber: data.bolNumber
      },
      data: {
        emailedAt: emailLog.sentAt ?? new Date()
      }
    });
  }

  return emailLog;
}

export async function sendRouteManifestEmail(input: unknown) {
  const data = outboundEmailSchema.parse(input);
  const { tenantId, tenant, user } = await getTenantScope();

  if (!data.routeRunId) {
    return null;
  }

  const routeRun = await prisma.routeRun.findFirst({
    where: {
      id: data.routeRunId,
      tenantId
    },
    include: {
      carrier: true,
      driver: true,
      stops: {
        orderBy: [{ stopNumber: "asc" }],
        include: {
          shipment: true
        }
      }
    }
  });

  if (!routeRun) {
    return null;
  }

  const manifestUrl = `${getAppBaseUrl()}/dispatch/routes/${routeRun.id}/manifest`;
  const subject = `${tenant.name} truck run ${routeRun.routeName}`;
  const htmlBody = buildRouteManifestEmailHtml({
    tenantName: tenant.name,
    routeName: routeRun.routeName,
    routeDateLabel: routeRun.routeDate.toISOString().slice(0, 10),
    carrierName: routeRun.carrier?.name,
    driverName: routeRun.driver?.fullName,
    stopCount: routeRun.stops.length,
    batchIds: routeRun.stops.map((stop: (typeof routeRun.stops)[number]) => stop.shipment.batchId),
    manifestUrl
  });

  return sendLoggedEmail({
    tenantId,
    userId: user.id,
    routeRunId: routeRun.id,
    toEmail: data.toEmail,
    subject,
    htmlBody
  });
}

export async function createUserAccount(input: unknown) {
  const data = userCreateSchema.parse(input);
  const { tenantId, role } = await getTenantScope();

  const targetTenantId =
    role === "PLATFORM_ADMIN" && data.tenantSlug
      ? (
          await prisma.tenant.findUnique({
            where: { slug: data.tenantSlug }
          })
        )?.id ?? tenantId
      : tenantId;

  const [carrier, driver] = await Promise.all([
    data.carrierCode
      ? prisma.carrier.findUnique({
          where: {
            tenantId_carrierCode: {
              tenantId: targetTenantId,
              carrierCode: data.carrierCode
            }
          }
        })
      : Promise.resolve(null),
    data.driverCode
      ? prisma.driver.findUnique({
          where: {
            tenantId_driverCode: {
              tenantId: targetTenantId,
              driverCode: data.driverCode
            }
          }
        })
      : Promise.resolve(null)
  ]);

  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      fullName: data.fullName,
      passwordHash: createPasswordHash(data.password)
    },
    create: {
      email: data.email,
      fullName: data.fullName,
      passwordHash: createPasswordHash(data.password)
    }
  });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: targetTenantId,
        userId: user.id
      }
    },
    update: {
      role: data.role,
      carrierId: carrier?.id,
      driverId: driver?.id,
      isPortalAccess: isCarrierRole(data.role) || data.role === "DRIVER"
    },
    create: {
      tenantId: targetTenantId,
      userId: user.id,
      role: data.role,
      carrierId: carrier?.id,
      driverId: driver?.id,
      isPortalAccess: isCarrierRole(data.role) || data.role === "DRIVER"
    }
  });

  return user;
}

export async function createCompany(input: unknown) {
  const data = companyCreateSchema.parse(input);
  const { user } = await getTenantScope();

  const tenant = await prisma.tenant.create({
    data: {
      slug: data.slug,
      name: data.name,
      gs1CompanyPrefix: data.gs1CompanyPrefix,
      warehouseName: data.warehouseName,
      warehouseAddress1: data.warehouseAddress1,
      warehouseAddress2: data.warehouseAddress2,
      warehouseCity: data.warehouseCity,
      warehouseState: data.warehouseState,
      warehousePostalCode: data.warehousePostalCode,
      warehouseCountry: data.warehouseCountry,
      warehousePhone: data.warehousePhone,
      warehouseFob: data.warehouseFob
    }
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: "TENANT_ADMIN"
    }
  });

  return tenant;
}

export async function recordDeliveryEvent(input: unknown) {
  const data = deliveryEventCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  const shipment = await prisma.shipment.findUnique({
    where: {
      tenantId_batchId: {
        tenantId,
        batchId: data.batchId
      }
    },
    include: {
      carrier: true
    }
  });

  if (!shipment) {
    return null;
  }

  const routeStop = await prisma.routeStop.findFirst({
    where: {
      tenantId,
      shipmentId: shipment.id
    },
    include: {
      routeRun: true
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  const routeAssignment = routeStop
    ? await prisma.routeAssignment.findFirst({
        where: {
          tenantId,
          routeRunId: routeStop.routeRunId
        },
        orderBy: [{ updatedAt: "desc" }]
      })
    : null;

  const driverId = routeAssignment?.driverId ?? routeStop?.routeRun.driverId ?? null;
  const eventAt = new Date();
  const routeStopStatus = routeStopStatusFromEvent(data.eventType);
  const shipmentStatus = shipmentStatusFromEvent(data.eventType);

  const deliveryEvent = await prisma.deliveryEvent.create({
    data: {
      tenantId,
      shipmentId: shipment.id,
      routeStopId: routeStop?.id,
      routeAssignmentId: routeAssignment?.id,
      driverId,
      eventType: data.eventType,
      eventAt,
      recipientName: data.recipientName,
      note: data.note,
      codAmount: data.codAmount,
      paymentType: data.paymentType,
      proofPhotoUrl: data.proofPhotoUrl,
      proofSignatureUrl: data.proofSignatureUrl
    }
  });

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: shipmentStatus
    }
  });

  if (routeStop) {
    await prisma.routeStop.update({
      where: { id: routeStop.id },
      data: {
        status: routeStopStatus,
        deliveredAt: routeStopStatus === "DELIVERED" ? eventAt : routeStop.deliveredAt,
        notes: data.note ?? routeStop.notes
      }
    });

    await syncRouteRunStatus(routeStop.routeRunId);
  }

  if (routeAssignment) {
    await syncRouteAssignmentStatus(routeAssignment.id, {
      eventType: data.eventType,
      eventAt
    });
  }

  return deliveryEvent;
}
