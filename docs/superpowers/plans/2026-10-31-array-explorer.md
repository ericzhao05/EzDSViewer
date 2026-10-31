# Array Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** One command string (for example `array.append(1).append(3).two_sum_sorted(4)`) opens a stepping, editable Array explorer at `/v?c=...` and `/embed?c=...`, running locally.

**Architecture:** A stateless Python service parses a command, runs it on a fresh `DynamicArray` and records frames. A shared React explorer plays frames and turns edits into a longer command. The command is the only state, so nothing touches the existing module-level route state.

**Tech Stack:** Flask 3 and `unittest` in `backend/`; React 19, Create React App and Testing Library in `frontend/`. No new dependencies.

**Spec:** https://claude.ai/artifact/Q7NXz5xnWJCg9rq9LJtuZt (sections "Shared core", "In-chat explorer", "Route 3"). Everything binding is copied into this plan.

## Global Constraints

- Out of scope: Render or any deployment, a public URL or domain, the MCP server, docs pages, `/commands.txt`, other structures, removing `backend/venv` from git.
- Deferred until deployment, though the spec lists them: per-IP rate limiting, usage counts and the `s=` parameter, and per-structure preview images. Don't build these.
- Do NOT run `git commit`, `git add`, `git stash` or `git push`. Leave all changes in the working tree. The coordinator snapshots them for review.
- Never use `eval`, `exec`, `getattr` on user text, or `dangerouslySetInnerHTML`. User text renders only as React text or escaped HTML.
- Run backend tests from `backend/`: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -t .`
- Run frontend tests from `frontend/`: `CI=true npx react-scripts test --watchAll=false`
- Limits: 2,000 characters per command, 200 calls, 1,000 frames, 2 seconds of run time.
- Arguments: integers with `abs(n) <= 10**9`, quoted strings, and one-level lists of those. Array values: integer or 1 to 40 character string. Array holds at most 64 elements.
- Match the surrounding code's style, comment density and test layout.

## Review Focus

- Hostile link text (very long, deep nesting, unicode, `__class__` as a method, HTML in strings) returns a clean 400 and never a 500. Pinned in Tasks 1, 2.
- Rapid edits: a slow older response must not overwrite a newer one. Pinned in Task 4.
- Arrow keys typed inside an input move the text cursor and do not change the step. Pinned in Task 5.
- Values containing `"`, `\`, `)`, `+`, `%` and spaces survive the call builder, the URL and the parser unchanged. Pinned in Tasks 1, 4.
- A 64-element array scrolls inside its board and never widens the page on a 320px screen. Pinned by CSS in Task 5.

---

### Task 1: Command parser

**Files:**
- Create: `backend/commands/__init__.py` (empty), `backend/commands/parser.py`
- Test: `backend/tests/test_command_parser.py`

**Interfaces:**
- Produces: `parse(text: str) -> Command`; `Command(structure: str, calls: list[Call])`; `Call(method: str, args: list, position: int)` where `position` is the 0-based offset of the method name; `format_call(call) -> str`; `CommandError(Exception)` with attributes `code`, `message`, `position`, `available` (defaulting to `None`); `MAX_COMMAND_CHARS = 2000`, `MAX_CALLS = 200`, `MAX_INT = 10**9`.

- [ ] **Step 1: Write failing tests**, asserting:
  - `parse('array')` gives structure `array`, no calls. `parse('hash-table.put("a", 1)')` keeps the hyphen.
  - `parse('stack.append(1)').calls[0].position == 6`.
  - Whitespace between tokens is allowed: `parse(' array . append( 1 ) ')` gives one call, args `[1]`.
  - `parse('a.b(-5, "x", \'y\', [1, "z"], [])').calls[0].args == [-5, 'x', 'y', [1, 'z'], []]`.
  - Escapes round trip: for each of `a"b`, `a\b`, `a)b`, `a+b`, `a%20b`, `a b`, `<script>`, `日本語`, the text from `format_call` parses back to the same value.
  - `format_call` output: `append(1)`, `insert(0, "a")`, `pop()`, `f([1, "z"])`.
  - Each raises `CommandError` with the given code: `''` and `'   '` → `missing_command`; 2,001 characters → `too_long`; 201 calls → `too_many_calls`; `'array.'`, `'array.f('`, `'array.f(1'`, `'array.f(1,)'`, `'array.f(1 2)'`, `'array.f("x'`, `'array.f(1.5)'`, `'array.f(true)'`, `'.f()'`, `'array f()'`, `'array.f()x'`, `'Array.f()'`, `'array.f([[1]])'`, a 1,900-character run of `[` → `syntax`; `'array.f(1000000001)'` → `bad_argument`.
  - Syntax errors have an integer `position`.
