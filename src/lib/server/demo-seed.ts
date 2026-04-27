import { prisma } from "@/lib/prisma";
import {
  buildBolNumber,
  buildEmailSubject,
  buildRfqSubject
} from "@/lib/workbook/formulas";

import { createPasswordHash } from "./password";

export const demoSeedingEnabled =
  process.env.ENABLE_DEMO_SEED === "true" || process.env.NODE_ENV !== "production";

const demoTenantSeed = {
  slug: "wms365-demo",
  name: "WMS 365 Dispatch Demo"
};

const demoUserSeed = {
  email: "dispatch@wms365.co",
  fullName: "Dispatch Admin"
};

export const demoCredentials = {
  email: demoUserSeed.email,
  password: "Dispatch123!"
};

const customerSeeds = [
  {
    customerCode: "BEAOUTNJ",
    name: "BEALL'S OUTLET c/o NRT",
    billingAddress1: "2820 16th Street, Building C",
    city: "North Bergen",
    state: "NJ",
    postalCode: "07047",
    phone: "",
    freightTerms: "prepaid"
  },
  {
    customerCode: "UNICIT",
    name: "UNION CITY HOME CENTER",
    billingAddress1: "3801 Bergenline Ave",
    city: "Union City",
    state: "NJ",
    postalCode: "07087",
    phone: "(201) 864-8576",
    freightTerms: "prepaid"
  },
  {
    customerCode: "HOMEGONRT",
    name: "NRT BUILDING C",
    billingAddress1: "2820 16th Street",
    city: "North Bergen",
    state: "NJ",
    postalCode: "07047",
    phone: "2013301900x3912",
    freightTerms: "prepaid"
  },
  {
    customerCode: "NORBER",
    name: "NATIONAL RETAIL TRANSPORTATION INC",
    billingAddress1: "2820 16th Street, Building C",
    city: "North Bergen",
    state: "NJ",
    postalCode: "07047",
    phone: "",
    freightTerms: "prepaid"
  },
  {
    customerCode: "OZPTY",
    name: "APACSALE GROUP / OZSALE PTY LTD",
    billingAddress1: "1107 South Boyle Avenue",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90023",
    phone: "",
    freightTerms: "third-party"
  }
] as const;

const carrierSeeds = [
  {
    carrierCode: "GLOBAL",
    name: "Global Transport",
    scac: "GBLX",
    email: "ops@global.example",
    phone: "(201) 555-0184"
  },
  {
    carrierCode: "JPX",
    name: "JP Express",
    scac: "JPEX",
    email: "dispatch@jpexpress.example",
    phone: "(973) 555-0128"
  },
  {
    carrierCode: "OLJ",
    name: "Oljeje Transport",
    scac: "OLJT",
    email: "dispatch@oljeje.example",
    phone: "(416) 555-0199"
  }
] as const;

const driverSeeds = [
  {
    driverCode: "ANDRE",
    fullName: "Andre Miles",
    carrierCode: "JPX",
    phone: "(917) 555-0101"
  },
  {
    driverCode: "LUIS",
    fullName: "Luis Rojas",
    carrierCode: "OLJ",
    phone: "(917) 555-0144"
  }
] as const;

const shipmentSeeds = [
  {
    batchId: "1002512",
    customerCode: "BEAOUTNJ",
    customerPo: "927234",
    salesOrder: "1286965",
    salesperson: "ZE47",
    status: "READY_FOR_BOL",
    shipDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    deliveryWindow: "10:00 AM to 4:00 PM",
    comments: "NRT receiving appointment required.",
    cartons: 74,
    pallets: 3,
    weightLb: 1369,
    cubeCuFt: 97.78,
    freightClass: "125"
  },
  {
    batchId: "1002513",
    customerCode: "BEAOUTNJ",
    customerPo: "958341",
    salesOrder: "1294389",
    salesperson: "ZE47",
    status: "BOL_CREATED",
    shipDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    deliveryWindow: "10:00 AM to 4:00 PM",
    carrierCode: "OLJ",
    cartons: 30,
    pallets: 1,
    weightLb: 551,
    cubeCuFt: 44.12,
    freightClass: "125"
  },
  {
    batchId: "1002541",
    customerCode: "UNICIT",
    customerPo: "JB03721",
    salesOrder: "1295857",
    salesperson: "ZE47",
    status: "ROUTED",
    shipDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    deliveryWindow: "10:00 AM to 4:00 PM",
    carrierCode: "OLJ",
    cartons: 35,
    pallets: 1,
    weightLb: 700,
    cubeCuFt: 51.33,
    freightClass: "125"
  },
  {
    batchId: "1002549",
    customerCode: "HOMEGONRT",
    customerPo: "40 395158",
    salesOrder: "1295147",
    salesperson: "ZE47",
    status: "IN_TRANSIT",
    shipDate: "2026-04-08",
    deliveryDate: "2026-04-09",
    deliveryWindow: "8:00 AM to 12:00 PM",
    carrierCode: "OLJ",
    cartons: 123,
    pallets: 3,
    weightLb: 2460,
    cubeCuFt: 177.78,
    freightClass: "100"
  },
  {
    batchId: "1002558",
    customerCode: "NORBER",
    customerPo: "01 277487",
    salesOrder: "1296392",
    salesperson: "ZE47",
    status: "DRAFT",
    shipDate: "2026-04-10",
    deliveryDate: "2026-04-11",
    carrierCode: "JPX",
    cartons: 30,
    pallets: 1,
    weightLb: 600,
    cubeCuFt: 45.21,
    freightClass: "125"
  }
] as const;

