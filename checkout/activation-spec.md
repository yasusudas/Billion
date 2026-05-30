# Checkout Activation Spec

This file describes the no-touch checkout connection for Billion AI Operations Studio.
It does not create payment links and does not contain API keys, payout data, buyer
records, or private account-owner details.

## Required hosted checkout links

Create one provider-hosted checkout link per product in the payment provider.
The public storefront price and hosted checkout amount must match exactly.

| Product ID | Public product name | Amount | Success URL |
| --- | --- | ---: | --- |
| `ai-ops-diagnostic-kit` | AI Ops Diagnostic Kit | JPY 9,800 | `https://billionai.vercel.app/delivery/ai-ops-diagnostic-kit.html` |
| `rfp-radar-setup-kit` | RFP Radar Setup Kit | JPY 7,800 | `https://billionai.vercel.app/delivery/rfp-radar-setup-kit.html` |
| `reception-ai-pilot-kit` | Reception AI Pilot Kit | JPY 6,800 | `https://billionai.vercel.app/delivery/reception-ai-pilot-kit.html` |
| `ai-operations-starter-bundle` | AI Operations Starter Bundle | JPY 19,800 | `https://billionai.vercel.app/delivery/ai-operations-starter-bundle.html` |
| `ai-operations-team-rollout-pack` | AI Operations Team Rollout Pack | JPY 98,000 | `https://billionai.vercel.app/delivery/ai-operations-team-rollout-pack.html` |

## Activation workflow

1. Copy `checkout/checkout-links.example.json` to `checkout/checkout-links.local.json`.
2. Change `mode` to `active`.
3. Replace each `checkout_url` with the matching hosted checkout URL copied from the payment provider.
4. Keep `business_name`, product names, amounts, and success URLs unchanged unless the public storefront is also updated.
5. Run:

```bash
node scripts/validate-checkout-links.mjs checkout/checkout-links.local.json --require-active
```

6. If validation passes, dry-run the static replacement. The dry run checks the purchase
   CTA replacements and the pending-to-active public copy replacements without editing files:

```bash
node scripts/apply-checkout-links.mjs checkout/checkout-links.local.json --dry-run
```

7. Apply the links and active checkout status copy to the static HTML:

```bash
node scripts/apply-checkout-links.mjs checkout/checkout-links.local.json
```

8. Re-run the active public-site static scan and publish the changed HTML to GitHub:

```bash
node scripts/verify-public-site.mjs --checkout-manifest checkout/checkout-links.local.json --require-active
```

9. After Vercel reports success, verify production with exact manifest matching:

```bash
node scripts/verify-live-production.mjs --expect-checkout active --checkout-manifest checkout/checkout-links.local.json
```

## Hard stops

- Do not put API keys, signing secrets, payout settings, identity details, tax identifiers, customer logs, card data, invoice IDs, or private buyer data in this repository.
- Do not activate a checkout link if the amount, currency, product name, or success URL does not match the table above.
- Use reusable provider-hosted Payment Links for static pages. Do not paste one-time Checkout Session URLs.
- Do not reuse the same hosted checkout URL across multiple products.
- Do not add custom payment forms, tracking scripts, customer upload fields, or manual support inbox links to the static site.
- Do not update revenue records until a real provider or account-owner payment fact exists.
- Do not publish active checkout while public pages still say checkout or payments are pending.

## CTA replacement map

The static HTML has one disabled purchase CTA on the homepage and one disabled
purchase CTA on the kit detail page for each product. The apply script replaces
only the CTA inside the matching product section.

| Product ID | Homepage CTA | Kit detail CTA |
| --- | --- | --- |
| `ai-ops-diagnostic-kit` | `/` store card | `/kits/ai-ops-diagnostic-kit.html` |
| `rfp-radar-setup-kit` | `/` store card | `/kits/rfp-radar-setup-kit.html` |
| `reception-ai-pilot-kit` | `/` store card | `/kits/reception-ai-pilot-kit.html` |
| `ai-operations-starter-bundle` | `/` store card | `/kits/ai-operations-starter-bundle.html` |
| `ai-operations-team-rollout-pack` | `/` store card | `/kits/ai-operations-team-rollout-pack.html` |
