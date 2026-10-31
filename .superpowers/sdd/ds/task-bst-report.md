# Task 9: bst

Files: backend/DataStrcutures/BinarySearchTree.py, backend/api/routes/bst_routes.py, backend/tests/test_bst.py,
frontend/src/views/BstView.{js,css,test.js}

ds.md section 9 implemented: bst_search, bst_insert, bst_delete (three cases), is_valid_bst (bounds), kth_smallest, verbatim.
Added helpers: search_path, delete_case, inorder_successor, inorder, height, count_nodes, lowest_common_ancestor (practice item), to_nested, from_level_order.
Duplicates: ignored (ds.md behaviour); the API returns 400 on a duplicate insert.
Routes (url_prefix /bst): GET, reset, clear, insert, search, delete, kth-smallest, inorder, lca, build, is-valid (live tree, or a raw level-order list with nulls to show invalid trees). Max 31 nodes, ints up to 1e9.
View: SVG tree (inorder x, depth y), search/insert/delete path highlight, delete case text, complexity text.

Commands (all passed):
- (cd backend && PYTHONDONTWRITEBYTECODE=1 venv/bin/python -m unittest tests.test_bst): 21 tests OK
- (cd frontend && CI=true npx react-scripts test src/views/BstView.test.js): 6 passed
- (cd frontend && npx eslint src/views/BstView.js src/views/BstView.test.js): no output, exit 0

Shared changes needed: register bp (api/ds_routes.py) and BstView in registry/App with slug "bst".
Concerns: not run under Python 3.9 specifically beyond venv; no 3.10+ syntax used. The module defines its own TreeNode (does not import BinaryTree).
