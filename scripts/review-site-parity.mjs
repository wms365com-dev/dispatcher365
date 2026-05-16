import fs from "node:fs";
import path from "node:path";

import { chromium, devices } from "playwright";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const config = {
  oldBase: process.env.OLD_SITE_URL ?? "https://www.aesonretailsolutions.com",
  newPublicBase: process.env.NEW_SITE_URL ?? "https://ship365.co",
  newAppBase: process.env.NEW_APP_URL ?? "https://app.ship365.co",
  legacyEmail: process.env.LEGACY_SITE_EMAIL ?? "",
  legacyPassword: process.env.LEGACY_SITE_PASSWORD ?? "",
  newEmail: process.env.NEW_SITE_EMAIL ?? "",
  newPassword: process.env.NEW_SITE_PASSWORD ?? "",
  tenantName: process.env.REVIEW_TENANT_NAME ?? "Healtea",
  outputDir:
    process.env.REVIEW_OUTPUT_DIR ??
    path.join(process.cwd(), "artifacts", "site-review", timestamp)
};

const pageDefinitions = [
  {
    key: "public-entry",
    oldUrl: "/",
    newUrl: "/",
    auth: false
  },
  {
    key: "sign-in",
    oldUrl: "/login",
    newUrl: "/sign-in",
    auth: false
  },
  {
    key: "customer-create",
    oldUrl: "/customer/create",
    newUrl: "/dispatch/customers?view=create",
    auth: true
  },
  {
    key: "customer-list",
    oldUrl: "/customer",
    newUrl: "/dispatch/customers?view=list",
    auth: true
  },
  {
    key: "bol",
    oldUrl: "/bol",
    newUrl: "/dispatch/bols",
    auth: true
  },
  {
    key: "truck-run-create",
    oldUrl: "/truck-runs/create",
    newUrl: "/dispatch/routes?view=create",
    auth: true
  },
  {
    key: "truck-run-list",
    oldUrl: "/truck-runs",
    newUrl: "/dispatch/routes?view=list",
    auth: true
  }
];

