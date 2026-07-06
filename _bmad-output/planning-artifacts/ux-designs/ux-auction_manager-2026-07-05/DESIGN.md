---
name: Auction Manager
description: Local live-event auction control surface for an amateur church cricket league.
status: final
sources:
  - ../../prds/prd-auction_manager-2026-07-04/prd.md
  - ../../architecture/architecture-auction_manager-2026-07-05/ARCHITECTURE-SPINE.md
updated: 2026-07-06
colors:
  surface-base: '#F7F8FA'
  surface-raised: '#FFFFFF'
  surface-muted: '#EEF1F4'
  surface-inverse: '#111827'
  surface-inverse-raised: '#1F2937'
  ink-primary: '#111827'
  ink-secondary: '#4B5563'
  ink-muted: '#6B7280'
  ink-inverse: '#F9FAFB'
  ink-inverse-secondary: '#D1D5DB'
  field-green: '#136F45'
  field-green-strong: '#0B5133'
  gold-live: '#F5B841'
  gold-live-strong: '#B7791F'
  sky-info: '#2563EB'
  success: '#15803D'
  warning: '#B45309'
  danger: '#B91C1C'
  border-subtle: '#D8DEE6'
  border-strong: '#9CA3AF'
  focus-ring: '#F5B841'
typography:
  display-score:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1'
    letterSpacing: '0'
  display-score-mobile:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 44px
    fontWeight: '800'
    lineHeight: '1'
    letterSpacing: '0'
  title:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '0'
  section:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: '0'
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.45'
    letterSpacing: '0'
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '0'
  caption:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.35'
    letterSpacing: '0'
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  '12': 48px
  app-gutter: 24px
  board-gap: 20px
components:
  live-board:
    background: '{colors.surface-inverse}'
    foreground: '{colors.ink-inverse}'
    radius: '{rounded.lg}'
  current-bid:
    foreground: '{colors.gold-live}'
    typography: '{typography.display-score}'
  player-panel:
    background: '{colors.surface-inverse-raised}'
    foreground: '{colors.ink-inverse}'
    radius: '{rounded.lg}'
  team-tile:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border: '{colors.border-subtle}'
    radius: '{rounded.md}'
  team-tile-active:
    background: '{colors.field-green}'
    foreground: '#FFFFFF'
    border: '{colors.field-green-strong}'
  roster-team-section:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border: '{colors.border-subtle}'
    radius: '{rounded.md}'
  roster-player-row:
    background: '{colors.surface-muted}'
    foreground: '{colors.ink-primary}'
    radius: '{rounded.sm}'
  button-primary:
    background: '{colors.field-green}'
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
  button-live:
    background: '{colors.gold-live}'
    foreground: '#2A1A03'
    radius: '{rounded.md}'
  button-danger:
    background: '{colors.danger}'
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
  status-blocked:
    background: '#FEF2F2'
    foreground: '{colors.danger}'
    border: '#FCA5A5'
---

## Brand & Style

Auction Manager is a live-event operations tool first and a cricket scoreboard second. The product should read as calm, legible, and hard to misuse while a room is watching. [ASSUMPTION] The visual identity uses a restrained sports-control palette: dark board surfaces for the projected auction state, field green for valid team/action context, gold for the live bid, and red only for blocking errors or dangerous operations.

The interface should feel like a reliable event console: clear hierarchy, large numbers, obvious next actions, and minimal decoration. It should not feel like a SaaS dashboard, a public betting product, or a playful fantasy-sports app. Church-event warmth should come from language restraint, spacing, team logos, and player photos, not decorative motifs. [ASSUMPTION]

The implementation stack is React with Tailwind CSS and Lucide React icons, served locally by the event-mode app. No full component system is named by the architecture, so these tokens define the product visual layer directly rather than overriding shadcn, MUI, or another library.

## Colors

- **Board Ink (`{colors.surface-inverse}`)** is the primary large-display canvas. It gives the Current Player and Current Bid enough contrast when mirrored to a projector or TV.
- **Raised Board (`{colors.surface-inverse-raised}`)** separates player media, bid state, and phase context on the live board without relying on heavy shadows.
- **Field Green (`{colors.field-green}`)** marks safe primary action, selected valid team context, and cricket/event identity. It is not used for every positive number.
- **Live Gold (`{colors.gold-live}`)** is reserved for the Current Bid and the one control that advances the live moment. Gold means "the room is looking here."
- **Danger Red (`{colors.danger}`)** is reserved for invalid outcomes, reset, close, and destructive confirmation. It must not be used for ordinary unsold state.
- **Sky Info (`{colors.sky-info}`)** supports setup guidance, resume notices, and non-blocking informational states.

Avoid using source CSV data status colors as decorative badges. Auction validity states should be sparse and operational: valid, blocked, missing, current, done.

## Typography

Typography uses a single system sans-serif family for predictable rendering on the operator PC. [ASSUMPTION] `display-score` is the large live numeral style for Current Bid and should be used at most once per surface. `title` is for player names and major surface titles. `section`, `body`, `label`, and `caption` support dense operational content without switching type families.

Numbers must remain tabular or visually stable wherever the implementation stack supports it. Bid, budget, squad, and role-count values should not shift the layout when they change. Avoid condensed display fonts, decorative sports fonts, and all-caps player names; they reduce legibility under projection.

## Layout & Spacing

The layout follows a control-room model:

- Live auction surfaces use a dark board band with the Current Player and Current Bid as the first read.
- Team state uses a grid of compact tiles beneath or beside the board, depending on viewport width.
- Team rosters use a scan-friendly grid of Team sections. On the final closed screen, roster content becomes the primary room-facing surface rather than a secondary drawer.
- Operator controls sit in a predictable action rail or bottom command band, visually separated from the projected state.
- Setup surfaces use light backgrounds and table/list density because the audience is not watching setup.

`{spacing.app-gutter}` is the default page gutter. `{spacing.board-gap}` separates major live-board regions. Controls should use stable dimensions so changing labels, validation messages, or bid values do not move the main action buttons during bidding.

## Elevation & Depth

Depth is mostly tonal. Live board areas use `{colors.surface-inverse}` and `{colors.surface-inverse-raised}` rather than stacked shadows. Light setup surfaces may use a subtle border with `{colors.border-subtle}`. Shadows are allowed only for modal confirmations, popovers, and topmost error details.

The app should never depend on hover elevation to communicate critical state; the auction may be operated under stress, on a touch-capable laptop, or while mirrored.

## Shapes

Corners are tight and practical: `{rounded.md}` for buttons and team tiles, `{rounded.lg}` for major board regions and modals, `{rounded.sm}` for inputs and inline chips. Use `{rounded.full}` only for small status pills where the shape helps scanning.

Avoid oversized rounded cards. The product should read as an event tool, not a consumer wellness app.

## Components

- **Live board** — Dark full-width region using `{components.live-board.background}`. It contains phase, Current Player, Current Bid, selected Team, and outcome state. It is the anchor visual for the room.
- **Current bid** — Uses `{components.current-bid.typography}` and `{components.current-bid.foreground}`. It must be large enough to read from the back of the room and should not share emphasis with any other number.
- **Player panel** — Shows photo or placeholder, name, role, and base price. Placeholder uses neutral surfaces, not error red.
- **Team tile** — Shows logo, name, remaining budget, squad count, and role capacity for the Current Player role. Active team uses `{components.team-tile-active.background}`.
- **Board/Rosters switch** — Compact two-option control for moving between the live auction board and the all-Team roster surface. It should read as navigation, not as a state-changing command.
- **Team roster screen** — Read-only room-facing surface for all current or final Team rosters. It uses light raised Team sections inside the app frame, with a clear phase label and no routine bidding controls after Close Auction.
- **Roster team section** — Uses `{components.roster-team-section.background}` and groups one Team's logo, name, captain, remaining budget, squad count, role counts, and Player list. Empty sections remain visible.
- **Roster player row** — Uses `{components.roster-player-row.background}` for compact rows with Player name, Role, acquisition type, and price when applicable. Rows should be dense enough for all Teams to scan, but never shrink below readable body text.
- **Role capacity chip** — Compact status for Ace, Batting, Bowling, All Rounder, and Girls counts. Blocked capacity uses danger styling only when it affects the Current Player.
- **Auction parameter row** — Setup-only row for role base prices, bid increment, team budgets, squad cap, role targets, and manual-assignment budget behavior. Editable controls use light surfaces; locked post-start values use read-only text with subtle borders rather than disabled low-contrast text.
- **Phase progress strip** — Compact indicator for `Setup`, `Initial Auction`, `Unsold Bidding`, `Manual Assignment`, and `Closed`. The active phase uses field green on light setup surfaces and gold-on-dark only when embedded inside the live board header. Completed phases use neutral check treatment, not celebratory color.
- **Unsold pool summary** — Shows Phase 1 unsold count, Phase 2 remaining count, and Phase 3 manual-assignment count when relevant. It uses neutral surfaces and small count chips; do not use danger red for unsold volume.
- **Phase transition control** — Start Unsold Bidding and Start Manual Assignment are deliberate transition actions. They should be visually stronger than secondary navigation but quieter than the live bid increment control. If the transition skips remaining players in the prior phase, the confirmation modal uses danger styling only for the explicit skip consequence.
- **Primary button** — Safe routine actions such as Start Auction, Reveal Next Player, and Mark Sold when valid.
- **Live button** — Bid increment action. Uses `{components.button-live.background}` because it changes the number the room is watching.
- **Undo control** — Secondary action with visible last-action summary nearby. It should never look destructive.
- **Blocked status** — Inline panel using `{components.status-blocked.background}` for invalid sale or assignment reasons. It appears near the attempted action, not as a generic top-of-page alert.
- **Manual assignment control** — Phase 3 team selection and assign action for players still unsold after Phase 2 rebidding. It should visually read like a deliberate operator choice, not a random draw or automated optimization.
- **Dangerous operation button** — Reset Auction and Close Auction only. Hidden behind a separated menu or management surface and always confirmed in a modal.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Make the Current Bid the largest number on the screen | Give every metric scoreboard-level emphasis |
| Use gold only for the live bid moment | Use gold as a generic accent across the app |
| Separate routine controls from dangerous operations | Put Reset Auction beside Mark Sold or Reveal Next |
| Use clear placeholders for missing photos/logos | Treat missing media as a live-event failure |
| Show blocked reasons in plain operational language | Rely on red alone to explain invalid actions |
| Keep setup light, dense, and checklist-like | Make setup look like the live board |
| Make final rosters readable as the closed-auction surface | End on a disabled board with no roster summary |
| Keep roster rows factual and compact | Turn rosters into celebratory player cards that are hard to scan |
| Preserve privacy by excluding non-auction CSV fields | Surface registration/payment fields because they were imported |
| Treat auction parameters as setup-owned and locked after Start Auction | Hard-code current league defaults as permanent UI text |