- [ ] **Step 2: Run the tests and see them fail.**
- [ ] **Step 3: Implement** a hand-written, non-recursive-beyond-one-list-level parser. Structure names and method names match `[a-z][a-z0-9_-]*` and `[a-z_][a-z0-9_]*`. Strings accept `"` or `'`, with `\\`, `\"`, `\'` escapes. `format_call` writes strings with double quotes.
- [ ] **Step 4: Run backend tests; all pass.**

### Task 2: Engine, Array operations and `GET /api/run`

**Files:**
- Create: `backend/commands/engine.py`, `backend/commands/structures/__init__.py`, `backend/commands/structures/array.py`, `backend/api/routes/run_routes.py`
- Modify: `backend/api/ds_routes.py` (register `run_routes`)
- Test: `backend/tests/test_command_engine.py`, `backend/tests/test_run_route.py`

**Interfaces:**
- Consumes: Task 1.
- Produces: `run(text, clock=time.monotonic) -> dict`, which never raises for bad input. `STRUCTURES = {"array": <array module>}` in `structures/__init__.py`. Each structure module exposes `CATALOG` and `new()`, plus handlers named in `CATALOG`, so methods are looked up only through catalog keys. A handler signature is `handler(instance, recorder, *args)` and returns the call's result. `Recorder.add(state, note, highlight=(), pointers=None, aux=None)` raises `CommandError` code `too_many_frames` above 1,000 frames, or `timeout` when `clock()` is more than 2 seconds past the start. Task 3 adds four more handlers to the same module.
- `CATALOG` shape: `{"label": "Array", "summary": str, "example": str, "limits": {"max_size": 64, "max_text": 40}, "methods": {name: {"args": [{"name": str, "type": "value"|"index"|"target", "optional": bool}], "complexity": str, "summary": str, "handler": callable}}}`. Types: `value` is an integer or a 1 to 40 character string, `index` and `target` are integers.

Response bodies (`/api/run?cmd=<text>`, method GET only):

```json
{"success": true, "error": null, "structure": "array", "command": "array.append(1)",
 "calls": ["append(1)"],
 "frames": [{"call": 0, "state": {"data": [1, null], "size": 1, "capacity": 2, "resizes": 0},
             "highlight": [0], "pointers": {}, "aux": null, "note": "Appended 1 at index 0"}],
 "state": {"data": [1, null], "size": 1, "capacity": 2, "resizes": 0}, "result": 1}
```

Failures use HTTP 400 and add `code`, `position`, `available`, `failed_call`. `command` is the input text on failure. `frames`, `calls` and `state` hold what completed before the failure, so `calls` excludes the failed call. On a syntax error or unknown structure, `frames` and `calls` are empty and `state` and `structure` are null.

All calls' method names and arguments are validated before any call runs, so `unknown_method` and `bad_argument` failures have no frames, an empty `calls`, the empty-array `state`, and `failed_call` set to that call's index. `pop` has no highlight.

Exact messages and notes:

| Call | Result | Note or error |
|---|---|---|
| `append(v)` | `v` | `Appended {v} at index {i}`; highlight `[i]` |
| `insert(i, v)` | `v` | `Inserted {v} at index {i}, shifted {n} elements right`; highlight `[i]`; error `index out of range` |
| `pop(i?)` | value | `Popped {v} from index {i}`; error `index out of range or array is empty` |
| `get(i)` | value | `array[{i}] is {v}`; highlight `[i]`; error `index out of range` (negative included) |
| `reset()` | `null` | `Array reset` |
| any append or insert that grows | | note gains ` (array was full: capacity {old} to {new}, copied {old} elements)` |
| growth past 64 | | error `array is full (max 64 elements)` |
| unknown method | | code `unknown_method`, `array has no method "foo"; available: append, insert, ...`, `position` of the name, `available` list |
| unknown structure | | code `unknown_structure`, `no explorer for "stack" yet; available: array`, `available` list |
| wrong count or type of argument | | code `bad_argument`, naming the method and argument, `position` of the method |

Handler errors raise `CommandError` code `runtime_error`; the engine sets `failed_call`.

- [ ] **Step 1: Write failing tests**, asserting every row above, plus:
  - `array.append(1).append(2).append(3)` gives 3 frames, `calls` of length 3, each frame's `call` index, and capacity 4 with the growth note on the third.
  - `array` alone gives `success: true`, no frames, and `state` for an empty array.
  - `array.append(1).pop().pop()` gives HTTP 400, code `runtime_error`, `failed_call` 2, and 2 frames kept.
  - Two identical requests return identical JSON, and `array_routes.array` is untouched by `run`.
  - `array.__class__()`, `array.handler()`, a command of 65 `.append(1)` calls (`runtime_error` on the 65th, 64 frames kept), an HTML string value and a missing `cmd` parameter all return JSON with no 500. Missing `cmd` is code `missing_command`.
  - Every method in `CATALOG` has `args`, `complexity`, `summary` and `handler`, and the entry has `label`, `summary`, `example` and `limits`. Running `CATALOG["example"]` succeeds.
  - `array.append(1).nope()` and `array.append(1).get("a")` return no frames and `failed_call` 1.
  - A fake `clock` advancing 3 seconds per read produces code `timeout`.
  - `Recorder` raises `too_many_frames` on frame 1,001.
  - POST to `/api/run` returns 405.
- [ ] **Step 2: Run the tests and see them fail.**
- [ ] **Step 3: Implement.** Reuse `DynamicArray` and `to_dict()`; don't modify `DynamicArray.py`. Follow the blueprint pattern in `backend/api/routes/` and test with `tests.helpers.client_for`.
- [ ] **Step 4: Run backend tests; all pass.**

### Task 3: Step recording for Array's four algorithms

**Files:**
- Modify: `backend/commands/structures/array.py`
- Test: `backend/tests/test_array_steps.py`

**Interfaces:**
- Consumes: Task 2's `Recorder` and `CATALOG`.
- Produces: catalog methods `two_sum_sorted(target)`, `binary_search(target)`, `max_subarray()`, `prefix_sums()`. Each uses the current elements, leaves the array unchanged, and records one frame per algorithm step.

| Method | Frames | Errors |
|---|---|---|
| `two_sum_sorted` | `pointers {left, right}`, `highlight [l, r]`. Notes: `{a} + {b} = {s}, too small: move the left pointer`; `{a} + {b} = {s}, too large: move the right pointer`; `{a} + {b} = {s}: found target {t}`. If nothing matches, a last frame with no pointers: `No two numbers add to {t}` | `array must be sorted ascending for two pointers` |
| `binary_search` | `pointers {left, mid, right}`, `highlight [mid]`. Notes: `Middle is {x} at index {m}: too small, search the right half`; `Middle is {x} at index {m}: too large, search the left half`; `Found {t} at index {m}`. If absent, a last frame with no pointers: `{t} is not in the array` | `array must be sorted ascending for binary search` |
| `max_subarray` | One per index, `pointers {i}`, `highlight` = current window. Note: `At index {i}: current sum {c}, best {b}` | `array is empty` |
| `prefix_sums` | `aux {"prefix": [...]}`, first frame `prefix[0] = 0`, then one per element: `prefix[{i+1}] = {p} + {n} = {q}`; highlight `[i]` | none |