const latestDir = path.join(process.cwd(), "artifacts", "site-review", "latest");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitize(value) {
  return value.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function absoluteUrl(base, relativePath) {
  return new URL(relativePath, base).toString();
}

function trimText(value, max = 240) {
  if (!value) {
    return "";
  }

  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function screenshot(page, fileName) {
  await page.screenshot({
    path: path.join(config.outputDir, fileName),
    fullPage: true
  });
}

async function collectPageSnapshot(page, label) {
  const metrics = await page.evaluate(() => {
    const getText = (selector, limit = 8) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, limit);

    return {
      finalUrl: window.location.href,
      title: document.title,
      h1: getText("h1", 3),
      headings: getText("h2, h3", 10),
      buttons: getText("button, a.button, input[type=submit]", 12),
      navLinks: getText("nav a, .page-sidebar a, .sidebar a", 20),
      forms: document.querySelectorAll("form").length,
      tables: document.querySelectorAll("table").length,
      sections: document.querySelectorAll("section, main article, .surface, .portlet").length
    };
  });

  return {
    label,
    ...metrics
  };
}

async function navigateAndCapture(page, url, fileNamePrefix) {
  await page.goto(url, { waitUntil: "networkidle" });
  await screenshot(page, `${fileNamePrefix}.png`);
  return collectPageSnapshot(page, fileNamePrefix);
}

async function loginOld(page) {
  if (!config.legacyEmail || !config.legacyPassword) {
    return { skipped: true, reason: "Missing LEGACY_SITE_EMAIL or LEGACY_SITE_PASSWORD" };
  }

  await page.goto(absoluteUrl(config.oldBase, "/login"), { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').first().fill(config.legacyEmail);
  await page.locator('input[name="password"]').first().fill(config.legacyPassword);
  await Promise.all([
    page.locator('button[type="submit"], input[type="submit"]').first().click(),
    page.waitForLoadState("networkidle")
  ]);

  const tenantCard = page.getByText(config.tenantName, { exact: true }).first();
  if (await tenantCard.isVisible().catch(() => false)) {
    await Promise.all([tenantCard.click(), page.waitForLoadState("networkidle")]);
  }

  return { skipped: false, finalUrl: page.url() };
}

async function loginNew(page) {
  if (!config.newEmail || !config.newPassword) {
    return { skipped: true, reason: "Missing NEW_SITE_EMAIL or NEW_SITE_PASSWORD" };
  }

  await page.goto(absoluteUrl(config.newAppBase, "/sign-in"), { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').first().fill(config.newEmail);
  await page.locator('input[name="password"]').first().fill(config.newPassword);

  await Promise.all([
    page.locator('button[type="submit"]').first().click(),
    page.waitForURL(/\/(select-tenant|dispatch|billing)(\?|$)/, { timeout: 15000 }).catch(
      () => null
    )
  ]);

  if (page.url().includes("/select-tenant")) {
    await page.getByText(config.tenantName, { exact: true }).first().waitFor({ timeout: 10000 });
    await Promise.all([
      page.getByRole("button", { name: /open tenant/i }).first().click(),
      page.waitForURL(/\/(dispatch|billing)(\?|$)/, { timeout: 15000 }).catch(() => null)
    ]);
    await page.waitForLoadState("networkidle");
  }

  return { skipped: false, finalUrl: page.url() };
}

async function getFirstVisibleBatchCell(page) {
  const candidates = page.locator("tbody tr td");
  const count = await candidates.count();

  for (let index = 0; index < count; index += 1) {
    const cell = candidates.nth(index);
    const text = (await cell.textContent())?.trim() ?? "";
    if (/^[A-Z0-9-]{6,}$/.test(text)) {
      return { cell, text };
    }
  }

  return null;
}

async function checkTruckRunDoubleClick(page, flavor) {
  const targetUrl =
    flavor === "old"
      ? absoluteUrl(config.oldBase, "/truck-runs/create")
      : absoluteUrl(config.newAppBase, "/dispatch/routes?view=create");

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  const firstBatch = await getFirstVisibleBatchCell(page);
  if (!firstBatch) {
    return { added: false, reason: "No batch cell found" };
  }

  await firstBatch.cell.dblclick();
  await page.waitForTimeout(800);

  const selector =
    flavor === "old"
      ? 'input[placeholder*="Batch ID"], input[placeholder*="Batch Id"], input[placeholder*="Batch id"]'
      : ".legacy-bol-stage__input";

  const stagedValues = await page
    .locator(selector)
    .evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));

  await screenshot(page, `${flavor}-truck-run-dblclick.png`);
  return {
    added: stagedValues.includes(firstBatch.text),
    firstBatch: firstBatch.text,
    stagedValues
  };
}

function buildRecommendations(result) {
  const recommendations = [];

  const oldPublic = result.pages["public-entry"]?.old?.desktop;
  const newPublic = result.pages["public-entry"]?.new?.desktop;
  if (oldPublic && newPublic && oldPublic.forms !== newPublic.forms) {
    recommendations.push(
      `Public entry page structure differs: old has ${oldPublic.forms} form(s), new has ${newPublic.forms}.`
    );
  }

  const oldCustomerList = result.pages["customer-list"]?.old?.desktop;
  const newCustomerList = result.pages["customer-list"]?.new?.desktop;
  if (oldCustomerList && newCustomerList && newCustomerList.tables > oldCustomerList.tables) {
    recommendations.push(
      "Customer lookup is still denser on the new side; keep the old navigation-first split behavior."
    );
  }

  const truckRun = result.interactions?.newTruckRun;
  if (truckRun && !truckRun.added && truckRun.reason !== "No batch cell found") {
    recommendations.push("Truck Run double-click staging failed on the new app and needs attention.");
  }

  const newConsoleErrorCount = result.consoleErrors.filter((entry) => entry.page.startsWith("new-")).length;
  if (newConsoleErrorCount > 0) {
    recommendations.push(`There were ${newConsoleErrorCount} new-site console/page errors during the audit.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("No major parity regressions were detected in this review cycle.");
  }

  return recommendations;
}

function buildMarkdown(result) {
  const lines = [
    `# Ship365 Review Cycle`,
    ``,
    `- Timestamp: ${result.timestamp}`,
    `- Old site: ${result.config.oldBase}`,
    `- New public site: ${result.config.newPublicBase}`,
    `- New app site: ${result.config.newAppBase}`,
    ``,
    `## Authentication`,
    `- Old login: ${result.auth.old.skipped ? `skipped (${result.auth.old.reason})` : result.auth.old.finalUrl}`,
    `- New login: ${result.auth.new.skipped ? `skipped (${result.auth.new.reason})` : result.auth.new.finalUrl}`,
    ``,
    `## Key Checks`,
    `- Old Truck Run double-click: ${
      result.interactions.oldTruckRun.added
        ? `passed (${result.interactions.oldTruckRun.firstBatch})`
        : `not proven (${result.interactions.oldTruckRun.reason ?? "no row available"})`
    }`,
    `- New Truck Run double-click: ${
      result.interactions.newTruckRun.added
        ? `passed (${result.interactions.newTruckRun.firstBatch})`
        : result.interactions.newTruckRun.reason === "No batch cell found"
          ? `not proven (${result.interactions.newTruckRun.reason})`
          : `failed (${result.interactions.newTruckRun.reason ?? "staging mismatch"})`
    }`,
    ``,
    `## Recommendations`
  ];

  for (const recommendation of result.recommendations) {
    lines.push(`- ${recommendation}`);
  }

  const newErrors = result.consoleErrors.filter((entry) => entry.page.startsWith("new-"));
  lines.push(
    ``,
    `## Console / Page Errors`,
    `- Total count: ${result.consoleErrors.length}`,
    `- New-site count: ${newErrors.length}`
  );

  for (const error of newErrors.slice(0, 20)) {
    lines.push(`- ${trimText(`${error.page}: ${error.message}`, 180)}`);
  }

  return lines.join("\n");
}

async function run() {
  ensureDir(config.outputDir);

  const browser = await chromium.launch({ headless: true });

  const guestDesktopOldContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const guestDesktopNewContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const guestMobileOldContext = await browser.newContext({ ...devices["iPhone 13"] });
  const guestMobileNewContext = await browser.newContext({ ...devices["iPhone 13"] });
  const authDesktopOldContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const authDesktopNewContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const authMobileOldContext = await browser.newContext({ ...devices["iPhone 13"] });
  const authMobileNewContext = await browser.newContext({ ...devices["iPhone 13"] });

  const consoleErrors = [];
  const attachErrorListeners = (page, pageLabel) => {
    page.on("pageerror", (error) => {
      consoleErrors.push({ page: pageLabel, type: "pageerror", message: String(error) });
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({ page: pageLabel, type: "console", message: message.text() });
      }
    });
  };

  const guestDesktopOldPage = await guestDesktopOldContext.newPage();
  const guestDesktopNewPage = await guestDesktopNewContext.newPage();
  const guestMobileOldPage = await guestMobileOldContext.newPage();
  const guestMobileNewPage = await guestMobileNewContext.newPage();
  const authDesktopOldPage = await authDesktopOldContext.newPage();
  const authDesktopNewPage = await authDesktopNewContext.newPage();
  const authMobileOldPage = await authMobileOldContext.newPage();
  const authMobileNewPage = await authMobileNewContext.newPage();

  attachErrorListeners(guestDesktopOldPage, "old-guest-desktop");
  attachErrorListeners(guestDesktopNewPage, "new-guest-desktop");
  attachErrorListeners(guestMobileOldPage, "old-guest-mobile");
  attachErrorListeners(guestMobileNewPage, "new-guest-mobile");
  attachErrorListeners(authDesktopOldPage, "old-auth-desktop");
  attachErrorListeners(authDesktopNewPage, "new-auth-desktop");
  attachErrorListeners(authMobileOldPage, "old-auth-mobile");
  attachErrorListeners(authMobileNewPage, "new-auth-mobile");

  const result = {
    timestamp: new Date().toISOString(),
    config: {
      oldBase: config.oldBase,
      newPublicBase: config.newPublicBase,
      newAppBase: config.newAppBase,
      tenantName: config.tenantName
    },
    auth: {
      old: { skipped: true, reason: "not attempted" },
      new: { skipped: true, reason: "not attempted" }
    },
    pages: {},
    interactions: {},
    consoleErrors,
    recommendations: []
  };

  try {
    result.auth.old = await loginOld(authDesktopOldPage);
    result.auth.new = await loginNew(authDesktopNewPage);

    if (!result.auth.old.skipped) {
      await loginOld(authMobileOldPage);
    }

    if (!result.auth.new.skipped) {
      await loginNew(authMobileNewPage);
    }

    for (const pageDefinition of pageDefinitions) {
      if (pageDefinition.auth && (result.auth.old.skipped || result.auth.new.skipped)) {
        continue;
      }

      const desktopOldPage = pageDefinition.auth ? authDesktopOldPage : guestDesktopOldPage;
      const desktopNewPage = pageDefinition.auth ? authDesktopNewPage : guestDesktopNewPage;
      const mobileOldPage = pageDefinition.auth ? authMobileOldPage : guestMobileOldPage;
      const mobileNewPage = pageDefinition.auth ? authMobileNewPage : guestMobileNewPage;
      const newBase = pageDefinition.auth ? config.newAppBase : config.newPublicBase;
      const key = sanitize(pageDefinition.key);

      result.pages[pageDefinition.key] = {
        old: {
          desktop: await navigateAndCapture(
            desktopOldPage,
            absoluteUrl(config.oldBase, pageDefinition.oldUrl),
            `old-${key}-desktop`
          ),
          mobile: await navigateAndCapture(
            mobileOldPage,
            absoluteUrl(config.oldBase, pageDefinition.oldUrl),
            `old-${key}-mobile`
          )
        },
        new: {
          desktop: await navigateAndCapture(
            desktopNewPage,
            absoluteUrl(newBase, pageDefinition.newUrl),
            `new-${key}-desktop`
          ),
          mobile: await navigateAndCapture(
            mobileNewPage,
            absoluteUrl(newBase, pageDefinition.newUrl),
            `new-${key}-mobile`
          )
        }
      };
    }

    result.interactions.oldTruckRun = result.auth.old.skipped
      ? { added: false, reason: result.auth.old.reason }
      : await checkTruckRunDoubleClick(authDesktopOldPage, "old");
    result.interactions.newTruckRun = result.auth.new.skipped
      ? { added: false, reason: result.auth.new.reason }
      : await checkTruckRunDoubleClick(authDesktopNewPage, "new");

    result.recommendations = buildRecommendations(result);

    fs.writeFileSync(path.join(config.outputDir, "result.json"), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(config.outputDir, "summary.md"), buildMarkdown(result));

    fs.rmSync(latestDir, { recursive: true, force: true });
    fs.cpSync(config.outputDir, latestDir, { recursive: true });
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  ensureDir(config.outputDir);
  fs.writeFileSync(path.join(config.outputDir, "error.txt"), `${error?.stack ?? error}`);
  process.exitCode = 1;
});