const billSeeds = [
  { shipmentBatchId: "1002513", templateVariant: "STANDARD" },
  { shipmentBatchId: "1002541", templateVariant: "RETURN" },
  { shipmentBatchId: "1002549", templateVariant: "CDN" }
] as const;

const routeSeeds = [
  {
    id: "route-olj-draft",
    routeName: "OLJ North Jersey Draft Run",
    routeDate: "2026-04-09",
    status: "DRAFT",
    carrierCode: "OLJ",
    driverCode: "LUIS",
    stopBatchIds: ["1002541"] as const
  },
  {
    id: "route-olj-published",
    routeName: "OLJ Morning Active Run",
    routeDate: "2026-04-09",
    status: "IN_TRANSIT",
    carrierCode: "OLJ",
    driverCode: "LUIS",
    publishedAt: "2026-04-06T16:20:00.000Z",
    stopBatchIds: ["1002549"] as const
  }
] as const;

const labelSeeds = [
  { shipmentBatchId: "1002513", labelKind: "CARTON", quantity: 30 },
  { shipmentBatchId: "1002513", labelKind: "PALLET", quantity: 1 }
] as const;

const deliveryEventSeeds = [
  {
    id: "evt-1002549-in-transit",
    shipmentBatchId: "1002549",
    routeId: "route-olj-published",
    driverCode: "LUIS",
    eventType: "IN_TRANSIT",
    eventAt: "2026-04-09T08:15:00.000Z",
    note: "Route published and acknowledged for morning dispatch."
  }
] as const;

