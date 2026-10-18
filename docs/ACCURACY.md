# Accuracy policy

PermitPath must never invent permits, fees, legal requirements, approval timelines or jurisdiction-specific rules. This is how the product enforces that, and where in the code each rule lives.

| Rule | Enforcement |
| --- | --- |
| Requirements come only from approved official sources | `retrieve()` indexes `status = 'approved'` sources only; checklist items carry `provenance.sourceId/sectionId/quote` |
| Show official source, jurisdiction and last-verified date | `SourceCitation` component is used everywhere a requirement or answer is shown; search citations include effective and last-verified dates |
| Distinguish verified information from AI suggestions | `VerifiedBadge` (teal) vs `AiBadge` (amber) and `AiNotice`; `ProvenanceBadge` flags quotes not found in the source in red |
| AI output can't silently become a requirement | Extraction candidates are `ai_suggested`; ungrounded ones can't be accepted (`reviewExtraction`); DB trigger `enforce_verified_items` blocks AI items in verified checklists |
| Completeness only against verified checklists | `assessCompleteness()` throws on non-verified checklists |
| No fees or timelines | `ACCURACY_RULES` system prompt; fee/timeline questions only return passages that mention them, with a scope notice; deadlines record their `origin` instead of being computed |
| Renewals from recorded data only | `renewalStatus()` uses `permits.expires_on` and configured `reminder_days` |
| Confirm with the authority when necessary | `confirmWithAuthority` flag on items renders `ConfirmWithAuthority`; search answers carry a disclaimer |
| Demo data is fictional | All demo jurisdictions/sources/permit types have `fictional: true` and `.example` URLs; asserted in `tests/engine.test.ts` |

Every verified quote in the demo checklists is asserted to appear verbatim in its cited source section (`tests/engine.test.ts`).