All four raise `this algorithm needs an array of numbers only` when any element is a string.

- [ ] **Step 1: Write failing tests**, asserting:
  - `array.append(1).append(3).append(5).append(7).two_sum_sorted(10)` has 6 frames. Frame 5 is note `1 + 7 = 8, too small: move the left pointer` with pointers `{left: 0, right: 3}`. Result is `[1, 3]`.
  - For a fixed table of inputs, including empty, one element, duplicates, negatives and no match, each method's `result` equals `two_sum_sorted`, `binary_search`, `max_subarray` or `range_sum_prefix` from `DataStrcutures.DynamicArray`.
  - The state in the frames recorded by an algorithm equals the state before it ran.
  - Each error in the table above returns HTTP 400 code `runtime_error`.
- [ ] **Step 2: Run the tests and see them fail.**
- [ ] **Step 3: Implement** in `array.py`, mirroring the loops in `DynamicArray.py`.
- [ ] **Step 4: Run backend tests; all pass.**

### Task 4: Frontend command helpers and `useExplorer`

**Files:**
- Create: `frontend/src/explorer/commandLang.js`, `frontend/src/explorer/useExplorer.js`
- Modify: `frontend/src/api/client.js`
- Test: `frontend/src/explorer/commandLang.test.js`, `frontend/src/explorer/useExplorer.test.js`

**Interfaces:**
- Consumes: the `/api/run` JSON from Task 2.
- Produces:
  - `client.js`: `API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5000/api' : '/api')`. `runCommand(text)` fetches `${API_BASE}/run?cmd=<encodeCommand(text)>` and resolves to the JSON body for both 200 and 400, rejecting only on network failure or non-JSON.
  - `commandLang.js`: `encodeCommand(text)` is `encodeURIComponent` plus percent-encoding `! ' ( ) *`. `quoteArg(value)` writes integers as-is and strings in double quotes with `\` and `"` escaped. `buildCall(method, args)` gives `append(1)` or `insert(0, "a")`. `linkFor(origin, command, page = 'v')` gives `${origin}/${page}?c=${encodeCommand(command)}`. `MAX_LINK_CHARS = 2000`.
  - `useExplorer(initialCommand)` returns `{ command, structure, calls, frames, step, frame, state, result, error, loading, load(text), applyCall(callText), undo(), goTo(i), next(), prev() }`. `frame` is `frames[step] || null`. `state` is `frame ? frame.state : response.state`. `error` is `{ message, code, position, available } | null`.

Behaviour:
- `load(text)` replaces everything. On success `step` is 0. On a failed response it keeps the returned frames, sets `step` to the last frame and sets `error`; `command` stays the text that was loaded, so the person can correct it.
- `applyCall(callText)` runs `structure` plus the completed `calls` plus `callText`, joined with `.`, so a link that failed partway can still be edited. On success it sets `step` to the first frame of the new call, or the last frame if the call made none. On failure it keeps the previous command, frames and step, and sets `error`. It does nothing when `structure` is null.
- `undo()` runs `structure` plus all completed `calls` but the last, then sets `step` to the last frame. It does nothing when `calls` is empty.
- Any successful request clears `error`. `next`, `prev` and `goTo` clamp to the valid range and never send a request.
- Responses that arrive out of order are ignored: only the most recent request may update state.

- [ ] **Step 1: Write failing tests** with a mocked `global.fetch`, covering each behaviour above and:
  - `encodeCommand('array.append("a+b c)")')` contains none of `+`, space, `(`, `)` or `"`, and `decodeURIComponent` restores it.
  - `buildCall('append', ['a"b\\c'])` is `append("a\"b\\c")`.
  - Stale response: start request A, start request B, resolve B then A; the hook shows B.
  - After a load fails on its third call, `applyCall('append(9)')` requests `array.<first two calls>.append(9)`.
- [ ] **Step 2: Run the tests and see them fail.**
- [ ] **Step 3: Implement.** Existing `dsGet` and `dsPost` stay as they are.
- [ ] **Step 4: Run frontend tests; all pass.**