export async function ensureDemoSeed() {
  if (!demoSeedingEnabled) {
    return null;
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: demoTenantSeed.slug },
    update: { name: demoTenantSeed.name },
    create: demoTenantSeed
  });

  const existingUser = await prisma.user.findUnique({
    where: { email: demoUserSeed.email }
  });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: demoUserSeed.fullName,
          passwordHash: existingUser.passwordHash ?? createPasswordHash(demoCredentials.password)
        }
      })
    : await prisma.user.create({
        data: {
          ...demoUserSeed,
          passwordHash: createPasswordHash(demoCredentials.password)
        }
      });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id
      }
    },
    update: { role: "TENANT_ADMIN" },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "TENANT_ADMIN"
    }
  });

  for (const customerSeed of customerSeeds) {
    await prisma.customer.upsert({
      where: {
        tenantId_customerCode: {
          tenantId: tenant.id,
          customerCode: customerSeed.customerCode
        }
      },
      update: customerSeed,
      create: {
        tenantId: tenant.id,
        ...customerSeed
      }
    });
  }

  for (const carrierSeed of carrierSeeds) {
    await prisma.carrier.upsert({
      where: {
        tenantId_carrierCode: {
          tenantId: tenant.id,
          carrierCode: carrierSeed.carrierCode
        }
      },
      update: carrierSeed,
      create: {
        tenantId: tenant.id,
        ...carrierSeed
      }
    });
  }

  const carrierMap = new Map(
    (
      await prisma.carrier.findMany({
        where: { tenantId: tenant.id }
      })
    ).map((carrier) => [carrier.carrierCode, carrier.id])
  );

  for (const driverSeed of driverSeeds) {
    const carrierId = carrierMap.get(driverSeed.carrierCode);

    await prisma.driver.upsert({
      where: {
        tenantId_driverCode: {
          tenantId: tenant.id,
          driverCode: driverSeed.driverCode
        }
      },
      update: {
        fullName: driverSeed.fullName,
        phone: driverSeed.phone,
        carrierId
      },
      create: {
        tenantId: tenant.id,
        driverCode: driverSeed.driverCode,
        fullName: driverSeed.fullName,
        phone: driverSeed.phone,
        carrierId
      }
    });
  }

  const customerMap = new Map(
    (
      await prisma.customer.findMany({
        where: { tenantId: tenant.id }
      })
    ).map((customer) => [customer.customerCode, customer])
  );

  for (const shipmentSeed of shipmentSeeds) {
    const customer = customerMap.get(shipmentSeed.customerCode);

    if (!customer) {
      continue;
    }

    const carrierId = shipmentSeed.carrierCode
      ? carrierMap.get(shipmentSeed.carrierCode)
      : undefined;

    await prisma.shipment.upsert({
      where: {
        tenantId_batchId: {
          tenantId: tenant.id,
          batchId: shipmentSeed.batchId
        }
      },
      update: {
        customerId: customer.id,
        carrierId,
        customerPo: shipmentSeed.customerPo,
        salesOrder: shipmentSeed.salesOrder,
        salesperson: shipmentSeed.salesperson,
        status: shipmentSeed.status,
        shipDate: new Date(shipmentSeed.shipDate),
        deliveryDate: new Date(shipmentSeed.deliveryDate),
        deliveryWindow: shipmentSeed.deliveryWindow,
        cartons: shipmentSeed.cartons,
        pallets: shipmentSeed.pallets,
        weightLb: shipmentSeed.weightLb,
        cubeCuFt: shipmentSeed.cubeCuFt,
        freightClass: shipmentSeed.freightClass,
        comments: shipmentSeed.comments,
        emailSubject: buildEmailSubject(
          shipmentSeed.customerCode,
          shipmentSeed.customerPo,
          shipmentSeed.salesOrder
        ),
        rfqSubject: buildRfqSubject(
          shipmentSeed.customerCode,
          shipmentSeed.salesOrder
        )
      },
      create: {
        tenantId: tenant.id,
        customerId: customer.id,
        carrierId,
        batchId: shipmentSeed.batchId,
        customerPo: shipmentSeed.customerPo,
        salesOrder: shipmentSeed.salesOrder,
        salesperson: shipmentSeed.salesperson,
        status: shipmentSeed.status,
        shipDate: new Date(shipmentSeed.shipDate),
        deliveryDate: new Date(shipmentSeed.deliveryDate),
        deliveryWindow: shipmentSeed.deliveryWindow,
        cartons: shipmentSeed.cartons,
        pallets: shipmentSeed.pallets,
        weightLb: shipmentSeed.weightLb,
        cubeCuFt: shipmentSeed.cubeCuFt,
        freightClass: shipmentSeed.freightClass,
        comments: shipmentSeed.comments,
        emailSubject: buildEmailSubject(
          shipmentSeed.customerCode,
          shipmentSeed.customerPo,
          shipmentSeed.salesOrder
        ),
        rfqSubject: buildRfqSubject(
          shipmentSeed.customerCode,
          shipmentSeed.salesOrder
        )
      }
    });
  }

  const driverMap = new Map(
    (
      await prisma.driver.findMany({
        where: { tenantId: tenant.id }
      })
    ).map((driver) => [driver.driverCode, driver.id])
  );

  const shipmentMap = new Map(
    (
      await prisma.shipment.findMany({
        where: { tenantId: tenant.id },
        include: {
          customer: true,
          carrier: true
        }
      })
    ).map((shipment) => [shipment.batchId, shipment])
  );

  for (const billSeed of billSeeds) {
    const shipment = shipmentMap.get(billSeed.shipmentBatchId);

    if (!shipment) {
      continue;
    }

    const freightTerms = shipment.customer.freightTerms ?? undefined;
    const bolNumber = buildBolNumber({
      customerCode: shipment.customer.customerCode,
      salesOrder: shipment.salesOrder ?? shipment.batchId
    });

    await prisma.billOfLading.upsert({
      where: { shipmentId: shipment.id },
      update: {
        bolNumber,
        templateVariant: billSeed.templateVariant,
        freightTerms,
        carrierName: shipment.carrier?.name
      },
      create: {
        tenantId: tenant.id,
        shipmentId: shipment.id,
        bolNumber,
        templateVariant: billSeed.templateVariant,
        freightTerms,
        carrierName: shipment.carrier?.name
      }
    });
  }

  for (const routeSeed of routeSeeds) {
    const carrierId = carrierMap.get(routeSeed.carrierCode);
    const driverId = driverMap.get(routeSeed.driverCode);

    await prisma.routeRun.upsert({
      where: { id: routeSeed.id },
      update: {
        tenantId: tenant.id,
        carrierId,
        driverId,
        createdById: user.id,
        routeName: routeSeed.routeName,
        routeDate: new Date(routeSeed.routeDate),
        status: routeSeed.status,
        publishedAt: routeSeed.publishedAt ? new Date(routeSeed.publishedAt) : null,
        mobileSyncAt: routeSeed.publishedAt ? new Date(routeSeed.publishedAt) : null
      },
      create: {
        id: routeSeed.id,
        tenantId: tenant.id,
        carrierId,
        driverId,
        createdById: user.id,
        routeName: routeSeed.routeName,
        routeDate: new Date(routeSeed.routeDate),
        status: routeSeed.status,
        publishedAt: routeSeed.publishedAt ? new Date(routeSeed.publishedAt) : undefined,
        mobileSyncAt: routeSeed.publishedAt ? new Date(routeSeed.publishedAt) : undefined
      }
    });

    const routeRun = await prisma.routeRun.findUnique({
      where: { id: routeSeed.id }
    });

    if (!routeRun) {
      continue;
    }

    for (const [index, batchId] of routeSeed.stopBatchIds.entries()) {
      const shipment = shipmentMap.get(batchId);

      if (!shipment) {
        continue;
      }

      const routeStopId = `${routeSeed.id}-${index + 1}`;

      await prisma.routeStop.upsert({
        where: { id: routeStopId },
        update: {
          tenantId: tenant.id,
          routeRunId: routeRun.id,
          shipmentId: shipment.id,
          stopNumber: index + 1,
          status:
            routeSeed.status === "DRAFT"
              ? "PLANNED"
              : routeSeed.status === "PUBLISHED"
                ? "PUBLISHED"
                : routeSeed.status === "IN_TRANSIT"
                  ? "IN_TRANSIT"
                  : "DELIVERED"
        },
        create: {
          id: routeStopId,
          tenantId: tenant.id,
          routeRunId: routeRun.id,
          shipmentId: shipment.id,
          stopNumber: index + 1,
          status:
            routeSeed.status === "DRAFT"
              ? "PLANNED"
              : routeSeed.status === "PUBLISHED"
                ? "PUBLISHED"
                : routeSeed.status === "IN_TRANSIT"
                  ? "IN_TRANSIT"
                  : "DELIVERED"
        }
      });
    }
  }

  for (const labelSeed of labelSeeds) {
    const shipment = shipmentMap.get(labelSeed.shipmentBatchId);

    if (!shipment) {
      continue;
    }

    await prisma.labelJob.upsert({
      where: { id: `${labelSeed.labelKind}-${labelSeed.shipmentBatchId}` },
      update: {
        tenantId: tenant.id,
        shipmentId: shipment.id,
        labelKind: labelSeed.labelKind,
        quantity: labelSeed.quantity
      },
      create: {
        id: `${labelSeed.labelKind}-${labelSeed.shipmentBatchId}`,
        tenantId: tenant.id,
        shipmentId: shipment.id,
        labelKind: labelSeed.labelKind,
        quantity: labelSeed.quantity
      }
    });
  }

  const routeStopMap = new Map(
    (
      await prisma.routeStop.findMany({
        where: { tenantId: tenant.id },
        include: {
          shipment: true,
          routeRun: true
        }
      })
    ).map((routeStop) => [`${routeStop.routeRunId}:${routeStop.shipment.batchId}`, routeStop])
  );

  for (const eventSeed of deliveryEventSeeds) {
    const shipment = shipmentMap.get(eventSeed.shipmentBatchId);
    const routeStop = routeStopMap.get(`${eventSeed.routeId}:${eventSeed.shipmentBatchId}`);
    const driverId = driverMap.get(eventSeed.driverCode);

    if (!shipment) {
      continue;
    }

    await prisma.deliveryEvent.upsert({
      where: { id: eventSeed.id },
      update: {
        tenantId: tenant.id,
        shipmentId: shipment.id,
        routeStopId: routeStop?.id,
        driverId,
        eventType: eventSeed.eventType,
        eventAt: new Date(eventSeed.eventAt),
        note: eventSeed.note
      },
      create: {
        id: eventSeed.id,
        tenantId: tenant.id,
        shipmentId: shipment.id,
        routeStopId: routeStop?.id,
        driverId,
        eventType: eventSeed.eventType,
        eventAt: new Date(eventSeed.eventAt),
        note: eventSeed.note
      }
    });
  }

  return {
    tenant,
    user
  };
}
