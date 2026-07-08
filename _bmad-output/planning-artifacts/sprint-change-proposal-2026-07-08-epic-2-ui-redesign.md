---
title: Sprint Change Proposal
project: auction_manager
date: 2026-07-08
status: applied-from-user-request
source_mockup: _bmad-output/planning-artifacts/ux-designs/ux-auction_manager-2026-07-05/mockups/epic-2-redesign-review.html
mode: batch
requested_by: Udeet
---

# Sprint Change Proposal - Epic 2 UI Redesign Bridge

## 1. Issue Summary

Epic 2 execution produced a redesigned UI direction after the original UX docs and epic breakdown were already written. The new review mockup changes the live surface structure materially enough that the implementation backlog should absorb it before Epic 3 begins.

The trigger is not a failed domain approach. The implemented Epic 2 behavior can remain valid, but the UI should be brought into alignment with the approved red/black event-console design before adding Phase 2 unsold bidding and Phase 3 manual assignment complexity.

Evidence:

- `epic-2-redesign-review.html` introduces a red/black event-console frame, compact status counters, Current Player/Bid stage, fixed command strip, dense Team matrix, focused Manual Assignment surface, and dense roster/closed-state surface.
- Existing `DESIGN.md` still emphasized the earlier restrained sports-control palette with field green and live gold.
- Existing `EXPERIENCE.md` described the right flows, but did not make the redesigned structure authoritative.
- `sprint-status.yaml` showed Epic 2 complete and Epic 3 ready to start, with no interstitial redesign implementation epic.

## 2. Impact Analysis

### Epic Impact

Epic 1 is not affected.

Epic 2 behavior remains valid and complete, but the UI output from Epic 2 now needs a redesign implementation pass.

Epic 2.5 is added as an interstitial epic before Epic 3. It implements the redesigned live board, Manual Assignment shell, roster/closed-state shell, and a full QA gate covering unit/component tests, E2E functional regressions, accessibility checks, and visual QA.

Epic 3 should not begin until Epic 2.5 is complete. Phase 2 and Phase 3 behavior will be easier and safer to implement once the target surfaces are stable.

Epic 4 remains valid. Its Close Auction story will use the redesigned closed-state roster surface prepared by Epic 2.5.

### Story Impact

New stories added:

- 2.5.1 Apply Red/Black Event Console Tokens and App Frame
- 2.5.2 Redesign the Live Auction Board Layout
- 2.5.3 Prepare the Focused Manual Assignment Surface
- 2.5.4 Redesign Rosters and Closed-State Display
- 2.5.5 Run Redesign Functional, E2E, Unit, and Visual QA Gates

Existing Story 2.5, "Block Invalid Sales With Clear Reasons", remains unchanged. The new epic is numbered `Epic 2.5`; its stories use `2.5.x` naming to avoid conflict.

### PRD Impact

No PRD scope change is required. FR9, FR10, FR18, and FR22 already support the redesigned surfaces. The MVP remains achievable.

### Architecture Impact

No architecture spine change is required. The redesign does not change domain ownership, command contracts, persistence, privacy projection, or local runtime boundaries.

The implementation boundary is explicit: Epic 2.5 may change UI composition, tokens, layout, accessibility, selectors, and visual QA. It must not change domain rules, persistence semantics, auction command contracts, randomized order behavior, undo semantics, or privacy allowlists except to fix a discovered bug.

### UX Impact

UX docs were updated:

- `DESIGN.md` now makes the red/black event-console direction authoritative for live and closed surfaces.
- `EXPERIENCE.md` now references the redesign review mockup and adds structure for top counters, command strip, Team matrix, focused Manual Assignment, and roster/closed-state behavior.
- `epics.md` now includes UX-DR31 through UX-DR36 to capture the redesign requirements plus unit, E2E, accessibility, and visual QA gates.

### Technical Impact

Implementation will likely touch React view components, styling tokens, Playwright screenshot coverage, component/unit tests, accessibility tests, and existing Epic 2 E2E tests. Domain, persistence, and API changes should be avoided unless regression tests expose a pre-existing mismatch.

## 3. Recommended Approach

Recommended path: Direct Adjustment.

Rationale:

- The redesigned UI is an implementation target refinement, not a product or architecture pivot.
- Adding an interstitial Epic 2.5 preserves Epic 3's behavioral focus.
- The redesign prepares Manual Assignment and Closed surfaces before their domain stories depend on them.
- A dedicated full QA story reduces the risk of carrying functional, accessibility, or layout regressions into unsold-player workflows.

Effort estimate: Medium.

Risk level: Medium. The risk is mostly frontend regression and viewport fit, not domain correctness.

Timeline impact: Epic 3 starts later, but with a more stable UI foundation.

Scope classification: Moderate, because backlog sequencing and multiple planning artifacts changed.

## 4. Checklist Results

