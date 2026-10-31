# Theme spec

Each theme is a style plus a palette. Everything below is shared by all pages in that theme.

## Structure

- `presets.js`: full catalog, 10 styles with 5 palettes each.
- `themes.js`: which combinations the menu offers; storage; sets `data-style`, `data-palette` and the palette variables on `<html>`.
- `tokens.css`: the token contract and its defaults. Also maps the older names that page CSS reads (`--stack-item-bg`, `--input-border`, `--card-bg`...).
- `base.css`: shared navigation, menu, panel, button, input, table and message components, driven only by tokens.
- `styles/<style>/`: `tokens.css` first, then `chrome.css` (nav, sidebar, menu), `core.css`, `second-tier.css`, `specialized.css`.

## Rules for style files

- Start every selector with `[data-style='<style>']`.
- Prefer changing a token over writing a rule. If a look applies to all pages, it belongs in `tokens.css` or `chrome.css`, not repeated per page.
- Use the same convention for the same concept on every page: a filled cell, a spare cell, a tree node, an edge, a highlighted state, a primary button.
- Page CSS and JSX are off limits for style agents. Override page classes from the style directory. Request any needed markup change from the coordinator.
- Don't change layout in a way that hides content, and don't use `display: none` on information.
- A CSS `content` value must not add information a page needs. Decorative only.
- Don't convey state by hue alone: pair it with stroke width, dash, fill or inversion.
- All text at least 4.5:1 against its background; large headings and control outlines at least 3:1.
- Visible focus, reduced motion respected (base.css handles the motion override), no horizontal page overflow at 390px to 1440px. Wide diagrams scroll inside their own container.

## Page groups

- Core: array, string, hash-table, linked-list, stack, queue, matrix, binary-tree, bst, heap, graph.
- Second-tier: trie, union-find, balanced-trees, b-tree, intervals, lru-cache.
- Specialized: range-query, skip-list, bloom-filter, kd-tree, quadtree, suffix-array, fibonacci-heap.

## Chalkboard / Blackout (default)

A tutor at a board. Everything looks drawn, nothing looks manufactured.

- **Type:** Caveat for the logo and headings, Patrick Hand for body, controls and data. Base 1.15rem. Never below 1rem.
- **Color:** black board `#15171A`, smudged panel `#202327`, white chalk `#FAFAF5`, faded chalk `#B9BCB8`, pink chalk `#FF9FB2` for values, blue chalk `#8FD3FF` for actions. States: yellow active, blue visited, green found, red danger, violet info.
- **Spacing:** generous; content breathes like a board with room left on it.
- **Borders:** 2 to 3px chalk strokes with the wobbly `--radius-*` values. No drop shadows.
- **Controls:** outlined in chalk, transparent fill; hover fills with blue chalk. Inputs are a single underline.
- **Navigation:** top bar is the board's ledge: handwritten logo over a chalk line. Sidebar is a handwritten list; active item is circled in pink chalk. Group titles are underlined by hand.
- **Visualization:** cells and nodes are outlines in pink chalk with white values, not fills. Spare cells are dashed. Edges are 2px chalk lines. A new value is written in with a left-to-right reveal.

## Toy blocks / Bubblegum

A playroom. Soft, chunky, and physical, with every object looking pressable.

- **Type:** Fredoka everywhere. Headings 600, body 400. Base 1rem.
- **Color:** pink floor `#FFE3F1`, tray `#FFF5FA`, plum ink `#4A1138`, muted plum `#7A4668`, bubblegum `#FF5FA8` with dark ink, violet `#7A3FF2` with white. States: amber active, violet visited, green found, red danger, blue info.
- **Spacing:** roomy and round; 10px minimum between blocks.
- **Borders:** few outlines. Shape comes from large radii (14, pill, 28) and a stubby solid underside, never a blurred shadow.
- **Controls:** pills with a 4px underside that press down on click. Secondary buttons are white with a plum-grey underside. Inputs are white and rounded.
- **Navigation:** top bar is a violet band. Sidebar is a pale tray of pills; active is a violet pill with an underside.
- **Visualization:** cells and nodes are puffy filled blocks, alternating bubblegum and violet where adjacent cells allow. Spare cells have thick dashed outlines. Edges are 3px with round caps. New blocks bounce in.

## Phosphor / Green

A CRT terminal. Text is the entire interface, and one phosphor color does all the work.

- **Type:** VT323 everywhere. Base 1.3rem, because the face runs small. Left-aligned.
- **Color:** only the green family on `#07120A`: `#7CFF9E` text, `#4FC773` dim, `#2E8049` lines. Brighter tints mark states. No second hue.
- **Spacing:** tight and regular, as if on a character grid.
- **Borders:** 1px dashed lines, square corners. Fixed scanline wash over the page, with `pointer-events: none`, subtle enough not to hurt legibility. Soft text glow.
- **Controls:** `[ Append ]` bracketed text; hover and focus invert to a green block. Inputs are an underline.
- **Navigation:** top bar reads like a status line: logo prefixed with `$`. Sidebar is a directory listing; active is an inverted row. Groups are `# core`-style comments (decorative prefix only).
- **Visualization:** cells are bracketed text with no fill. Nodes are outlined. States differ by non-color means: active is inverted, visited is dim, found is bright with a glow, danger is dashed. Red-black trees: red is inverted fill, black is outline. Values switch on in steps.
