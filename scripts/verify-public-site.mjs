#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_PRODUCTS,
  readCheckoutManifest,
  validateCheckoutManifest
} from "./validate-checkout-links.mjs";

const SITE_URL = "https://billionai.vercel.app";
const EXPECTED_PRODUCT_IDS = Object.keys(EXPECTED_PRODUCTS);
const EXPECTED_CHECKOUT_MARKERS = EXPECTED_PRODUCT_IDS.length * 2;
const CHECKOUT_TARGET_FILES = new Set(["index.html", ...EXPECTED_PRODUCT_IDS.map((id) => `kits/${id}.html`)]);

const FORBIDDEN_HTML_PATTERNS = [
  ["<script", /<script/i],
  ["<form", /<form/i],
  ["mailto:", /mailto:/i],
  ["tel:", /tel:/i],
  ["secret-like token", /\b(?:sk|rk|whsec|pk)_(?:live|test)_[A-Za-z0-9]+/],
  ["stale remote B2B positioning", /remote\s+B2B/i],
  ["unsupported guarantee", /売上保証|返金保証|必ず削減|法令対応済み|監査済み|審査通過済み|Stripe承認済み/i]
];

const ACTIVE_CHECKOUT_STALE_PATTERNS = [
  ["disabled checkout label", /Payments not yet enabled/i],
  ["checkout not active", /checkout\s+(?:is\s+)?not active yet/i],
  ["checkout not connected", /checkout links?\s+(?:are|is)\s+not\s+(?:yet\s+)?connected/i],
  ["payments disabled", /payments\s+(?:are\s+)?(?:not yet enabled|remain disabled)/i],
  ["payment cannot be collected", /(?:money|payment|payments)\s+cannot\s+be\s+collected|cannot\s+collect\s+payment/i],
  ["pending activation", /pending activation/i]
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function expectedUrl(relativePath) {
  const posixPath = toPosix(relativePath);
  if (posixPath === "index.html") {
    return `${SITE_URL}/`;
  }
  return `${SITE_URL}/${posixPath}`;
}

function extractCanonical(html) {
  const match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return match ? match[1] : "";
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function parseArgs(args) {
  const parsed = {
    checkoutManifest: "",
    requireActive: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--require-active") {
      parsed.requireActive = true;
    } else if (arg === "--checkout-manifest") {
      parsed.checkoutManifest = args[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.requireActive && !parsed.checkoutManifest) {
    throw new Error("--require-active requires --checkout-manifest.");
  }

  return parsed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function validateStripeCheckoutAnchors(relativeFile, html, activeCheckoutUrls, errors) {
  const stripeAnchors = collectStripeAnchors(html);
  const rawStripeUrls = [...html.matchAll(/https:\/\/(?:buy|checkout)\.stripe\.com[^"'<\s)]*/gi)];

  if (!activeCheckoutUrls) {
    if (rawStripeUrls.length > 0) {
      errors.push(`${relativeFile}: Stripe checkout URLs require --checkout-manifest active verification.`);
    }
    return;
  }

  if (stripeAnchors.length !== rawStripeUrls.length) {
    errors.push(`${relativeFile}: Stripe checkout URL must appear only inside purchase anchor href attributes.`);
  }

  if (stripeAnchors.length > 0 && !CHECKOUT_TARGET_FILES.has(toPosix(relativeFile))) {
    errors.push(`${relativeFile}: Stripe checkout anchors are allowed only on homepage and kit detail pages.`);
  }

  for (const { anchor, attrs } of stripeAnchors) {
    const productId = attrs["data-checkout-product"] || "";
    const expectedUrl = activeCheckoutUrls.get(productId);
    if (!expectedUrl) {
      errors.push(`${relativeFile}: Stripe checkout anchor has missing or unknown data-checkout-product.`);
      continue;
    }
    if (attrs.href !== expectedUrl) {
      errors.push(`${relativeFile}: checkout href for ${productId} does not match the active manifest.`);
    }
    if (attrs.rel !== "nofollow sponsored noopener") {
      errors.push(`${relativeFile}: checkout anchor for ${productId} must include rel="nofollow sponsored noopener".`);
    }
    if (!/class="button primary"/.test(anchor) || /disabled-link/.test(anchor)) {
      errors.push(`${relativeFile}: checkout anchor for ${productId} must be an enabled primary button.`);
    }
  }
}

function validateActiveCheckoutCopy(relativeFile, html, errors) {
  for (const [label, pattern] of ACTIVE_CHECKOUT_STALE_PATTERNS) {
    if (pattern.test(html)) {
      errors.push(`${relativeFile}: active checkout mode must not leave stale pending-checkout copy: ${label}.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = [];
  let activeCheckoutUrls = null;

  if (args.checkoutManifest) {
    const manifestPath = path.resolve(process.cwd(), args.checkoutManifest);
    const { raw, manifest } = await readCheckoutManifest(manifestPath);
    const manifestErrors = validateCheckoutManifest(manifest, raw, { requireActive: args.requireActive });
    if (manifestErrors.length > 0) {
      for (const error of manifestErrors) {
        errors.push(`checkout manifest: ${error}`);
      }
    } else if (args.requireActive) {
      activeCheckoutUrls = buildActiveCheckoutExpectations(manifest);
    }
  }

  const allFiles = await walk(root);
  const htmlFiles = allFiles
    .filter((file) => file.endsWith(".html"))
    .map((file) => path.relative(root, file))
    .sort();

  const publicHtml = htmlFiles.filter((file) => !toPosix(file).startsWith("delivery/") && !toPosix(file).startsWith("products/"));
  const deliveryHtml = htmlFiles.filter((file) => toPosix(file).startsWith("delivery/"));
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");

  if (/\/products\/|https:\/\/billionai\.vercel\.app\/delivery\//.test(sitemap)) {
    errors.push("sitemap.xml must not include /products/ or /delivery/ URLs.");
  }

  for (const relativeFile of publicHtml) {
    const html = await readFile(path.join(root, relativeFile), "utf8");
    const canonical = extractCanonical(html);
    const url = expectedUrl(relativeFile);

    if (!sitemap.includes(`<loc>${url}</loc>`)) {
      errors.push(`${relativeFile}: missing from sitemap.xml as ${url}`);
    }

    if (canonical !== url) {
      errors.push(`${relativeFile}: canonical must be ${url}, got ${canonical || "(missing)"}`);
    }

    for (const [label, pattern] of FORBIDDEN_HTML_PATTERNS) {
      if (pattern.test(html)) {
        errors.push(`${relativeFile}: forbidden public HTML pattern detected: ${label}`);
      }
    }

    validateStripeCheckoutAnchors(relativeFile, html, activeCheckoutUrls, errors);
    if (activeCheckoutUrls) {
      validateActiveCheckoutCopy(relativeFile, html, errors);
    }

    if (/href="\/products\/|https:\/\/billionai\.vercel\.app\/products\//i.test(html)) {
      errors.push(`${relativeFile}: public page must not link to /products/`);
    }

    if (/href="\/delivery\/|https:\/\/billionai\.vercel\.app\/delivery\//i.test(html)) {
      errors.push(`${relativeFile}: public page must not link directly to /delivery/`);
    }
  }

  for (const relativeFile of deliveryHtml) {
    const html = await readFile(path.join(root, relativeFile), "utf8");
    if (!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
      errors.push(`${relativeFile}: delivery page must include noindex robots metadata.`);
    }
    if (/href="\/products\/|https:\/\/billionai\.vercel\.app\/products\//i.test(html)) {
      errors.push(`${relativeFile}: delivery manifest must not link to /products/`);
    }
  }

  const checkoutHtml = await Promise.all([
    readFile(path.join(root, "index.html"), "utf8"),
    ...EXPECTED_PRODUCT_IDS.map((id) => readFile(path.join(root, `kits/${id}.html`), "utf8"))
  ]);
  const checkoutMarkup = checkoutHtml.join("\n");
  const checkoutCount = countMatches(checkoutMarkup, /data-checkout-product="/g);
  if (![0, EXPECTED_CHECKOUT_MARKERS].includes(checkoutCount)) {
    errors.push(`expected either 0 legacy checkout markers or ${EXPECTED_CHECKOUT_MARKERS} activation-ready data-checkout-product attributes, got ${checkoutCount}.`);
  }

  if (checkoutCount === EXPECTED_CHECKOUT_MARKERS) {
    for (const productId of EXPECTED_PRODUCT_IDS) {
      const count = countMatches(checkoutMarkup, new RegExp(`data-checkout-product="${productId}"`, "g"));
      if (count !== 2) {
        errors.push(`${productId}: expected exactly 2 checkout CTAs, got ${count}.`);
      }
    }
  }

  if (activeCheckoutUrls) {
    if (/Payments not yet enabled/.test(checkoutMarkup)) {
      errors.push("active checkout verification must not leave disabled checkout CTA text.");
    }
    for (const [productId, checkoutUrl] of activeCheckoutUrls) {
      const anchorPattern = new RegExp(
        `<a class="button primary" href="${escapeRegExp(checkoutUrl)}" rel="nofollow sponsored noopener" data-checkout-product="${productId}">Buy now<\\/a>`,
        "g"
      );
      const activeCount = countMatches(checkoutMarkup, anchorPattern);
      if (activeCount !== 2) {
        errors.push(`${productId}: expected exactly 2 active checkout anchors from manifest, got ${activeCount}.`);
      }
    }
  }

  const vercelIgnorePath = path.join(root, ".vercelignore");
  try {
    const vercelIgnore = await readFile(vercelIgnorePath, "utf8");
    if (!/products\/\*\*/.test(vercelIgnore)) {
      errors.push(".vercelignore must exclude products/**.");
    }
    if (!/checkout\/checkout-links\.local\.json/.test(vercelIgnore)) {
      errors.push(".vercelignore must exclude checkout/checkout-links.local.json.");
    }
  } catch {
    errors.push(".vercelignore is missing.");
  }

  const productsPath = path.join(root, "products");
  try {
    const productsStat = await stat(productsPath);
    if (productsStat.isDirectory()) {
      const productFiles = (await walk(productsPath)).filter((file) => !file.endsWith(".DS_Store"));
      if (productFiles.length > 0) {
        errors.push(`products/ contains ${productFiles.length} local paid files; move them outside the deploy root.`);
      }
    }
  } catch {
    // Missing products/ is the desired deploy-root state.
  }

  if (errors.length > 0) {
    console.error("Public site verification failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const checkoutMode = activeCheckoutUrls ? "active checkout verified" : "pending checkout verified";
  console.log(`Public site verification OK: ${publicHtml.length} public HTML pages, ${deliveryHtml.length} noindex delivery pages, ${checkoutCount} checkout CTA markers, ${checkoutMode}.`);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
