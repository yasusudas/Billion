#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://billionai.vercel.app";
const EXPECTED_PRODUCTS = [
  "ai-ops-diagnostic-kit",
  "rfp-radar-setup-kit",
  "reception-ai-pilot-kit",
  "ai-operations-starter-bundle"
];

const FORBIDDEN_HTML_PATTERNS = [
  ["<script", /<script/i],
  ["<form", /<form/i],
  ["mailto:", /mailto:/i],
  ["tel:", /tel:/i],
  ["Stripe hosted checkout URL", /https:\/\/(?:buy|checkout)\.stripe\.com/i],
  ["custom checkout code", /checkout\.stripe|buy\.stripe/i],
  ["secret-like token", /\b(?:sk|rk|whsec|pk)_(?:live|test)_[A-Za-z0-9]+/],
  ["unsupported guarantee", /売上保証|返金保証|必ず削減|法令対応済み|監査済み|審査通過済み|Stripe承認済み/i]
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

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = [];
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
    ...EXPECTED_PRODUCTS.map((id) => readFile(path.join(root, `kits/${id}.html`), "utf8"))
  ]);
  const checkoutMarkup = checkoutHtml.join("\n");
  const checkoutCount = countMatches(checkoutMarkup, /data-checkout-product="/g);
  if (checkoutCount !== 8) {
    errors.push(`expected 8 data-checkout-product attributes, got ${checkoutCount}.`);
  }

  for (const productId of EXPECTED_PRODUCTS) {
    const count = countMatches(checkoutMarkup, new RegExp(`data-checkout-product="${productId}"`, "g"));
    if (count !== 2) {
      errors.push(`${productId}: expected exactly 2 checkout CTAs, got ${count}.`);
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

  console.log(`Public site verification OK: ${publicHtml.length} public HTML pages, ${deliveryHtml.length} noindex delivery pages, 8 checkout CTAs.`);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
