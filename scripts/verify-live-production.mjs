#!/usr/bin/env node
import {
  EXPECTED_PRODUCTS,
  readCheckoutManifest,
  validateCheckoutManifest
} from "./validate-checkout-links.mjs";
import { readFile } from "node:fs/promises";

const DEFAULT_BASE_URL = "https://billionai.vercel.app";
const MIN_SITEMAP_URLS = 45;
const EXPECTED_PRODUCT_IDS = Object.keys(EXPECTED_PRODUCTS);
const EXPECTED_CHECKOUT_MARKERS = EXPECTED_PRODUCT_IDS.length * 2;
const DELIVERY_PATHS = EXPECTED_PRODUCT_IDS.map((id) => `/delivery/${id}.html`);
const CHECKOUT_TARGET_PATHS = new Set(["/", ...EXPECTED_PRODUCT_IDS.map((id) => `/kits/${id}.html`)]);
const PRODUCT_GUARD_PATHS = [
  "/products/ai-ops-diagnostic-kit.md",
  "/products/ai-ops-control-matrix.csv"
];
const FORBIDDEN_PUBLIC_HTML_PATTERNS = [
  ["<script", /<script/i],
  ["<form", /<form/i],
  ["mailto:", /mailto:/i],
  ["tel:", /tel:/i],
  ["secret-like token", /\b(?:sk|rk|whsec|pk)_(?:live|test)_[A-Za-z0-9]+/],
  ["unsupported guarantee", /売上保証|返金保証|必ず削減|法令対応済み|監査済み|審査通過済み|Stripe承認済み/i],
  ["stale remote B2B positioning", /remote\s+B2B/i]
];
const ACTIVE_CHECKOUT_STALE_PATTERNS = [
  ["disabled checkout label", /Payments not yet enabled/i],
  ["checkout not active", /checkout\s+(?:is\s+)?not active yet/i],
  ["checkout not connected", /checkout links?\s+(?:are|is)\s+not\s+(?:yet\s+)?connected/i],
  ["payments disabled", /payments\s+(?:are\s+)?(?:not yet enabled|remain disabled)/i],
  ["payment cannot be collected", /(?:money|payment|payments)\s+cannot\s+be\s+collected|cannot\s+collect\s+payment/i],
  ["pending activation", /pending activation/i]
];

function parseArgs(args) {
  const parsed = {
    baseUrl: DEFAULT_BASE_URL,
    expectCheckout: "pending",
    checkoutManifest: "",
    sourceSitemap: ""
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base-url") {
      parsed.baseUrl = args[index + 1] || "";
      index += 1;
    } else if (arg === "--expect-checkout") {
      parsed.expectCheckout = args[index + 1] || "";
      index += 1;
    } else if (arg === "--checkout-manifest") {
      parsed.checkoutManifest = args[index + 1] || "";
      index += 1;
    } else if (arg === "--source-sitemap") {
      parsed.sourceSitemap = args[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  parsed.baseUrl = parsed.baseUrl.replace(/\/+$/, "");
  if (!/^https:\/\/[^/]+/.test(parsed.baseUrl)) {
    throw new Error("--base-url must be an HTTPS origin.");
  }
  if (!["pending", "active"].includes(parsed.expectCheckout)) {
    throw new Error("--expect-checkout must be pending or active.");
  }
  if (parsed.expectCheckout === "active" && !parsed.checkoutManifest) {
    throw new Error("--expect-checkout active requires --checkout-manifest for exact hosted URL verification.");
  }

  return parsed;
}

function pathToUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: options.redirect || "follow",
    headers: {
      "user-agent": "billion-ai-live-verifier/1.0"
    }
  });
  const text = await response.text();
  return { response, text };
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function extractCanonical(html) {
  const match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return match ? match[1] : "";
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function escapeHtmlAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function extractAnchorAttributes(anchor) {
  const attrs = {};
  const attrPattern = /\s([A-Za-z0-9:-]+)="([^"]*)"/g;
  for (const match of anchor.matchAll(attrPattern)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function collectStripeAnchors(html) {
  const anchors = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const anchor = match[0];
    if (/https:\/\/(?:buy|checkout)\.stripe\.com/i.test(anchor)) {
      anchors.push({
        anchor,
        attrs: extractAnchorAttributes(anchor)
      });
    }
  }
  return anchors;
}

function buildActiveCheckoutExpectations(manifest) {
  if (!manifest) {
    return null;
  }

  return new Map(manifest.products.map((product) => [
    product.id,
    escapeHtmlAttr(product.checkout_url.trim())
  ]));
}

async function loadActiveCheckoutManifest(manifestPath, errors) {
  if (!manifestPath) {
    return null;
  }

  const { raw, manifest } = await readCheckoutManifest(manifestPath);
  const manifestErrors = validateCheckoutManifest(manifest, raw, { requireActive: true });
  if (manifestErrors.length > 0) {
    for (const error of manifestErrors) {
      errors.push(`checkout manifest: ${error}`);
    }
    return null;
  }

  return manifest;
}

