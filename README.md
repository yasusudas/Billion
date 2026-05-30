# Billion AI Operations Studio

Stripe business verification, Vercel-ready public website, and self-serve digital product storefront for `Billion AI Operations Studio`.

Preferred GitHub repository for Vercel import: `yasusudas/Billion`.

## Recommended Stripe fields

- Business name: `Billion AI Operations Studio`
- Business category: `Professional services / Consulting`
- Business website URL: `https://billionai.vercel.app/`
- Product description: `Billion AI Operations Studio sells self-serve downloadable business templates, checklists, and operating guides for AI operations planning, public RFP monitoring, and reception AI pilot preparation. Products are delivered through hosted checkout success pages or provider-gated fulfillment after checkout activation. This storefront does not provide custom consulting, workshops, manual onboarding, implementation services, buyer-specific advisory support, regulated financial advice, legal representation, medical diagnosis, lending, gambling, or physical goods.`
- Japanese product description: `Billion AI Operations Studioは、法人向けにAI業務運用計画、公開RFP・提案機会の監視、受付・問い合わせ対応AIのパイロット準備に使うセルフサービス型のダウンロード可能なテンプレート、チェックリスト、運用ガイドを販売します。商品はホスト型決済の成功後ページ、または決済事業者側で保護された納品導線で提供されます。このストアフロントでは、個別コンサルティング、ワークショップ、手動オンボーディング、実装支援、購入者別の助言、金融助言、法律代理、医療診断、融資、ギャンブル、物品販売は行いません。`
- Statement descriptor, kanji: `億業務AI支援`
- Statement descriptor, katakana: `ビリオンエーアイスタジオ`
- Statement descriptor, English: `BILLION AI STUDIO`

Use the same business name in Stripe and on the website. The currently reachable Vercel URL is `https://billionai.vercel.app/`. If a renamed Vercel project or custom alias becomes available, submit the resulting production URL instead.

## Vercel

This is a static site. Import the GitHub repository in Vercel and deploy from the repository root.

- Framework preset: `Other`
- Build command: leave empty
- Output directory: `.`
- Current reachable Vercel URL: `https://billionai.vercel.app/`
- Optional future Vercel project name: `billion-ai-operations`

## Self-serve products

- `AI Ops Diagnostic Kit`: JPY 9,800. Includes operating guide, control matrix, risk checklist, ROI readiness calculator, 10-day plan, workflow inventory, and evidence log.
- `RFP Radar Setup Kit`: JPY 7,800. Includes operating guide, source map, keyword tracker, weekly review, opportunity scorecard, response readiness scorecard, and weekly brief template.
- `Reception AI Pilot Kit`: JPY 6,800. Includes operating guide, inquiry map, fallback rules, inquiry volume estimator, acceptance checklist, dry-run script, and operator review log.
- `AI Operations Starter Bundle`: JPY 19,800. Includes all three kits plus a 30-day rollout plan.
- `AI Operations Team Rollout Pack`: JPY 98,000. Includes all three kits plus a team rollout board, department adoption calendar, manager briefing template, and team license README.

## Checkout activation

Hosted checkout URLs are not embedded yet. The checkout connection is prepared
as a guarded static replacement flow:

- `checkout/activation-spec.md` defines the product-to-success-URL map.
- `checkout/checkout-links.example.json` is the safe manifest template.
- `scripts/validate-checkout-links.mjs` checks business name, product IDs,
  exact JPY amounts, Stripe-hosted HTTPS URLs, and key-like private values.
- `scripts/apply-checkout-links.mjs` replaces only disabled purchase CTAs with
  matching product sections after validation passes.

Use a local manifest named `checkout/checkout-links.local.json` for real hosted
checkout URLs. That file is ignored by this project so private setup notes
are not accidentally committed. Public hosted checkout URLs may appear in the
generated HTML only after account-owner activation and validation.

## Files

