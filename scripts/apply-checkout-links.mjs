#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_PRODUCTS,
  readCheckoutManifest,
  validateCheckoutManifest
} from "./validate-checkout-links.mjs";

const CTA_TARGETS = {
  "ai-ops-diagnostic-kit": ["index.html", "kits/ai-ops-diagnostic-kit.html"],
  "rfp-radar-setup-kit": ["index.html", "kits/rfp-radar-setup-kit.html"],
  "reception-ai-pilot-kit": ["index.html", "kits/reception-ai-pilot-kit.html"],
  "ai-operations-starter-bundle": ["index.html", "kits/ai-operations-starter-bundle.html"]
};

const PRODUCT_MARKERS = {
  "ai-ops-diagnostic-kit": "AI Ops Diagnostic Kit",
  "rfp-radar-setup-kit": "RFP Radar Setup Kit",
  "reception-ai-pilot-kit": "Reception AI Pilot Kit",
  "ai-operations-starter-bundle": "AI Operations Starter Bundle"
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtmlAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function buildPatterns(productId) {
  const id = escapeRegExp(productId);
  return [
    new RegExp(
      `<a class="button primary disabled-link" href="#checkout-activation-required" data-checkout-product="${id}">Payments not yet enabled</a>`,
      "g"
    ),
    new RegExp(
      `<a class="button primary disabled-link" href="/#checkout-activation-required" data-checkout-product="${id}">Payments not yet enabled</a>`,
      "g"
    ),
    new RegExp(
      `<a class="button primary" href="[^"]+" rel="nofollow sponsored noopener" data-checkout-product="${id}">Buy now</a>`,
      "g"
    )
  ];
}

function replaceInProductSection(html, productId, checkoutUrl) {
  const replacement = `<a class="button primary" href="${escapeHtmlAttr(checkoutUrl)}" rel="nofollow sponsored noopener" data-checkout-product="${productId}">Buy now</a>`;
  const marker = PRODUCT_MARKERS[productId];
  const markerIndex = html.indexOf(`<h3>${marker}</h3>`) >= 0
    ? html.indexOf(`<h3>${marker}</h3>`)
    : html.indexOf(`<h1>${marker}</h1>`);

  if (markerIndex < 0) {
    return { output: html, replaced: 0 };
  }

  const sectionEnd = html.indexOf("</article>", markerIndex) >= 0
    ? html.indexOf("</article>", markerIndex)
    : html.indexOf("</section>", markerIndex);
  if (sectionEnd < 0) {
    return { output: html, replaced: 0 };
  }

  const before = html.slice(0, markerIndex);
  const section = html.slice(markerIndex, sectionEnd);
  const after = html.slice(sectionEnd);
  const disabledAnchorPattern =
    /<a class="button primary disabled-link" href="(?:\/#checkout-activation-required|#checkout-activation-required)">Payments not yet enabled<\/a>/g;
  const matches = [...section.matchAll(disabledAnchorPattern)];

  if (matches.length !== 1) {
    return { output: html, replaced: matches.length };
  }

  return {
    output: before + section.replace(matches[0][0], replacement) + after,
    replaced: 1
  };
}

function replaceProductCta(html, productId, checkoutUrl) {
  const replacement = `<a class="button primary" href="${escapeHtmlAttr(checkoutUrl)}" rel="nofollow sponsored noopener" data-checkout-product="${productId}">Buy now</a>`;
  const matches = [];

  for (const pattern of buildPatterns(productId)) {
    matches.push(...html.matchAll(pattern));
  }

  if (matches.length !== 1) {
    if (matches.length === 0) {
      return replaceInProductSection(html, productId, checkoutUrl);
    }
    return { output: html, replaced: matches.length };
  }

  return {
    output: html.replace(matches[0][0], replacement),
    replaced: 1
  };
}

function productMapFromManifest(manifest) {
  return new Map(manifest.products.map((product) => [product.id, product]));
}

async function applyCheckoutLinks(manifestPath, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const root = path.resolve(path.dirname(manifestPath), "..");
  const { raw, manifest } = await readCheckoutManifest(manifestPath);
  const errors = validateCheckoutManifest(manifest, raw, { requireActive: true });

  if (errors.length > 0) {
    throw new Error(`Checkout manifest is not active-safe:\n- ${errors.join("\n- ")}`);
  }

  const productMap = productMapFromManifest(manifest);
  const fileWrites = new Map();
  const replacements = [];

  for (const productId of Object.keys(EXPECTED_PRODUCTS)) {
    const product = productMap.get(productId);
    const targets = CTA_TARGETS[productId];

    for (const relativeFile of targets) {
      const filePath = path.join(root, relativeFile);
      const existing = fileWrites.has(filePath) ? fileWrites.get(filePath) : await readFile(filePath, "utf8");
      const { output, replaced } = replaceProductCta(existing, productId, product.checkout_url.trim());

      if (replaced !== 1) {
        throw new Error(`${relativeFile}: expected exactly one CTA replacement for ${productId}, got ${replaced}.`);
      }

      fileWrites.set(filePath, output);
      replacements.push(`${relativeFile}: ${productId}`);
    }
  }

  if (!dryRun) {
    for (const [filePath, output] of fileWrites) {
      await writeFile(filePath, output, "utf8");
    }
  }

  return replacements;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const manifestArg = args.find((arg) => !arg.startsWith("--"));

  if (!manifestArg) {
    console.error("Usage: node scripts/apply-checkout-links.mjs checkout/checkout-links.local.json [--dry-run]");
    process.exitCode = 1;
    return;
  }

  const manifestPath = path.resolve(process.cwd(), manifestArg);
  const replacements = await applyCheckoutLinks(manifestPath, { dryRun });

  console.log(`${dryRun ? "Dry run OK" : "Applied"}: ${replacements.length} checkout CTA replacements.`);
  for (const replacement of replacements) {
    console.log(`- ${replacement}`);
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
