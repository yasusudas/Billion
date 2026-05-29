# RFP Radar Setup Kit

Billion AI Operations Studio

## Purpose

Use this kit to build a public-information monitoring workflow for procurement notices, proposal themes, and weekly opportunity review. It does not guarantee bid eligibility, tender success, or legal interpretation.

## Files

- `rfp-source-map.csv`
- `rfp-keyword-tracker.csv`
- `rfp-weekly-review.csv`
- `rfp-opportunity-scorecard.csv`
- `rfp-weekly-brief-template.md`

## How to Use

1. Add the official public sources your team is allowed to monitor.
2. Track keywords by market theme, geography, and buyer type.
3. Score candidate opportunities with the scorecard before proposal work begins.
4. Run the weekly review every week on the same day.
5. Summarize decisions in the weekly brief template.
6. Escalate only opportunities with public source evidence and a clear fit reason.

## Acceptance Criteria

- Sources are public and allowed for monitoring.
- Every opportunity has a source URL or source note.
- Fit reasons are specific enough for a human to verify.
- The workflow avoids scraping restricted pages or storing private buyer data.
- Each weekly brief has an owner, next action, and open question list.