- `index.html`
- `styles.css`
- `faq.html`
- `compare.html`
- `pricing.html`
- `samples.html`
- `purchase-self-check.html`
- `how-it-works.html`
- `resources.html`
- `no-contact-operation.html`
- `autopilot-commerce.html`
- `autonomous-revenue-readiness.html`
- `receipt-support.html`
- `support.html`
- `delivery-access.html`
- `resources/llm-operations-checklist.html`
- `resources/llm-usage-policy-template.html`
- `resources/ai-agent-governance-template.html`
- `resources/ai-agent-operation-checklist.html`
- `resources/ai-agent-approval-workflow-template.html`
- `resources/ai-operations-governance-checklist.html`
- `resources/generative-ai-internal-use-request-template.html`
- `resources/ai-workflow-inventory-template.html`
- `resources/rfp-monitoring-template.html`
- `resources/rfp-monitoring-excel-template.html`
- `resources/rfp-monitoring-weekly-routine-template.html`
- `resources/rfp-keyword-design-guide.html`
- `resources/reception-ai-requirements.html`
- `resources/reception-ai-prelaunch-checklist.html`
- `resources/reception-ai-human-handoff-template.html`
- `resources/reception-ai-human-handoff-checklist.html`
- `resources/ai-agent-human-review-checklist.html`
- `resources/ai-workflow-evidence-log-template.html`
- `resources/rfp-opportunity-scorecard-template.html`
- `resources/reception-ai-fallback-checklist.html`
- `resources/generative-ai-template-comparison.html`
- `resources/generative-ai-approval-request-template.html`
- `resources/ai-risk-register-template.html`
- `resources/ai-roi-readiness-calculator.html`
- `resources/generative-ai-budget-request-template.html`
- `resources/ai-tool-selection-scorecard.html`
- `resources/ai-pilot-kpi-template.html`
- `resources/ai-team-rollout-roadmap-template.html`
- `resources/department-ai-adoption-calendar-template.html`
- `resources/ai-manager-briefing-template.html`
- `resources/ai-internal-briefing-one-pager.html`
- `resources/generative-ai-90-day-rollout-roadmap.html`
- `resources/generative-ai-training-agenda-template.html`
- `resources/rfp-go-no-go-checklist.html`
- `resources/rfp-response-readiness-scorecard.html`
- `resources/reception-ai-test-script-template.html`
- `resources/reception-ai-volume-estimator.html`
- `playbooks/ai-ops-first-hour.html`
- `playbooks/rfp-radar-first-hour.html`
- `playbooks/reception-ai-first-hour.html`
- `buyers/ai-operations-manager.html`
- `buyers/proposal-manager.html`
- `buyers/front-office-manager.html`
- `templates/ai-ops-control-matrix.html`
- `templates/ai-ops-risk-checklist.html`
- `templates/rfp-keyword-tracker.html`
- `templates/rfp-source-map.html`
- `templates/reception-fallback-rules.html`
- `templates/reception-inquiry-map.html`
- `templates/ai-ops-workflow-inventory.html`
- `templates/ai-ops-10-day-action-plan.html`
- `templates/rfp-weekly-review-sheet.html`
- `templates/reception-ai-acceptance-checklist.html`
- `templates/ai-operations-30-day-rollout-plan.html`
- `delivery/ai-ops-diagnostic-kit.html`
- `delivery/rfp-radar-setup-kit.html`
- `delivery/reception-ai-pilot-kit.html`
- `delivery/ai-operations-starter-bundle.html`
- `delivery/ai-operations-team-rollout-pack.html`
- `kits/ai-ops-diagnostic-kit.html`
- `kits/rfp-radar-setup-kit.html`
- `kits/reception-ai-pilot-kit.html`
- `kits/ai-operations-starter-bundle.html`
- `kits/ai-operations-team-rollout-pack.html`
- `guides/ai-operations-risk-checklist.html`
- `guides/rfp-radar-workflow.html`
- `guides/reception-ai-pilot-plan.html`
- `use-cases/ai-ops-governance.html`
- `use-cases/rfp-monitoring-workflow.html`
- `use-cases/reception-ai-pilot.html`
- `legal/commercial-disclosure.html`
- `legal/business-information.html`
- `legal/terms-of-sale.html`
- `legal/license.html`
- `legal/privacy.html`
- `checkout/activation-spec.md`
- `checkout/checkout-links.example.json`
- `scripts/validate-checkout-links.mjs`
- `scripts/apply-checkout-links.mjs`
- `scripts/verify-public-site.mjs`
- `.vercelignore`
- `sitemap.xml`
- `llms.txt`
- `robots.txt`
- `vercel.json`

