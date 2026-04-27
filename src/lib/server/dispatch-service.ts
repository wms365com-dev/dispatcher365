import { prisma } from "@/lib/prisma";
import {
  bolGenerateSchema,
  carrierCreateSchema,
  customerCreateSchema,
  deliveryEventCreateSchema,
  driverCreateSchema,
  routeCreateSchema,
  routePublishSchema,
  shipmentCreateSchema
} from "@/lib/validators";
import {
  buildBolNumber,
  buildEmailSubject,
  buildRfqSubject,
  calculateDensity,
  findClosestCustomerMatches,
  lookupFreightClass
} from "@/lib/workbook/formulas";

import { requireTenantSession } from "./auth";
import { ensureDemoSeed } from "./demo-seed";

function parseDateValue(value?: string) {
  return value ? new Date(value) : undefined;
}

function parseBatchIds(value: string) {
  return [...new Set(value.split(/[,\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))];
}

function trimOrUndefined(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
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

async function createUniqueBolNumber(
  tenantId: string,
  shipmentId: string,
  batchId: string,
  customerCode: string,
  salesOrder?: string | null
) {
  const baseNumber = buildBolNumber({
    customerCode,
    salesOrder: salesOrder ?? batchId
  });

  const existing = await prisma.billOfLading.findFirst({
    where: {
      tenantId,
      bolNumber: baseNumber
    }
  });

  if (!existing || existing.shipmentId === shipmentId) {
    return baseNumber;
  }

  return `${baseNumber}-${batchId}`;
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

export async function getPackingSlipsData(customerLookup?: string) {
  const { tenantId, tenant, user } = await getTenantScope();

  const [customers, carriers, shipments] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.carrier.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }]
    }),
    prisma.shipment.findMany({
      where: { tenantId },
      include: {
        customer: true,
        carrier: true,
        bol: true
      },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  return {
    context: { tenant, user },
    customers,
    carriers,
    shipments,
    lookupQuery: customerLookup,
    lookupMatches: customerLookup ? findClosestCustomerMatches(customerLookup, customers, 5) : []
  };
}

export async function getBolsData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const [readyShipments, bills] = await Promise.all([
    prisma.shipment.findMany({
      where: {
        tenantId,
        status: "READY_FOR_BOL"
      },
      include: {
        customer: true,
        carrier: true
      },
      orderBy: [{ batchId: "asc" }]
    }),
    prisma.billOfLading.findMany({
      where: { tenantId },
      include: {
        shipment: {
          include: {
            customer: true,
            carrier: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  return {
    context: { tenant, user },
    readyShipments,
    bills
  };
}

export async function getLabelsData() {
  const { tenantId, tenant, user } = await getTenantScope();

  const labelJobs = await prisma.labelJob.findMany({
    where: { tenantId },
    include: {
      shipment: {
        include: {
          customer: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return {
    context: { tenant, user },
    labelJobs
  };
}

export async function getRoutesData(routeIssue?: string) {
  const { tenantId, tenant, user } = await getTenantScope();

  const [carriers, drivers, routeCandidates, routes] = await Promise.all([
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
    })
  ]);

  return {
    context: { tenant, user },
    carriers,
    drivers,
    routeCandidates,
    routes,
    routeIssue
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

  return prisma.customer.create({
    data: {
      tenantId,
      customerCode: data.customerCode,
      name: data.name,
      billingAddress1: data.billingAddress1,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone,
      email: data.email,
      freightTerms: data.freightTerms
    }
  });
}

export async function createCarrier(input: unknown) {
  const data = carrierCreateSchema.parse(input);
  const { tenantId } = await getTenantScope();

  return prisma.carrier.create({
    data: {
      tenantId,
      carrierCode: data.carrierCode,
      name: data.name,
      scac: data.scac,
      email: data.email,
      phone: data.phone,
      contactName: data.contactName,
      isLtl: data.isLtl,
      isFtl: data.isFtl,
      isBroker: data.isBroker
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
      deliveryDate: parseDateValue(data.deliveryDate),
      deliveryWindow: data.deliveryWindow,
      comments: data.comments,
      cartons: data.cartons,
      pallets: data.pallets,
      weightLb,
      cubeCuFt,
      freightClass,
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
  const { tenantId } = await getTenantScope();

  const shipment = await prisma.shipment.findUnique({
    where: {
      tenantId_batchId: {
        tenantId,
        batchId: data.batchId
      }
    },
    include: {
      customer: true,
      carrier: true
    }
  });

  if (!shipment) {
    return null;
  }

  const bolNumber = await createUniqueBolNumber(
    tenantId,
    shipment.id,
    shipment.batchId,
    shipment.customer.customerCode,
    shipment.salesOrder
  );

  const bill = await prisma.billOfLading.upsert({
    where: { shipmentId: shipment.id },
    update: {
      bolNumber,
      templateVariant: data.template,
      freightTerms: shipment.customer.freightTerms,
      carrierName: shipment.carrier?.name,
      printedAt: null
    },
    create: {
      tenantId,
      shipmentId: shipment.id,
      bolNumber,
      templateVariant: data.template,
      freightTerms: shipment.customer.freightTerms,
      carrierName: shipment.carrier?.name
    },
    include: {
      shipment: {
        include: {
          customer: true
        }
      }
    }
  });

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { status: "BOL_CREATED" }
  });

  return bill;
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
  const { tenantId } = await getTenantScope();

  const route = await prisma.routeRun.findFirst({
    where: {
      id: data.routeRunId,
      tenantId
    },
    include: {
      stops: true
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

  return updatedRoute;
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
