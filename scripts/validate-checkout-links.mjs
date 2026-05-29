#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_PRODUCTS = {
  "ai-ops-diagnostic-kit": {
    name: "AI Ops Diagnostic Kit",
    amount_jpy: 9800,
    currency: "JPY",
    kit_page: "/kits/ai-ops-diagnostic-kit.html",
    delivery_success_url: "https://billionai.vercel.app/delivery/ai-ops-diagnostic-kit.html"
  },
  "rfp-radar-setup-kit": {
    name: "RFP Radar Setup Kit",
    amount_jpy: 7800,
    currency: "JPY",
    kit_page: "/kits/rfp-radar-setup-kit.html",
    delivery_success_url: "https://billionai.vercel.app/delivery/rfp-radar-setup-kit.html"
  },
  "reception-ai-pilot-kit": {
    name: "Reception AI Pilot Kit",
    amount_jpy: 6800,
    currency: "JPY",
    kit_page: "/kits/reception-ai-pilot-kit.html",
    delivery_success_url: "https://billionai.vercel.app/delivery/reception-ai-pilot-kit.html"
  },
  "ai-operations-starter-bundle": {
    name: "AI Operations Starter Bundle",
    amount_jpy: 19800,
    currency: "JPY",
    kit_page: "/kits/ai-operations-starter-bundle.html",
    delivery_success_url: "https://billionai.vercel.app/delivery/ai-operations-starter-bundle.html"
  }
};

const ALLOWED_CHECKOUT_HOSTS = new Set(["buy.stripe.com", "checkout.stripe.com"]);
const SECRET_OR_PRIVATE_TOKEN_PATTERN =
  /\b(sk|rk|whsec)_(live|test)_[A-Za-z0-9]+|\bpk_(live|test)_[A-Za-z0-9]+|\b(?:pi|cs|in|cus|acct)_[A-Za-z0-9]{10,}/;
const PENDING_VALUES = new Set(["", "PENDING_HOSTED_CHECKOUT_URL"]);

function fail(errors, message) {
  errors.push(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeProducts(products) {
  const productMap = new Map();

  for (const product of products) {
    if (!isPlainObject(product)) {
      throw new Error("Every product entry must be an object.");
    }
    if (typeof product.id !== "string" || product.id.length === 0) {
      throw new Error("Every product entry must include a non-empty id.");
    }
    if (productMap.has(product.id)) {
      throw new Error(`Duplicate product id: ${product.id}`);
    }
    productMap.set(product.id, product);
  }

  return productMap;
}

function validateHostedCheckoutUrl(product, requireActive, errors) {
  const checkoutUrl = typeof product.checkout_url === "string" ? product.checkout_url.trim() : "";

  if (PENDING_VALUES.has(checkoutUrl)) {
    if (requireActive) {
      fail(errors, `${product.id}: checkout_url is still pending.`);
    }
    return;
  }

  let parsed;
  try {
    parsed = new URL(checkoutUrl);
  } catch {
    fail(errors, `${product.id}: checkout_url must be a valid absolute URL.`);
    return;
  }

  if (parsed.protocol !== "https:") {
    fail(errors, `${product.id}: checkout_url must use HTTPS.`);
  }

  if (!ALLOWED_CHECKOUT_HOSTS.has(parsed.hostname)) {
    fail(errors, `${product.id}: checkout_url host must be Stripe-hosted (${[...ALLOWED_CHECKOUT_HOSTS].join(", ")}).`);
  }

  if (parsed.hostname === "buy.stripe.com" && /^\/test_/i.test(parsed.pathname)) {
    fail(errors, `${product.id}: checkout_url appears to be a Stripe test-mode payment link.`);
  }

  if (/[\r\n\t]/.test(checkoutUrl)) {
    fail(errors, `${product.id}: checkout_url contains control whitespace.`);
  }

  if (/(\/delivery\/|\/products\/)/i.test(checkoutUrl)) {
    fail(errors, `${product.id}: checkout_url must not point directly to delivery or product files.`);
  }

  if (SECRET_OR_PRIVATE_TOKEN_PATTERN.test(checkoutUrl)) {
    fail(errors, `${product.id}: checkout_url appears to include a private provider identifier or key-like value.`);
  }
}

function validateProduct(product, expected, requireActive, errors) {
  for (const key of ["name", "currency", "kit_page", "delivery_success_url"]) {
    if (product[key] !== expected[key]) {
      fail(errors, `${product.id}: ${key} must be ${expected[key]}.`);
    }
  }

  if (product.amount_jpy !== expected.amount_jpy) {
    fail(errors, `${product.id}: amount_jpy must be ${expected.amount_jpy}.`);
  }

  validateHostedCheckoutUrl(product, requireActive, errors);
}

export async function readCheckoutManifest(manifestPath) {
  const raw = await readFile(manifestPath, "utf8");
  return {
    raw,
    manifest: JSON.parse(raw)
  };
}

export function validateCheckoutManifest(manifest, raw, options = {}) {
  const requireActive = Boolean(options.requireActive);
  const errors = [];

  if (!isPlainObject(manifest)) {
    fail(errors, "Manifest must be a JSON object.");
    return errors;
  }

  if (SECRET_OR_PRIVATE_TOKEN_PATTERN.test(raw)) {
    fail(errors, "Manifest appears to contain a private provider identifier or key-like value.");
  }

  if (manifest.schema !== "billion-ai-checkout-links/v1") {
    fail(errors, "schema must be billion-ai-checkout-links/v1.");
  }

  if (manifest.business_name !== "Billion AI Operations Studio") {
    fail(errors, "business_name must be Billion AI Operations Studio.");
  }

  if (manifest.site_url !== "https://billionai.vercel.app/") {
    fail(errors, "site_url must be https://billionai.vercel.app/.");
  }

  if (manifest.provider !== "stripe") {
    fail(errors, "provider must be stripe.");
  }

  if (requireActive && manifest.mode !== "active") {
    fail(errors, "mode must be active when --require-active is used.");
  }

  if (!Array.isArray(manifest.products)) {
    fail(errors, "products must be an array.");
    return errors;
  }

  let productMap;
  try {
    productMap = normalizeProducts(manifest.products);
  } catch (error) {
    fail(errors, error.message);
    return errors;
  }

  const expectedIds = Object.keys(EXPECTED_PRODUCTS).sort();
  const actualIds = [...productMap.keys()].sort();
  if (expectedIds.join("|") !== actualIds.join("|")) {
    fail(errors, `products must include exactly: ${expectedIds.join(", ")}.`);
  }

  for (const id of expectedIds) {
    const product = productMap.get(id);
    if (!product) {
      continue;
    }
    validateProduct(product, EXPECTED_PRODUCTS[id], requireActive, errors);
  }

  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const requireActive = args.includes("--require-active");
  const manifestArg = args.find((arg) => !arg.startsWith("--"));
  const manifestPath = manifestArg || "checkout/checkout-links.example.json";
  const fullPath = path.resolve(process.cwd(), manifestPath);

  const { raw, manifest } = await readCheckoutManifest(fullPath);
  const errors = validateCheckoutManifest(manifest, raw, { requireActive });

  if (errors.length > 0) {
    console.error("Checkout manifest validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const activeCount = manifest.products.filter((product) => {
    const checkoutUrl = typeof product.checkout_url === "string" ? product.checkout_url.trim() : "";
    return !PENDING_VALUES.has(checkoutUrl);
  }).length;

  console.log(`Checkout manifest OK: ${manifest.products.length} products, ${activeCount} active hosted URLs.`);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