| Checklist Item | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering story | Done | Trigger came after Epic 2 execution via redesigned UI review mockup. |
| 1.2 Core problem | Done | UX/design artifacts and sprint sequencing no longer matched the desired implementation target. |
| 1.3 Evidence | Done | Evidence confirmed in `epic-2-redesign-review.html` and screenshots. |
| 2.1 Current epic impact | Done | Epic 2 behavior remains valid, but its UI needs redesign implementation. |
| 2.2 Epic-level changes | Done | Added Epic 2.5 between Epic 2 and Epic 3. |
| 2.3 Remaining epics review | Done | Epic 3 should wait; Epic 4 will benefit from prepared closed-state roster design. |
| 2.4 New or obsolete epics | Done | New Epic 2.5 required; no existing epic removed. |
| 2.5 Epic order | Done | Sequence becomes Epic 1, Epic 2, Epic 2.5, Epic 3, Epic 4. |
| 3.1 PRD conflict | Done | No PRD conflict or MVP reduction. |
| 3.2 Architecture conflict | Done | No architecture change required. |
| 3.3 UX conflict | Done | UX docs needed updates to adopt the redesign as authoritative. |
| 3.4 Other artifacts | Done | Updated `sprint-status.yaml` to track Epic 2.5. |
| 4.1 Direct adjustment | Viable | Best path. |
| 4.2 Rollback | Not viable | No completed domain behavior needs rollback. |
| 4.3 MVP review | Not viable | MVP remains achievable. |
| 4.4 Path selected | Done | Direct Adjustment. |
| 5.1 Issue summary | Done | Included here. |
| 5.2 Artifact adjustment needs | Done | Included here. |
| 5.3 Recommendation | Done | Included here. |
| 5.4 MVP impact | Done | No MVP scope reduction. |
| 5.5 Handoff plan | Done | Route to Developer agent for Epic 2.5 story implementation before Epic 3. |
| 6.1 Checklist review | Done | All applicable items addressed. |
| 6.2 Proposal accuracy | Done | Grounded in PRD, epics, architecture, UX docs, mockup, and sprint status. |
| 6.3 User approval | Done | User requested the update and Epic 2.5 creation in this workflow run. |
| 6.4 sprint-status update | Done | Added Epic 2.5 and stories as backlog entries. |
| 6.5 Handoff confirmation | Done | Next step is story creation/implementation for Epic 2.5 before Epic 3. |

## 5. Detailed Change Proposals

### Proposal A - Update UX Design Source of Truth

Artifact: `DESIGN.md`

Change:

- Adopt red/black event-console tokens.
- Add command red, live red, panel soft, and off-white live surface language.
- Define top status counters, player stage, fixed command strip, Team matrix, focused Manual Assignment, and dense roster cards.

Rationale:

The design doc must match the redesign before implementation stories use it as a reference.

### Proposal B - Update UX Experience Spine

Artifact: `EXPERIENCE.md`

Change:

- Reference `epic-2-redesign-review.html`.
- Make the redesign authoritative for live, manual-assignment, roster, and closed-state surfaces.
- Add behavior for first-viewport Team visibility, stable command strip, blocked Team reasons, focused Manual Assignment, and redesigned roster/closed surface.

Rationale:

The experience spine owns behavior and layout expectations; it should make the redesigned workflow structure explicit.

### Proposal C - Add Epic 2.5 and Redesign Requirements

Artifact: `epics.md`

Change:

- Add UX-DR31 through UX-DR36.
- Add Epic 2.5 to the epic list.
- Add five implementation stories for tokens/app frame, live board redesign, Manual Assignment shell, roster/closed display, and functional/E2E/unit/visual QA regression gates.

Rationale:

The redesign is large enough to deserve its own implementation epic before Epic 3.

### Proposal D - Update Sprint Status

Artifact: `sprint-status.yaml`

Change:

- Add `epic-2-5` and five backlog stories between Epic 2 and Epic 3.

Rationale:

Sprint tracking must enforce the new sequence and prevent accidental movement into Epic 3 before the redesign bridge is complete.

## 6. Implementation Handoff

Scope classification: Moderate.

Route to: Developer agent.

Responsibilities:

- Create and implement Epic 2.5 stories in order.
- Preserve existing Epic 2 domain/API/persistence behavior.
- Add unit/component, E2E, accessibility, visual QA screenshot, and regression evidence before Epic 3 begins.
- Keep UX docs and implementation aligned when story-level details reveal necessary refinements.

Success criteria:

- Epic 2.5 stories reach `done`.
- Existing Epic 2 flows still pass.
- Redesigned live board, Manual Assignment shell, roster, and closed-state fixtures match the review hierarchy at target viewports.
- Unit/component and full relevant E2E tests pass against updated UI selectors and flows.
- No privacy, undo, command, persistence, or accessibility regression is introduced.
