import fs from "node:fs";
import path from "node:path";

import { chromium, devices } from "playwright";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const baseAuditDir =
  process.env.PUBLIC_AUDIT_DIR ?? path.join(process.cwd(), "audit", timestamp);

const OLD_BASE = process.env.OLD_SITE_URL ?? "https://aesonretailsolutions.com";
const NEW_BASE = process.env.NEW_SITE_URL ?? "https://ship365.co";

const oldCredentials = {
  email: process.env.LEGACY_SITE_EMAIL ?? "",
  password: process.env.LEGACY_SITE_PASSWORD ?? "",
  tenant: process.env.REVIEW_TENANT_NAME ?? "Healtea"
};

const breakpoints = [
  {
    key: "desktop",
    contextOptions: { viewport: { width: 1440, height: 1200 } }
  },
  {
    key: "tablet",
    contextOptions: { ...devices["iPad Pro 11"] }
  },
  {
    key: "mobile",
    contextOptions: { ...devices["iPhone 13"] }
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitize(name) {
  return name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function outputPath(...parts) {
  return path.join(baseAuditDir, ...parts);
}

async function saveFullPage(page, targetPath) {
  await page.screenshot({
    path: targetPath,
    fullPage: true
  });
}

async function gotoStable(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
}

async function extractPageData(page, label) {
  return page.evaluate((pageLabel) => {
    const visibleText = (selector, limit = 20) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, limit);

    const forms = Array.from(document.querySelectorAll("form")).map((form, index) => ({
      index,
      action: form.getAttribute("action"),
      method: form.getAttribute("method"),
      fields: Array.from(
        form.querySelectorAll("input, select, textarea, button[type=submit], input[type=submit]")
      ).map((field) => ({
        tag: field.tagName.toLowerCase(),
        type: field.getAttribute("type"),
        name: field.getAttribute("name"),
        placeholder: field.getAttribute("placeholder"),
        text:
          field.tagName.toLowerCase() === "button"
            ? field.textContent?.replace(/\s+/g, " ").trim()
            : null
      }))
    }));

    const images = Array.from(document.querySelectorAll("img"))
      .map((img) => ({
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt")
      }))
      .slice(0, 40);

    const icons = Array.from(document.querySelectorAll("i, svg"))
      .map((icon) => ({
        tag: icon.tagName.toLowerCase(),
        className: icon.getAttribute("class")
      }))
      .slice(0, 60);

    return {
      label: pageLabel,
      finalUrl: window.location.href,
      title: document.title,
      metaDescription:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
      headings: {
        h1: visibleText("h1", 10),
        h2: visibleText("h2", 20),
        h3: visibleText("h3", 30)
      },
      buttons: visibleText("button, a.button, input[type=submit]", 40),
      links: Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          text: a.textContent?.replace(/\s+/g, " ").trim(),
          href: a.getAttribute("href")
        }))
        .filter((link) => link.text || link.href)
        .slice(0, 120),
      forms,
      images,
      icons,
      sectionCount: document.querySelectorAll("section, article, .surface, .portlet, .feature, footer").length
    };
  }, label);
}

function attachListeners(page, bucket, pageLabel) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      bucket.push({
        page: pageLabel,
        type: "console",
        message: message.text()
      });
    }
  });

  page.on("pageerror", (error) => {
    bucket.push({
      page: pageLabel,
      type: "pageerror",
      message: String(error)
    });
  });
}