### Task 5: Explorer UI and Array board

**Files:**
- Create: `frontend/src/explorer/Explorer.js`, `frontend/src/explorer/Explorer.css`, `frontend/src/explorer/boards.js`, `frontend/src/views/ArrayCells.js`, `frontend/src/explorer/array/ArrayBoard.js`, `frontend/src/explorer/array/ArrayControls.js`
- Modify: `frontend/src/views/ArrayView.js` (render cells through `ArrayCells`, no behaviour change)
- Test: `frontend/src/explorer/Explorer.test.js`, `frontend/src/explorer/array/ArrayBoard.test.js`

**Interfaces:**
- Consumes: Task 4.
- Produces:
  - `<Explorer initialCommand={string} embed={bool} />`.
  - `boards.js`: `BOARDS = { array: { Board: ArrayBoard, Controls: ArrayControls } }`.
  - `<ArrayCells state highlight pointers />`, importing `./ArrayView.css` and drawing the cell markup and CSS classes from `ArrayView.js`, with highlighted cells marked and pointer names under their cells. `highlight` and `pointers` default to empty so `ArrayView` looks the same as before.
  - `<ArrayBoard frame state />` shows size, capacity, resizes, `ArrayCells` and, when `frame.aux.prefix` exists, the prefix values.
  - `<ArrayControls onCall={fn} onUndo={fn} canUndo disabled />` has inputs labelled Value, Index and Target, and buttons Append, Insert, Pop, Get, Reset, Two sum, Binary search, Max subarray, Prefix sums and Undo. A whole-number value becomes an integer; anything else stays a string. Missing input shows an inline message and sends nothing.

Explorer behaviour:
- Controls: buttons named `Previous step`, `Next step`, `Play` or `Pause`, `Restart`, a range slider labelled `Step`, a speed choice as visible buttons `Slow`, `Normal`, `Fast` (1600, 900, 400 ms), and text `Step {n} of {m}`. With no frames, the text is `No steps yet` and the step controls are disabled.
- The note renders in `role="status"`; errors render in `role="alert"` with their message and, when present, `Available: {available joined by ", "}`. This stands in for the spec's catalog link until the docs exist.
- Autoplay runs once after the first load, stops at the last frame, and doesn't run when `window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches`. The optional calls matter because jsdom has no `matchMedia`. Pressing any control or making an edit stops playback. Edits don't autoplay, and a failed first load doesn't autoplay.
- Keyboard: Left, Right, Home and End step and Space toggles play, unless focus is in an `input`, `textarea` or `button`.
- A `Command` text input and `Run` button call `load`.
- Copy buttons: `Copy link` uses `linkFor(window.location.origin, command)` and is disabled with the visible note `This command is too long to share as a link` when the link exceeds `MAX_LINK_CHARS`. `Copy embed code` writes `<iframe src="{embed link}" title="EzDSViewer animation" width="100%" height="480"></iframe>`. `Copy question for Claude` writes `Explain what happens at each step of this EzDSViewer command: {command}`. A failed clipboard call shows a message rather than throwing.
- `embed` hides the command input, the Controls and the Copy buttons, and shows a link `Open in EzDSViewer` to the `/v` link with `target="_blank"` and `rel="noopener noreferrer"`.
- When `structure` has no board, or the first load fails with no structure, show the error and the command input, with no board.
- Cells scroll inside `.array-scroll`; `Explorer.css` must let the board shrink to any container width (`min-width: 0`). Tap targets are at least 44px. Colours use the app's CSS variables so dark mode works.

- [ ] **Step 1: Write failing tests** with a mocked `global.fetch`, asserting:
  - The sample command renders its cells, `Step 1 of 2`, and the note. `Next step` and the Right arrow key both advance; `Previous step` clamps at the start.
  - Pressing Right while focus is in the Value input doesn't change the step.
  - Autoplay advances with fake timers and stops at the end; with reduced motion it doesn't start.
  - Append with Value `5` requests a command ending `.append(5)`; Value `a"b` is sent correctly quoted; a runtime failure shows the alert and keeps the prior step.
  - Undo requests the shorter command.
  - `embed` shows the Open link and no Value input.
  - A string value `<img src=x onerror=alert(1)>` renders as text with no `img` element.
  - `ArrayView.test.js` still passes unchanged.
