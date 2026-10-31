# Chalkboard / Blackout progress

QA tool clean at 1440px and 390px on all pages. "states" means an operation was run and the result looked at.

Chrome: done; menu opened at 1440 and 390, selected/hover/focus checked.

## Core
- array: done, states (error)
- string: done, states
- hash-table: done, states run
- linked-list: done, states
- stack: done, states run
- queue: done, states
- matrix: done, states (islands, selected, hover)
- binary-tree: done, states
- bst: done, states run
- heap: done, states
- graph: done, states

## Second-tier
- trie: done, states
- union-find: done, states run
- balanced-trees: done, states (red-black, steps, unbalanced)
- b-tree: done, states
- intervals: done, states
- lru-cache: done, states

## Specialized
- range-query: done, states (Fenwick and segment)
- skip-list: done, states
- bloom-filter: done, states
- kd-tree: done, states
- quadtree: done, states
- suffix-array: done, states
- fibonacci-heap: done, states (min, marked, selected, hover)

## Known issues
- range-query segment tree and graph: index labels sit close to edges; 1rem labels in fixed geometry, readable with a board-colored halo.
- base.css `:where(input::placeholder, ...)` is invalid, so the shared placeholder rule is dropped; worked around here.
