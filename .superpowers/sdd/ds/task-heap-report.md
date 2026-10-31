# Task 10: heap

Files: backend/DataStrcutures/Heap.py, backend/api/routes/heap_routes.py, backend/tests/test_heap.py,
frontend/src/views/HeapView.{js,css,test.js}

ds.md section 10 items: MinHeap (init/build O(n), len, peek, push, pop, sift up/down), kth_largest,
top_k_frequent, MedianFinder, all verbatim; added MinHeap.to_list and MedianFinder.to_dict for state export.
API ops: GET, reset, push, pop, peek, build, search, kth-largest, top-k-frequent, median-add, median.
Limits: 31 heap items, 100 nums, |value| <= 1e9, whole numbers only; bad input gives 400 with state.
View: SVG tree plus array form (index labels), highlight on peek/search, two-heap median display, complexity text.

Commands:
- (cd backend && PYTHONDONTWRITEBYTECODE=1 venv/bin/python -m unittest tests.test_heap) -> Ran 18 tests, OK
- (cd frontend && CI=true npx react-scripts test src/views/HeapView.test.js) -> 6 passed
- (cd frontend && npx eslint src/views/HeapView.js src/views/HeapView.test.js) -> no output (clean)

Concerns: none. Shared changes needed: register heap blueprint and a nav/registry entry for HeapView (coordinator).
Python 3.13 not run (only backend/venv); code uses no 3.10+ syntax.