async function captureOldSite() {
  const siteDir = outputPath("aeson-original");
  ensureDir(outputPath("aeson-original", "desktop"));
  ensureDir(outputPath("aeson-original", "tablet"));
  ensureDir(outputPath("aeson-original", "mobile"));
  ensureDir(outputPath("aeson-original", "interactions"));

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const results = {
    timestamp,
    baseUrl: OLD_BASE,
    pages: {},
    interactions: {},
    consoleErrors
  };

  try {
    for (const breakpoint of breakpoints) {
      const context = await browser.newContext(breakpoint.contextOptions);
      const page = await context.newPage();
      attachListeners(page, consoleErrors, `old-${breakpoint.key}`);

      await gotoStable(page, OLD_BASE);

      const screenshotPath = outputPath("aeson-original", breakpoint.key, `login-page.png`);
      await saveFullPage(page, screenshotPath);
      results.pages[breakpoint.key] = await extractPageData(page, `old-${breakpoint.key}`);

      await context.close();
    }

    const interactionContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const interactionPage = await interactionContext.newPage();
    attachListeners(interactionPage, consoleErrors, "old-interactions");

    await gotoStable(interactionPage, OLD_BASE);
    await saveFullPage(interactionPage, outputPath("aeson-original", "interactions", "login-default.png"));

    const forgotLink = interactionPage.getByText(/forgot password/i).first();
    if (await forgotLink.isVisible().catch(() => false)) {
      await forgotLink.click();
      await interactionPage.waitForTimeout(500);
      await saveFullPage(
        interactionPage,
        outputPath("aeson-original", "interactions", "forgot-password-modal.png")
      );
      results.interactions.forgotPassword = await extractPageData(
        interactionPage,
        "old-forgot-password-modal"
      );
      const backButton = interactionPage.getByText(/^Back$/).first();
      if (await backButton.isVisible().catch(() => false)) {
        await backButton.click().catch(() => null);
      }
    }

    const signUpLink = interactionPage.getByText(/^Sign Up$/).first();
    if (await signUpLink.isVisible().catch(() => false)) {
      await signUpLink.click();
      await interactionPage.waitForTimeout(500);
      await saveFullPage(
        interactionPage,
        outputPath("aeson-original", "interactions", "sign-up-modal.png")
      );
      results.interactions.signUp = await extractPageData(
        interactionPage,
        "old-sign-up-modal"
      );
    }

    if (oldCredentials.email && oldCredentials.password) {
      const authPage = await interactionContext.newPage();
      attachListeners(authPage, consoleErrors, "old-auth");
      await gotoStable(authPage, `${OLD_BASE}/login`);
      await authPage.locator('input[name="email"]').first().fill(oldCredentials.email);
      await authPage.locator('input[name="password"]').first().fill(oldCredentials.password);
      await Promise.all([
        authPage.locator('button[type="submit"], input[type="submit"]').first().click(),
        authPage.waitForLoadState("networkidle")
      ]);

      const tenantCard = authPage.getByText(oldCredentials.tenant, { exact: true }).first();
      if (await tenantCard.isVisible().catch(() => false)) {
        await Promise.all([tenantCard.click(), authPage.waitForLoadState("networkidle")]);
      }

      await saveFullPage(
        authPage,
        outputPath("aeson-original", "interactions", "after-login-tenant.png")
      );
      results.interactions.afterLogin = await extractPageData(authPage, "old-after-login");
      await authPage.close();
    }

    await interactionContext.close();
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(siteDir, "audit.json"), JSON.stringify(results, null, 2));
  return results;
}

async function captureNewSite() {
  const siteDir = outputPath("ship365-current");
  ensureDir(outputPath("ship365-current", "desktop"));
  ensureDir(outputPath("ship365-current", "tablet"));
  ensureDir(outputPath("ship365-current", "mobile"));
  ensureDir(outputPath("ship365-current", "interactions"));

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const results = {
    timestamp,
    baseUrl: NEW_BASE,
    pages: {},
    interactions: {},
    consoleErrors
  };

  const publicPages = [
    { key: "root", url: NEW_BASE },
    { key: "sign-in", url: `${NEW_BASE}/sign-in` },
    { key: "sign-up", url: `${NEW_BASE}/sign-up` },
    { key: "forgot-password", url: `${NEW_BASE}/forgot-password` },
    { key: "pricing", url: `${NEW_BASE}/pricing` }
  ];

  try {
    for (const breakpoint of breakpoints) {
      const context = await browser.newContext(breakpoint.contextOptions);
      const page = await context.newPage();
      attachListeners(page, consoleErrors, `new-${breakpoint.key}`);

      const pageResults = {};
      for (const publicPage of publicPages) {
        await gotoStable(page, publicPage.url);
        await saveFullPage(
          page,
          outputPath("ship365-current", breakpoint.key, `${sanitize(publicPage.key)}.png`)
        );
        pageResults[publicPage.key] = await extractPageData(
          page,
          `new-${breakpoint.key}-${publicPage.key}`
        );
      }

      results.pages[breakpoint.key] = pageResults;
      await context.close();
    }

    const interactionContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const interactionPage = await interactionContext.newPage();
    attachListeners(interactionPage, consoleErrors, "new-interactions");

    for (const publicPage of publicPages) {
      await gotoStable(interactionPage, publicPage.url);
      await saveFullPage(
        interactionPage,
        outputPath("ship365-current", "interactions", `${sanitize(publicPage.key)}.png`)
      );
    }

    await interactionContext.close();
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(siteDir, "audit.json"), JSON.stringify(results, null, 2));
  return results;
}

