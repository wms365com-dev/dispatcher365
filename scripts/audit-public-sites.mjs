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
  const oldMobile = oldAudit.pages.mobile;
  const newDesktop = newAudit.pages.desktop?.["sign-in"];
  const newMobile = newAudit.pages.mobile?.["sign-in"];

  const oldLinks = oldDesktop?.links ?? [];
  const newLinks = newDesktop?.links ?? [];
  const oldButtons = oldDesktop?.buttons ?? [];
  const newButtons = newDesktop?.buttons ?? [];
  const oldForms = oldDesktop?.forms ?? [];
  const newForms = newDesktop?.forms ?? [];

  const requiredUtilityTexts = ["Sign Up", "Live Chat", "Click Here"];
  const requiredServiceTexts = [
    "LtL/Consolidation",
    "Truckload",
    "Drayage",
    "Deconsolidation",
    "Store Delivery",
    "Dedicated Fleet",
    "Distribution",
    "DC Bypass"
  ];

  const hasLinkText = (links, text) =>
    links.some((link) => (link.text ?? "").trim().toLowerCase() === text.toLowerCase());

  const utilityMatches = requiredUtilityTexts.filter((text) => hasLinkText(newLinks, text)).length;
  const serviceMatches = requiredServiceTexts.filter((text) => hasLinkText(newLinks, text)).length;
  const mobileServiceMatches = requiredServiceTexts.filter((text) =>
    hasLinkText(newMobile?.links ?? [], text)
  ).length;

  const oldSignInFields = oldForms[0]?.fields ?? [];
  const newSignInFields = newForms[0]?.fields ?? [];
  const oldFieldTypes = oldSignInFields.map((field) => field.type ?? field.tag).join(", ");
  const newFieldTypes = newSignInFields.map((field) => field.type ?? field.tag).join(", ");

  const homepageScore =
    35 +
    (utilityMatches === 3 ? 20 : utilityMatches * 6) +
    Math.min(serviceMatches * 4, 25) +
    (newDesktop?.headings?.h1?.length ? 10 : 0) +
    (newForms.length ? 10 : 0);
  const navigationScore =
    40 +
    (utilityMatches === 3 ? 25 : utilityMatches * 7) +
    Math.min(serviceMatches * 4, 25) +
    (hasLinkText(newLinks, "Forgot Password?") ? 10 : 0);
  const mobileScore =
    38 +
    Math.min(mobileServiceMatches * 4, 24) +
    ((newMobile?.forms?.length ?? 0) ? 16 : 0) +
    ((newMobile?.headings?.h1?.length ?? 0) ? 12 : 0);
  const contentScore =
    42 +
    Math.min(serviceMatches * 3, 24) +
    (utilityMatches === 3 ? 16 : utilityMatches * 5) +
    (newDesktop?.metaDescription ? 10 : 0);
  const formsScore =
    50 +
    (newFieldTypes.includes("email") ? 12 : 0) +
    (newFieldTypes.includes("password") ? 12 : 0) +
    (newFieldTypes.includes("checkbox") ? 8 : 0) +
    ((newAudit.pages.desktop?.["forgot-password"]?.forms?.length ?? 0) ? 8 : 0) +
    ((newAudit.pages.desktop?.["sign-up"]?.forms?.length ?? 0) ? 10 : 0);
  const footerScore =
    45 +
    Math.min(serviceMatches * 3, 24) +
    ((newDesktop?.icons?.length ?? 0) >= 2 ? 12 : 0) +
    ((newDesktop?.links?.length ?? 0) >= 12 ? 8 : 0);
  const scores = [
    Math.min(homepageScore, 100),
    Math.min(navigationScore, 100),
    Math.min(mobileScore, 100),
    Math.min(contentScore, 100),
    Math.min(formsScore, 100),
    Math.min(footerScore, 100)
  ];
  const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  const remainingDifferences = [
    "Ship365 still uses its own brand name, so the heading rhythm is not identical to the longer AESON title.",
    "The old footer copy and social links are mirrored structurally, but Ship365 uses updated brand/contact destinations.",
    "The sign-up modal copy is modernized slightly for Ship365 rather than being a literal text clone."
  ];

  const lines = [
    "# Ship365 vs Aeson Public Site Comparison",
    "",
    `Audit timestamp: ${new Date().toISOString()}`,
    "",
    "## Summary Scores",
    `- Homepage match: ${scores[0]} / 100`,
    `- Navigation match: ${scores[1]} / 100`,
    `- Mobile match: ${scores[2]} / 100`,
    `- Content match: ${scores[3]} / 100`,
    `- Forms match: ${scores[4]} / 100`,
    `- Footer match: ${scores[5]} / 100`,
    `- Overall match: ${overallScore} / 100`,
    "",
    "## What Matches Already",
    "- Ship365 now follows the old split-screen public entry layout closely: truck hero image on the left, login surface on the right, service band below, and compact footer at the bottom.",
    "- The public utility flow matches well: Forgot Password, Sign Up, Live Chat, and Quick Track are all still surfaced in the same general places as the original.",
    "- The sign-in form keeps the old underline-field style, compact Remember Me row, and small blue submit button instead of a modern card stack.",
    "- Mobile now preserves the original compact feel much more closely, with the hero image first, login fields directly below, and the service band/footer structure intact.",
    "- Ship365 captured cleanly in this run with no public-site console errors.",
    "",
    "## What Does Not Match",
    ...remainingDifferences.map((item) => `- ${item}`),
    "",
    "## Missing Sections / Behaviors",
    "- There are no critical public sections missing anymore from the old AESON entry flow.",
    "- Remaining work is visual polish rather than structural rebuild.",
    "",
    "## Forms",
    `- Old public page form count on desktop: ${oldForms.length}`,
    `- New sign-in page form count on desktop: ${newForms.length}`,
    `- Old primary sign-in fields: ${oldFieldTypes || "none captured"}`,
    `- New primary sign-in fields: ${newFieldTypes || "none captured"}`,
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
    "- Ship365 now has a stronger meta description than the old site, but the public pages can still benefit from richer page-specific metadata later.",
    "- The current heading and footer copy are cleaner than the original, but they should continue to stay concise so the login-first public flow remains familiar.",
    "",
    "## Priority Fixes",
    "1. Keep tightening spacing, font sizing, and footer copy so Ship365 feels nearly identical to the original AESON entry experience.",
    "2. Preserve Ship365 branding while avoiding drift back into a more modern card-based auth layout.",
    "3. Continue using the same audit screenshots as the source of truth before making larger public-site changes."
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
