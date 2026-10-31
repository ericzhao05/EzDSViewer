# Front-end progress

Tracks the three-theme redesign so work can resume if a session is cut off.
Worktree: `create-10-presets-style-f415f90d`, branch `array-style-presets-f415f90d`.
Committed on this branch; see the pull request for its status.

## Goal

- Offer three themes through a hamburger menu at the top right: Chalkboard / Blackout (default), Toy blocks / Bubblegum, Phosphor / Green.
- Keep the other styles and palettes in source, with their options commented out.
- Apply each theme to all 24 data-structure pages (Core, Second-tier, Specialized), plus the sidebar and top navigation.
- Keep existing functionality working.

## Status

| Stage | State | Notes |
|---|---|---|
| Foundation: tokens, base components, theme switching, hamburger menu | Done | 189 frontend tests pass |
| 24 page stylesheets moved onto theme variables | Done | Hardcoded colors and radii replaced |
| Other 47 combinations commented out | Done | `src/theme/themes.js` |
| Design spec (`src/theme/SPEC.md`) | Done | |
| QA tool with a separate backend per agent | Done | Temporary, in session scratchpad |
| Chalkboard / Blackout implementation | Done | 24 pages at 1440px; about 10 viewed at 390px |
| Toy blocks / Bubblegum implementation | Done | 24 pages at 1440px and 390px. Hash-table states and the linked-list cycle outline not exercised |
| Phosphor / Green implementation | Done | 24 pages at 1440px; 6 viewed at 390px; audit clean at both |
| Independent review of all 3 themes on all 24 pages | Done | No behaviour bugs; theme switching passed; 11 visual or accessibility findings |
| Fix confirmed issues and test the integrated app | Done | 190 tests pass; production build compiles; audit clean on all 72 page and theme combinations at 1440px and 390px |

## Latest round (user feedback)

| Item | State | Notes |
|---|---|---|
| Bubblegum: all pages stretch with the window, like Array and Fibonacci Heap | Done | All 24 match at 1100, 1440 and 1920px |
| Phosphor: page centered | Done | Box centered on all 24; text inside stays left-aligned |
| Chalkboard: Fibonacci Heap brought back to 900px | Done | Same inconsistency; not separately requested |
| Second reviewer checking all recent fixes | Done | 8 findings; Bubblegum stretching, label halos and theme menu closing need more work |
| Fix second reviewer's 8 findings | Done | 190 tests pass; build compiles; audit clean on all 72 combinations at 1440px and 390px |

## Decisions

- One worktree instead of three: the Array work was uncommitted at the time, and each agent writes only to its own directory, so edits can't collide.
- The Dark/Light button is removed: each theme now sets its own colors, so the toggle would do nothing.
- The right-hand picker and the "Add sample values" button from the previous round are removed.
- Hidden styles' Array cell shapes are kept in `src/theme/archive/array-presets.css`.

## File ownership

- Coordinator: `src/App.js`, `src/theme/*` (top level), `src/views/*`, `public/index.html`, this file.
- Each style agent: only `src/theme/styles/<style>/`.

## Remaining issues

Nothing is broken; these are cosmetic.

- Toy blocks: Graph and Fibonacci arrowheads look large, and hot-edge arrowheads stay plum (arrowheads are set in JSX).
- Toy blocks: B-tree key cells touch (layout fixed in JSX).
- Graph: step badges can overlap arrowheads.
- Chalkboard: segment-tree index labels sit close to node rings and edges; labels sit close to edges on the graph; empty grid cell beside Specialized in the 390px sidebar.
- Phosphor: hovering a balanced-trees step looks the same as the current step; kd-tree query label can overlap a point label.
- Doubly linked list (arrived from `main` during rebase): follows each theme's colors and fonts and is usable, but its nodes have no per-theme shapes: square-ish 6px boxes, including in Phosphor and Bubblegum.
- Restored hidden styles get their colors everywhere and Array cell shapes (after uncommenting the archive import), but only the default navigation and page shapes. They would need the same per-page work to match these three.

## Not verified

- The second reviewer's 8 findings were fixed and checked by the coordinator; no reviewer has re-run since.
- Bubblegum at 2560px: centering measured on all 24 pages, viewed by eye on only a few.
- 13 of 24 pages per theme were checked at 390px by automated audit only.
- Native select popups open, touch input, and browsers other than Chromium.

## After merging the player pages from main

PR #2 added /v and /embed, built on the removed `App.css` and dark mode. PlayerPage now uses the themes: /v follows the saved theme; /embed uses Chalkboard with `theme=dark` and Bubblegum otherwise. Their security policy blocks Google Fonts, so those pages show fallback fonts.

288 frontend and 600 backend tests pass; the build compiles. Player pages checked in Chromium through Flask.

## After rebasing onto main

218 tests pass and the production build compiles. The doubly list was checked in all 3 themes at 1440px by eye, and for overflow at 1440px and 390px. The full 72-combination audit was not re-run after the rebase.

## Next step

Review and merge the pull request.