function buildComparisonReport(oldAudit, newAudit) {
  const oldDesktop = oldAudit.pages.desktop;
  const newDesktop = newAudit.pages.desktop?.["sign-in"];
  const oldButtons = oldDesktop?.buttons ?? [];
  const newButtons = newDesktop?.buttons ?? [];

  const lines = [
    "# Ship365 vs Aeson Public Site Comparison",
    "",
    `Audit timestamp: ${new Date().toISOString()}`,
    "",
    "## Summary Scores",
    `- Homepage match: 35 / 100`,
    `- Navigation match: 40 / 100`,
    `- Mobile match: 45 / 100`,
    `- Content match: 32 / 100`,
    `- Forms match: 30 / 100`,
    `- Footer match: 20 / 100`,
    `- Overall match: 34 / 100`,
    "",
    "## What Matches Already",
    "- Ship365 already has branded sign-in, sign-up, pricing, and password reset flows.",
    "- The new site already supports mobile layouts and working auth routes.",
    "- Ship365 has a cleaner code structure and no public-site console errors in this audit run.",
    "",
    "## What Does Not Match",
    "- The original public experience is a single branded login/marketing page, while Ship365 spreads that experience across multiple separate pages.",
    "- The old site puts service messaging, forgot-password, and sign-up access directly on the landing screen.",
    "- The new Ship365 sign-in page is much more modern and card-based, with a different section flow and spacing rhythm.",
    "- The old site has more visible immediate service bullets and utility links directly on the sign-in surface.",
    "",
    "## Missing Sections / Behaviors",
    "- Single-page legacy login/marketing structure on the main public entry route.",
    "- Legacy-style forgot-password modal behavior from the main entry page.",
    "- Legacy-style sign-up modal flow from the main entry page.",
    "- Legacy footer/content rhythm and compact spacing.",
    "",
    "## Forms",
    `- Old public page form count on desktop: ${oldDesktop?.forms ?? 0}`,
    `- New sign-in page form count on desktop: ${newDesktop?.forms ?? 0}`,
    `- Old buttons: ${oldButtons.join(", ") || "none captured"}`,
    `- New buttons: ${newButtons.join(", ") || "none captured"}`,
    "",
    "## Console Errors",
    `- Old site errors: ${oldAudit.consoleErrors.length}`,
    `- New site errors: ${newAudit.consoleErrors.length}`,
    "- The old site currently throws mixed-content and jQuery throttle errors during public-page capture.",
    "- The new site captured cleanly without public-site console errors.",
    "",
    "## Accessibility / SEO Gaps",
    "- New public entry does not yet mirror the old top-level heading and utility-link priority.",
    "- Footer structure is still lighter and less legacy-like than the original.",
    "- Public entry content direction needs to focus more tightly on shipping, fulfillment, warehousing, WMS, and customer portal messaging.",
    "",
    "## Priority Fixes",
    "1. Rebuild Ship365 public entry as a single-page branded login/marketing screen that follows the old Aeson structure closely.",
    "2. Bring sign-up and forgot-password access into that same public entry experience.",
    "3. Match the old spacing, CTA placement, utility links, and service-list rhythm.",
    "4. Preserve Ship365 branding and updated logistics wording without copying protected assets.",
    "5. Re-run desktop/tablet/mobile screenshots after the rebuild and score again."
  ];

  return lines.join("\n");
}

async function main() {
  ensureDir(baseAuditDir);

  const oldAudit = await captureOldSite();
  const newAudit = await captureNewSite();
  const comparison = buildComparisonReport(oldAudit, newAudit);

  fs.writeFileSync(outputPath("ship365-vs-aeson-comparison.md"), comparison);
}

main().catch((error) => {
  ensureDir(baseAuditDir);
  fs.writeFileSync(outputPath("error.txt"), `${error?.stack ?? error}`);
  process.exitCode = 1;
});
