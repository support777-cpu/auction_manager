# Adversarial Divergence Review - Architecture Update

Date: 2026-07-05
Artifact: `../ARCHITECTURE-SPINE.md`

## Verdict

Pass after AD-13 tightening.

## Scenarios Tested

| Scenario | Divergence Risk | Current Spine Result |
| --- | --- | --- |
| Setup story hard-codes Ace/Batting/Bowling/Girls defaults while domain story supports editable values. | Prices and rule checks disagree after Start Auction. | AD-13 requires structured Auction Parameters persisted with the auction and used by domain commands. |
| UI story implements `AssignRandomUnsold` while domain story expects operator-selected assignment. | Unsold phase behavior conflicts across UI/API/domain. | AD-2, AD-6, command conventions, and FR-17 map all name manual assignment. |
| Persistence story stores current state but omits Auction Parameters. | Restart/resume recomputes rules from app defaults instead of auction-specific rules. | AD-13 and FR-20 map require parameters to be persisted with local auction state. |
| UI/API story treats manual-assignment budget behavior as free text or a boolean while domain uses a different shape. | Assignment validity and budget update semantics diverge. | AD-13 now fixes this as a shared/domain enum with v1 default `NoBudgetImpact`. |

## Residual Follow-up

Companion UX and technical research docs still mention random assignment. The spine itself prevents implementation drift, but those artifacts should be refreshed or marked superseded before downstream story generation.