Hosted checkout links are intentionally not embedded until the payment account owner completes payout, identity, tax, and legal-display setup in the payment provider.

Delivery pages are public, noindex delivery manifests for hosted-checkout success redirects. Full paid delivery files should remain outside this public verification repository while hosted checkout and fulfillment are pending.

The public storefront does not link directly to delivery downloads. Static success URLs are still not authentication; use hosted checkout or a dedicated delivery service if stronger access control is required.

`robots.txt` disallows `/checkout/`, `/delivery/`, `/products/`, and `/scripts/`.
`vercel.json` redirects `/products` and `/products/*` to `/delivery-access` as an
extra deployment-level guard if stale or accidental product paths exist on a
hosting target.
`.vercelignore` excludes `products/**` and `checkout/checkout-links.local.json`
to reduce CLI misdeploy risk from this local working directory.

Run the static public-site regression check before publishing:

```bash
node scripts/verify-public-site.mjs
```

Run the live production regression check after Vercel reflects `main`:

```bash
node scripts/verify-live-production.mjs --expect-checkout pending
```

After account-owner payment setup, active production verification must include
the local checkout manifest so live Stripe hrefs are matched by product:

```bash
node scripts/verify-live-production.mjs --expect-checkout active --checkout-manifest checkout/checkout-links.local.json
```

## Verification notes

- Public, password-free HTML site
- No payment form
- No contact form
- No manual outreach, manual posting, sales calls, custom quote conversations, or manual onboarding
- No tracking script
- No client-side JavaScript
- Public free guides for organic discovery and buyer self-qualification
- Public FAQ, comparison, and sample preview pages for no-call buyer qualification
- Public pricing page with fixed tax-included amounts and no-contact scope
- Public purchase self-check page for no-contact kit selection
- Public how-it-works page for no-contact purchase, hosted checkout, and digital delivery explanation
- Public no-contact operation page for passive storefront, distribution, checkout, amount, and evidence boundaries
- Public autopilot commerce approval matrix for sales pages, passive copy, discovery destinations, fixed amounts, and evidence-only revenue facts
- Public autonomous revenue readiness page for hosted checkout activation boundary and no-touch payment flow
- Public receipt support boundary page for duplicate purchase, failed delivery, and clear file defect review after hosted checkout activation
- Public high-intent resource pages for AI approval requests, AI risk registers, RFP go/no-go decisions, and reception AI test scripts
- Public high-intent resource pages for AI ROI readiness, RFP response readiness, and reception AI volume estimation
- Public team-rollout resource pages for AI team rollout roadmaps, department adoption calendars, and manager briefing preparation
- Public purchase-intent resource pages for budget requests, tool selection, pilot KPI planning, internal briefing, 90-day rollout, and training agenda preparation
- Public first-hour playbook pages for AI Ops, RFP Radar, and Reception AI post-purchase use sequences
- Public resource library page and high-intent pages for AI governance checklists, RFP monitoring spreadsheets, and reception AI human handoff planning
- Public high-intent pages for generative AI internal use requests, AI workflow inventory, RFP weekly review routines, and reception AI handoff checklists
- Public support, terms of sale, business information, and commercial disclosure pages for verification and buyer confidence
- Public license page for internal business use rights and redistribution restrictions
- Public Japanese resource pages for organic discovery around LLM operations, AI agent governance, RFP monitoring, and reception AI requirements
- Additional public Japanese resource pages for AI agent human review, AI workflow evidence logs, RFP opportunity scoring, and reception AI fallback planning
- Public English resource page for AI agent approval workflow planning
- Public buyer role pages for no-call purchase decisions
- Public template preview pages for organic discovery without exposing delivery files
- Public paid-deliverable preview pages for AI workflow inventory, 10-day AI operations planning, RFP weekly review, reception AI acceptance, and 30-day rollout planning
- Public delivery/access, privacy, and use-case pages for no-touch buyer evaluation
- No payment collection without hosted checkout activation
- Commercial disclosure page prepared; legal seller details and support route still require account-owner confirmation before live checkout
- Paid Markdown and CSV delivery assets should not be published in this public verification repository until the checkout and fulfillment model is intentionally activated
- Services, prices, delivery method, refund policy, cancellation policy, restrictions, privacy, and support route are visible on the page