function validateActiveCheckoutCopy(url, html, errors) {
  for (const [label, pattern] of ACTIVE_CHECKOUT_STALE_PATTERNS) {
    if (pattern.test(html)) {
      errors.push(`${url} active checkout mode must not leave stale pending-checkout copy: ${label}.`);
    }
  }
}

function validateStripeCheckoutAnchors(url, html, activeCheckoutUrls, activeCounts, errors) {
  const stripeAnchors = collectStripeAnchors(html);
  const rawStripeUrls = [...html.matchAll(/https:\/\/(?:buy|checkout)\.stripe\.com[^"'<\s)]*/gi)];
  const pathname = new URL(url).pathname || "/";

  if (stripeAnchors.length !== rawStripeUrls.length) {
    errors.push(`${url} Stripe checkout URLs must appear only inside purchase anchor href attributes.`);
  }

  if (stripeAnchors.length > 0 && !CHECKOUT_TARGET_PATHS.has(pathname)) {
    errors.push(`${url} Stripe checkout anchors are allowed only on homepage and kit detail pages.`);
  }

  for (const { anchor, attrs } of stripeAnchors) {
    const productId = attrs["data-checkout-product"] || "";
    const expectedUrl = activeCheckoutUrls.get(productId);
    if (!expectedUrl) {
      errors.push(`${url} Stripe checkout anchor has missing or unknown data-checkout-product.`);
      continue;
    }
    if (attrs.href !== expectedUrl) {
      errors.push(`${url} checkout href for ${productId} does not match the active manifest.`);
    }
    if (attrs.rel !== "nofollow sponsored noopener") {
      errors.push(`${url} checkout anchor for ${productId} must include rel="nofollow sponsored noopener".`);
    }
    if (!/class="button primary"/.test(anchor) || /disabled-link/.test(anchor)) {
      errors.push(`${url} checkout anchor for ${productId} must be an enabled primary button.`);
    }
    activeCounts.set(productId, (activeCounts.get(productId) || 0) + 1);
  }
}

function isHtmlUrl(url) {
  return url.endsWith(".html") || /\/$/.test(url);
}

function locationHeader(response) {
  return response.headers.get("location") || "";
}

async function verifySitemap(baseUrl, errors) {
  const sitemapUrl = pathToUrl(baseUrl, "/sitemap.xml");
  const { response, text } = await fetchText(sitemapUrl);
  if (response.status !== 200) {
    errors.push(`sitemap.xml returned HTTP ${response.status}.`);
    return [];
  }

  const urls = extractSitemapUrls(text);
  if (urls.length < MIN_SITEMAP_URLS) {
    errors.push(`sitemap.xml has ${urls.length} URLs; expected at least ${MIN_SITEMAP_URLS}.`);
  }
  if (urls.some((url) => url.includes("/products/"))) {
    errors.push("sitemap.xml must not include /products/ URLs.");
  }
  if (urls.some((url) => url.includes("/delivery/"))) {
    errors.push("sitemap.xml must not include /delivery/ URLs.");
  }
  if (urls.some((url) => !url.startsWith(`${baseUrl}/`) && url !== `${baseUrl}/`)) {
    errors.push("sitemap.xml contains URLs outside the configured base URL.");
  }

  return urls;
}

async function verifySourceSitemapParity(sourceSitemapPath, liveUrls, errors) {
  if (!sourceSitemapPath) {
    return;
  }

  const sourceUrls = extractSitemapUrls(await readFile(sourceSitemapPath, "utf8"));
  const liveUrlSet = new Set(liveUrls);
  const sourceUrlSet = new Set(sourceUrls);
  const missing = sourceUrls.filter((url) => !liveUrlSet.has(url));
  const extra = liveUrls.filter((url) => !sourceUrlSet.has(url));

  if (missing.length > 0) {
    errors.push(`live sitemap is missing ${missing.length} source URLs: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    errors.push(`live sitemap has ${extra.length} URLs not in source sitemap: ${extra.join(", ")}`);
  }
}

async function verifyPublicUrls(urls, expectCheckout, activeCheckoutUrls, errors) {
  let htmlPages = 0;
  let checkoutMarkers = 0;
  let disabledCheckoutLabels = 0;
  let stripeAnchors = 0;
  const activeCounts = new Map();

  for (const url of urls) {
    const { response, text } = await fetchText(url);
    if (response.status !== 200) {
      errors.push(`${url} returned HTTP ${response.status}.`);
      continue;
    }

    if (!isHtmlUrl(url)) {
      continue;
    }

    htmlPages += 1;
    const canonical = extractCanonical(text);
    if (canonical !== url) {
      errors.push(`${url} canonical must be ${url}, got ${canonical || "(missing)"}.`);
    }
    for (const [label, pattern] of FORBIDDEN_PUBLIC_HTML_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`${url} contains forbidden public HTML pattern: ${label}.`);
      }
    }
    if (/href="\/products\/|https:\/\/billionai\.vercel\.app\/products\//i.test(text)) {
      errors.push(`${url} links to /products/.`);
    }
    if (/href="\/delivery\/|https:\/\/billionai\.vercel\.app\/delivery\//i.test(text)) {
      errors.push(`${url} links directly to /delivery/.`);
    }

    checkoutMarkers += countMatches(text, /data-checkout-product="/g);
    disabledCheckoutLabels += countMatches(text, /Payments not yet enabled/g);
    stripeAnchors += countMatches(text, /href="https:\/\/(?:buy|checkout)\.stripe\.com/gi);
    if (activeCheckoutUrls) {
      validateStripeCheckoutAnchors(url, text, activeCheckoutUrls, activeCounts, errors);
      validateActiveCheckoutCopy(url, text, errors);
    }
  }

  if (checkoutMarkers !== EXPECTED_CHECKOUT_MARKERS) {
    errors.push(`expected ${EXPECTED_CHECKOUT_MARKERS} checkout CTA markers on live pages, got ${checkoutMarkers}.`);
  }

  if (expectCheckout === "pending") {
    if (stripeAnchors !== 0) {
      errors.push(`pending checkout must not expose Stripe checkout anchors, got ${stripeAnchors}.`);
    }
    if (disabledCheckoutLabels !== EXPECTED_CHECKOUT_MARKERS) {
      errors.push(`pending checkout should show ${EXPECTED_CHECKOUT_MARKERS} disabled checkout labels, got ${disabledCheckoutLabels}.`);
    }
  } else {
    if (stripeAnchors !== EXPECTED_CHECKOUT_MARKERS) {
      errors.push(`active checkout should expose ${EXPECTED_CHECKOUT_MARKERS} Stripe checkout anchors, got ${stripeAnchors}.`);
    }
    if (disabledCheckoutLabels !== 0) {
      errors.push("active checkout must not leave disabled checkout labels.");
    }
    for (const productId of EXPECTED_PRODUCT_IDS) {
      const count = activeCounts.get(productId) || 0;
      if (count !== 2) {
        errors.push(`${productId}: active checkout should expose exactly 2 manifest-matched anchors, got ${count}.`);
      }
    }
  }

  return { htmlPages, checkoutMarkers, disabledCheckoutLabels, stripeAnchors };
}

async function verifyDeliveryNoindex(baseUrl, errors) {
  for (const path of DELIVERY_PATHS) {
    const url = pathToUrl(baseUrl, path);
    const { response, text } = await fetchText(url);
    if (response.status !== 200) {
      errors.push(`${url} returned HTTP ${response.status}.`);
      continue;
    }
    if (!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(text)) {
      errors.push(`${url} must include noindex robots metadata.`);
    }
    if (/href="\/products\/|https:\/\/billionai\.vercel\.app\/products\//i.test(text)) {
      errors.push(`${url} delivery manifest links to /products/.`);
    }
  }
}

async function verifyProductsRedirect(baseUrl, errors) {
  for (const path of PRODUCT_GUARD_PATHS) {
    const url = pathToUrl(baseUrl, path);
    const { response } = await fetchText(url, { redirect: "manual" });
    const location = locationHeader(response);
    if (![301, 302, 307, 308].includes(response.status)) {
      errors.push(`${url} should redirect to /delivery-access, got HTTP ${response.status}.`);
      continue;
    }
    if (!location.endsWith("/delivery-access") && !location.endsWith("/delivery-access.html")) {
      errors.push(`${url} redirect location should be /delivery-access, got ${location || "(missing)"}.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  const activeManifest = await loadActiveCheckoutManifest(args.checkoutManifest, errors);
  const activeCheckoutUrls = buildActiveCheckoutExpectations(activeManifest);

  const sitemapUrls = await verifySitemap(args.baseUrl, errors);
  await verifySourceSitemapParity(args.sourceSitemap, sitemapUrls, errors);
  const publicStats = await verifyPublicUrls(sitemapUrls, args.expectCheckout, activeCheckoutUrls, errors);
  await verifyDeliveryNoindex(args.baseUrl, errors);
  await verifyProductsRedirect(args.baseUrl, errors);

  if (errors.length > 0) {
    console.error("Live production verification failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    [
      "Live production verification OK:",
      `${sitemapUrls.length} sitemap URLs,`,
      `${publicStats.htmlPages} public HTML pages,`,
      `${publicStats.checkoutMarkers} checkout CTA markers,`,
      `checkout ${args.expectCheckout}.`
    ].join(" ")
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