- [ ] **Step 2: Run the tests and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run frontend tests; all pass.**

### Task 6: `/v` and `/embed` pages

**Files:**
- Create: `frontend/src/explorer/PlayerPage.js`, `frontend/.env` (`INLINE_RUNTIME_CHUNK=false`), `backend/api/pages.py`
- Modify: `frontend/src/App.js`, `backend/app.py`
- Test: `frontend/src/explorer/PlayerPage.test.js`, `backend/tests/test_pages.py`

**Interfaces:**
- Consumes: `Explorer`, and `parse` and `STRUCTURES` from the backend.
- Produces:
  - `App` renders `<PlayerPage embed={...} />` instead of the sidebar layout when `window.location.pathname` is `/v` or `/embed`. Other paths are unchanged.
  - `App` does the path check in a small wrapper, with today's body moved to a separate component, so hooks aren't called conditionally. `App.css` still loads on the player pages.
  - `PlayerPage` reads `c` from the query string, defaulting to `array`. It applies the `dark-mode` body class from `localStorage.darkMode` on `/v`, and from `theme=dark` on `/embed`, and makes sure `App.css`'s theme variables apply.
  - `backend/api/pages.py`: blueprint `pages` with `/v`, `/embed` and `/static/<path:filename>`, and module variable `BUILD_DIR` defaulting to `frontend/build`. `backend/app.py` uses `Flask(__name__, static_folder=None)` and registers it.

Server behaviour:
- `/v` and `/embed` send `BUILD_DIR/index.html` with tags inserted before `</head>`: `<meta name="robots" content="noindex">`, and `og:title`, `og:description` and `twitter:card` (`summary`).
- `og:title` is `{catalog label}: {n} operations` (`1 operation` when singular) when `c` parses and the structure is known, otherwise `EzDSViewer`. `og:description` is the fixed text `Step through a data structure animation.` Arguments never appear in the page.
- Header on both pages: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`. `/v` adds `; frame-ancestors 'none'`; `/embed` doesn't.
- Without a build, both pages return 503 with the text `Frontend build not found. Run npm run build in frontend/.`

- [ ] **Step 1: Write failing tests**, asserting:
  - `/v?c=` with `array.append(1).pop()` has title `Array: 2 operations`, the noindex tag, and `frame-ancestors 'none'`.
  - `/embed` has the CSP without `frame-ancestors`.
  - A `c` holding `"><script>alert(1)</script>` or a string argument `SECRETVALUE` never appears in the HTML, and the title is `EzDSViewer` or the count form.
  - A 503 is returned when `BUILD_DIR` is missing. Use a temporary directory with a small `index.html` for other tests.
  - `/static/x.js` serves from the temporary directory, and `/static/../index.html` doesn't escape it.
  - `PlayerPage` at `/embed?c=...&theme=dark` passes the command, sets `embed`, and sets the body class, restoring it after the test.
  - `App` at `/` still shows the sidebar.
- [ ] **Step 2: Run the tests and see them fail.**
- [ ] **Step 3: Implement.** Rendering uses `markupsafe.escape` for every inserted value.
- [ ] **Step 4: Run all backend and frontend tests; all pass.**
- [ ] **Step 5: Verify a production build:** from `frontend/`, `npm run build` succeeds, and the emitted `build/index.html` contains no inline `<script>` body. `frontend/build` must stay git-ignored.

### After all tasks: browser check (coordinator)

Serve the build through Flask locally and open `/v` and `/embed` in a real browser. Confirm the page has no CSP errors, the arrows and arrow keys step, Try your own works, and a 64-element array scrolls inside its board with no page overflow at 320px wide.
