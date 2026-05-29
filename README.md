# Billion AI Operations Studio

Stripe business verification, Vercel-ready public website, and self-serve digital product storefront for `Billion AI Operations Studio`.

## Recommended Stripe fields

- Business name: `Billion AI Operations Studio`
- Business category: `Professional services / Consulting`
- Business website URL: `https://billion-ai-operations.vercel.app/`
- Product description: `Billion AI Operations Studio sells self-serve digital business kits and B2B professional services for AI operations diagnostics, RFP and proposal monitoring setup, and reception AI pilot planning. Self-serve products are downloadable templates and checklists delivered through hosted checkout success pages. Professional services are delivered remotely through workshops, operational review, document analysis, and written deliverables such as diagnostic reports, control matrices, implementation roadmaps, and acceptance checklists. We do not provide regulated financial advice, legal representation, medical diagnosis, lending, gambling, or physical goods.`
- Japanese product description: `Billion AI Operations Studioは、法人向けにAI業務運用診断、RFP・提案機会の監視ワークフロー構築、受付・問い合わせ対応AIのパイロット設計に関するセルフサービス型デジタルキットと専門サービスを提供します。セルフサービス商品は、ホスト型決済の成功後ページで納品されるテンプレートとチェックリストです。専門サービスはオンラインでのヒアリング、業務レビュー、資料分析、診断レポート、統制マトリクス、導入ロードマップ、検収チェックリストなどの成果物として提供します。金融助言、法律代理、医療診断、融資、ギャンブル、物品販売は行いません。`
- Statement descriptor, kanji: `億業務AI支援`
- Statement descriptor, katakana: `ビリオンAIスタジオ`
- Statement descriptor, English: `BILLION AI STUDIO`

Use the same business name in Stripe and on the website. If the Vercel project name is unavailable, use `billion-operations-studio` and submit the resulting production URL.

## Vercel

This is a static site. Import the GitHub repository in Vercel and deploy from the repository root.

- Framework preset: `Other`
- Build command: leave empty
- Output directory: `.`
- Suggested Vercel project name: `billion-ai-operations`

## Self-serve products

- `AI Ops Diagnostic Kit`: JPY 9,800
- `RFP Radar Setup Kit`: JPY 7,800
- `Reception AI Pilot Kit`: JPY 6,800
- `AI Operations Starter Bundle`: JPY 19,800

## Files

- `index.html`
- `styles.css`
- `delivery/ai-ops-diagnostic-kit.html`
- `delivery/rfp-radar-setup-kit.html`
- `delivery/reception-ai-pilot-kit.html`
- `delivery/ai-operations-starter-bundle.html`
- `robots.txt`
- `vercel.json`

Hosted checkout links are intentionally not embedded until the payment account owner completes payout, identity, tax, and legal-display setup in the payment provider.

## Verification notes

- Public, password-free HTML site
- No payment form
- No contact form
- No tracking script
- No client-side JavaScript
- No payment collection without hosted checkout activation
- Services, prices, delivery method, refund policy, cancellation policy, restrictions, privacy, and support route are visible on the page
