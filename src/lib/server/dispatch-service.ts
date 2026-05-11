import { prisma } from "@/lib/prisma";
import {
  bolGenerateSchema,
  carrierCreateSchema,
  companyCreateSchema,
  customerCreateSchema,
  deliveryEventCreateSchema,
  driverCreateSchema,
  issueReportCreateSchema,
  issueReportUpdateSchema,
  labelJobCreateSchema,
  outboundEmailSchema,
  productCreateSchema,
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

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://dispatcher365-production.up.railway.app";
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

  const statuses = route.stops.map((stop) => stop.status);

  let status: "DRAFT" | "PUBLISHED" | "IN_TRANSIT" | "COMPLETED" = "DRAFT";

  if (statuses.length && statuses.every((value) => terminalRouteStopStatuses.has(value))) {
    status = "COMPLETED";
  } else if (statuses.some((value) => value !== "PLANNED" && value !== "PUBLISHED")) {
    status = "IN_TRANSIT";
  } else if (statuses.some((value) => value === "PUBLISHED")) {
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
    role: session.activeMembership.role
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

export async function getAppContext() {
  const { tenant, user, role } = await getTenantScope();

  return {
    tenant,
    user,
    role
  };
}

export async function getDashboardData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const [
    shipmentCount,
    customerCount,
    readyForBolCount,
    bolCreatedCount,
    routedCount,
    publishedRouteCount,
    recentShipments
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
    })
  ]);

  return {
    context: { tenant, user },
    metrics: {
      shipmentCount,
      customerCount,
      readyForBolCount,
      bolCreatedCount,
      routedCount,
      publishedRouteCount
    },
    recentShipments
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
          select: { drivers: true, routes: true }
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

  const groupedBills = Array.from(
    bills.reduce((map, bill) => {
      const current = map.get(bill.bolNumber);

      if (current) {
        current.shipments.push(bill.shipment);
        current.billIds.push(bill.id);
        if (bill.updatedAt > current.updatedAt) {
          current.updatedAt = bill.updatedAt;
          current.templateVariant = bill.templateVariant;
          current.freightTerms = bill.freightTerms;
          current.carrierName = bill.carrierName;
        }
      } else {
        map.set(bill.bolNumber, {
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

      return map;
    }, new Map<string, {
      id: string;
      billIds: string[];
      bolNumber: string;
      templateVariant: string;
      freightTerms: string | null;
      carrierName: string | null;
      updatedAt: Date;
      shipments: typeof bills[number]["shipment"][];
    }>())
  )
    .map(([, group]) => ({
      ...group,
      shipments: [...group.shipments].sort((left, right) => left.batchId.localeCompare(right.batchId))
    }))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return {
    context: { tenant, user },
    shipments,
    readyShipments: shipments.filter((shipment) => shipment.status === "READY_FOR_BOL"),
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

  const [memberships, tenants] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: role === "PLATFORM_ADMIN" ? undefined : { tenantId },
      include: {
        tenant: true,
        user: true
      },
      orderBy: [{ createdAt: "asc" }]
    }),
    prisma.tenant.findMany({
      orderBy: [{ name: "asc" }]
    })
  ]);

  return {
    context: { tenant, user, role },
    memberships,
    tenants
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
  const { tenantId, tenant, user } = await getTenantScope();

  const [carriers, drivers, routeCandidates, routes, mobileAlerts] = await Promise.all([
    prisma.carrier.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.driver.findMany({
      where: { tenantId },
      include: { carrier: true },
      orderBy: [{ fullName: "asc" }]
    }),
    prisma.shipment.findMany({
      where: {
        tenantId,
        status: "BOL_CREATED"
      },
      include: {
        customer: true,
        carrier: true
      },
      orderBy: [{ batchId: "asc" }]
    }),
    prisma.routeRun.findMany({
      where: { tenantId },
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
      where: { tenantId },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  return {
    context: { tenant, user },
    carriers,
    drivers,
    routeCandidates,
    routes,
    mobileAlerts,
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

  const totalPallets = routeRun.stops.reduce((sum, stop) => sum + stop.shipment.pallets, 0);
  const totalCartons = routeRun.stops.reduce((sum, stop) => sum + stop.shipment.cartons, 0);
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

export async function getDeliveriesData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const [activeStops, deliveryEvents] = await Promise.all([
    prisma.routeStop.findMany({
      where: {
        tenantId,
        status: {
          in: ["PUBLISHED", "IN_TRANSIT"]
        }
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
      where: { tenantId },
      include: {
        driver: true,
        shipment: {
          include: {
            customer: true
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
    context: { tenant, user },
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
  const normalizedSelection = shipments.map((shipment) => shipment.batchId).sort();
  const existingGroupedNumbers = [...new Set(shipments.map((shipment) => shipment.bol?.bolNumber).filter(Boolean))];
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

  const shipmentIds = shipments.map((shipment) => shipment.id);

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
      data: shipments.map((shipment) => ({
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
    batchIds: shipments.map((shipment) => shipment.batchId)
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
      id: { in: shipments.map((shipment) => shipment.id) }
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
      id: { in: route.stops.map((stop) => stop.shipmentId) }
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

  if (route.driverId) {
    await prisma.mobileAlert.create({
      data: {
        tenantId,
        routeRunId: route.id,
        driverId: route.driverId,
        title: `${tenant.name} route assigned`,
        body: `${route.routeName} has ${route.stops.length} stop${route.stops.length === 1 ? "" : "s"} ready for driver review.`,
        payloadJson: JSON.stringify({
          routeRunId: route.id,
          routeName: route.routeName,
          batchIds: route.stops.map((stop) => stop.shipment.batchId),
          publishedBy: user.email
        }),
        status: "PENDING"
      }
    });
  }

  return updatedRoute;
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

  const shipments = bills.map((bill) => bill.shipment);
  const primaryShipment = shipments[0];
  const subject = `${tenant.name} BOL ${data.bolNumber}`;
  const htmlBody = buildBolEmailHtml({
    tenantName: tenant.name,
    bolNumber: data.bolNumber,
    batchIds: shipments.map((shipment) => shipment.batchId),
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
    batchIds: routeRun.stops.map((stop) => stop.shipment.batchId),
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
      role: data.role
    },
    create: {
      tenantId: targetTenantId,
      userId: user.id,
      role: data.role
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

  const driverId = routeStop?.routeRun.driverId ?? null;
  const eventAt = new Date();
  const routeStopStatus = routeStopStatusFromEvent(data.eventType);
  const shipmentStatus = shipmentStatusFromEvent(data.eventType);

  const deliveryEvent = await prisma.deliveryEvent.create({
    data: {
      tenantId,
      shipmentId: shipment.id,
      routeStopId: routeStop?.id,
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

  return deliveryEvent;
}
