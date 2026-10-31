import json
import math
import random
import unittest

from DataStrcutures.BTree import BPlusTree, BTree
from api.routes import b_tree_routes as r
from tests.helpers import client_for


def check_btree(tree):
    """Every property from the order-m table, for the whole tree."""
    m = tree.order
    min_keys = math.ceil(m / 2) - 1
    leaf_depths = set()
    seen = []

    def walk(node, depth, is_root, low, high):
        assert len(node.keys) <= m - 1, "too many keys"
        assert node.keys == sorted(set(node.keys)), "keys not strictly sorted"
        for k in node.keys:
            assert low is None or k > low, "key below subtree bound"
            assert high is None or k < high, "key above subtree bound"
        if not is_root:
            assert len(node.keys) >= min_keys, "too few keys"
        if not node.children:
            leaf_depths.add(depth)
            seen.extend(node.keys)
            return
        assert len(node.children) == len(node.keys) + 1, "children != keys + 1"
        assert len(node.children) <= m, "too many children"
        if is_root:
            assert len(node.children) >= 2, "internal root needs two children"
        else:
            assert len(node.children) >= math.ceil(m / 2), "too few children"
        bounds = [low] + node.keys + [high]
        for i, child in enumerate(node.children):
            walk(child, depth + 1, False, bounds[i], bounds[i + 1])
            if i < len(node.keys):
                seen.append(node.keys[i])

    walk(tree.root, 0, True, None, None)
    assert len(leaf_depths) == 1, "leaves at different depths"
    assert seen == sorted(seen), "in-order walk not sorted"
    assert len(seen) == len(tree), "size does not match key count"


def check_bplus(tree):
    """Order-m shape, routing separators, values only in leaves, and the leaf chain."""
    m = tree.order
    min_internal = math.ceil(m / 2) - 1
    min_leaf = m // 2
    leaves = []
    depths = set()

    def walk(node, depth, is_root, low, high):
        assert len(node.keys) <= m - 1, "too many keys"
        assert node.keys == sorted(set(node.keys)), "keys not strictly sorted"
        if node.is_leaf:
            assert len(node.values) == len(node.keys), "one value per key"
            if not is_root:
                assert len(node.keys) >= min_leaf, "leaf too small"
            for k in node.keys:
                assert low is None or k >= low, "leaf key below separator"
                assert high is None or k < high, "leaf key at or above separator"
            depths.add(depth)
            leaves.append(node)
            return
        assert not hasattr(node, "values"), "internal node holds values"
        assert len(node.children) == len(node.keys) + 1, "children != keys + 1"
        if not is_root:
            assert len(node.keys) >= min_internal, "internal node too small"
        else:
            assert len(node.children) >= 2, "internal root needs two children"
        bounds = [low] + node.keys + [high]
        for i, child in enumerate(node.children):
            walk(child, depth + 1, False, bounds[i], bounds[i + 1])

    walk(tree.root, 0, True, None, None)
    assert len(depths) == 1, "leaves at different depths"
    for a, b in zip(leaves, leaves[1:]):
        assert a.next is b, "leaf chain broken"
    assert leaves[-1].next is None, "last leaf must end the chain"
    keys = [k for leaf in leaves for k in leaf.keys]
    assert keys == sorted(keys), "leaf keys not sorted across the chain"
    assert len(keys) == len(tree), "size does not match leaf keys"


def shape(node):
    return (node.keys, [shape(c) for c in node.children]) if node.children else node.keys


class BTreeClassTests(unittest.TestCase):
    def tree(self, keys, order=3):
        t = BTree(order)
        for k in keys:
            t.insert(k)
        return t

    def test_rejects_small_or_non_integer_order(self):
        for bad in (2, 0, -1, 3.5, True, None, "4"):
            with self.assertRaises(ValueError):
                BTree(bad)
            with self.assertRaises(ValueError):
                BPlusTree(bad)

    def test_empty_tree(self):
        t = BTree()
        self.assertEqual(len(t), 0)
        self.assertEqual(t.height(), 0)
        self.assertEqual(t.keys(), [])
        self.assertFalse(t.search(1))
        self.assertEqual(t.search_path(1), (False, []))
        with self.assertRaises(KeyError):
            t.delete(1)

    def test_insert_split_moves_median_up(self):
        t = self.tree([1, 2, 3])
        self.assertEqual(shape(t.root), ([2], [[1], [3]]))
        self.assertEqual(t.height(), 2)
        self.assertTrue(any("split" in e and "median 2" in e for e in t.events))

    def test_cascading_split_grows_height(self):
        t = self.tree(range(1, 8))
        self.assertEqual(shape(t.root), ([4], [([2], [[1], [3]]), ([6], [[5], [7]])]))
        self.assertEqual(t.height(), 3)

    def test_even_order_split_keeps_minimums(self):
        t = self.tree([1, 2, 3, 4], order=4)
        self.assertEqual(shape(t.root), ([3], [[1, 2], [4]]))
        check_btree(t)

    def test_duplicate_insert_changes_nothing(self):
        t = self.tree([1, 2, 3])
        self.assertFalse(t.insert(2))
        self.assertEqual(len(t), 3)
        self.assertEqual(t.keys(), [1, 2, 3])

    def test_search_in_leaf_internal_and_absent(self):
        t = self.tree(range(1, 8))
        self.assertTrue(t.search(4))
        self.assertTrue(t.search(7))
        self.assertFalse(t.search(8))
        self.assertIn(4, t)
        self.assertNotIn(8, t)

    def test_search_path_names_each_visited_node(self):
        t = self.tree(range(1, 8))
        self.assertEqual(t.search_path(4), (True, ["r"]))
        self.assertEqual(t.search_path(5), (True, ["r", "r.1", "r.1.0"]))
        self.assertEqual(t.search_path(0), (False, ["r", "r.0", "r.0.0"]))

    def test_delete_borrows_from_right_sibling(self):
        t = self.tree([1, 2, 3, 4])
        t.delete(1)
        self.assertEqual(shape(t.root), ([3], [[2], [4]]))
        self.assertTrue(any("borrow" in e and "right" in e for e in t.events))

    def test_delete_borrows_from_left_sibling(self):
        t = self.tree([2, 3, 4, 1])
        self.assertEqual(shape(t.root), ([3], [[1, 2], [4]]))
        t.delete(4)
        self.assertEqual(shape(t.root), ([2], [[1], [3]]))
        self.assertTrue(any("borrow" in e and "left" in e for e in t.events))

    def test_delete_merges_and_collapses_root(self):
        t = self.tree([1, 2, 3])
        t.delete(1)
        self.assertEqual(shape(t.root), [2, 3])
        self.assertEqual(t.height(), 1)
        self.assertTrue(any("merge" in e for e in t.events))
        self.assertTrue(any("root" in e for e in t.events))

    def test_delete_internal_key_uses_predecessor_and_cascades(self):
        t = self.tree(range(1, 8))
        t.delete(4)
        self.assertEqual(shape(t.root), ([3, 6], [[1, 2], [5], [7]]))
        self.assertTrue(any("predecessor 3" in e for e in t.events))
        check_btree(t)

    def test_delete_missing_key_leaves_tree_alone(self):
        t = self.tree([1, 2, 3])
        before = shape(t.root)
        with self.assertRaises(KeyError):
            t.delete(9)
        self.assertEqual(shape(t.root), before)
        self.assertEqual(len(t), 3)

    def test_delete_everything_returns_to_empty_root(self):
        t = self.tree(range(20), order=4)
        for k in range(20):
            t.delete(k)
        self.assertEqual(len(t), 0)
        self.assertEqual(t.root.keys, [])
        self.assertEqual(t.root.children, [])

    def test_to_dict_exports_nested_state(self):
        d = self.tree([1, 2, 3]).to_dict()
        self.assertEqual(d["order"], 3)
        self.assertEqual(d["size"], 3)
        self.assertEqual(d["height"], 2)
        self.assertEqual(d["root"]["id"], "r")
        self.assertEqual(d["root"]["keys"], [2])
        self.assertEqual([c["id"] for c in d["root"]["children"]], ["r.0", "r.1"])
        self.assertTrue(d["root"]["children"][0]["leaf"])
        json.dumps(d)

    def test_checker_detects_corruption(self):
        t = self.tree(range(1, 8))
        t.root.children[0].children.pop()
        with self.assertRaises(AssertionError):
            check_btree(t)
        t = self.tree([1, 2, 3])
        t.root.children[0].keys = [5]
        with self.assertRaises(AssertionError):
            check_btree(t)

    def test_randomized_against_model(self):
        for order in range(3, 9):
            for seed in range(5):
                rng = random.Random(order * 100 + seed)
                t = BTree(order)
                model = set()
                for _ in range(600):
                    k = rng.randrange(80)
                    if rng.random() < 0.55:
                        self.assertEqual(t.insert(k), k not in model)
                        model.add(k)
                    elif k in model:
                        t.delete(k)
                        model.discard(k)
                    else:
                        with self.assertRaises(KeyError):
                            t.delete(k)
                    check_btree(t)
                    self.assertEqual(t.keys(), sorted(model))
                    self.assertEqual(t.search(k), k in model)


class BPlusClassTests(unittest.TestCase):
    def tree(self, keys, order=3):
        t = BPlusTree(order)
        for k in keys:
            t.insert(k, "v%d" % k)
        return t

    def test_empty_tree(self):
        t = BPlusTree()
        self.assertEqual(len(t), 0)
        self.assertEqual(t.height(), 0)
        self.assertEqual(t.items(), [])
        self.assertEqual(t.range_scan(0, 9), [])
        self.assertEqual(t.search_path(1), (False, []))
        with self.assertRaises(KeyError):
            t.delete(1)

    def test_leaf_split_copies_separator_up(self):
        t = self.tree([1, 2, 3])
        self.assertEqual(shape(t.root), ([2], [[1], [2, 3]]))
        self.assertEqual(t.root.children[0].next, t.root.children[1])
        self.assertTrue(any("split" in e and "copy 2" in e for e in t.events))

    def test_internal_split_moves_median_up(self):
        t = self.tree(range(1, 6))
        self.assertTrue(any("internal" in e and "median 3" in e for e in t.events))
        self.assertEqual(shape(t.root), ([3], [([2], [[1], [2]]), ([4], [[3], [4, 5]])]))
        self.assertEqual(t.height(), 3)
        check_bplus(t)

    def test_values_live_only_in_leaves(self):
        t = self.tree(range(1, 20))
        check_bplus(t)
        self.assertFalse(hasattr(t.root, "values"))
        self.assertEqual(t.search(7), "v7")
        self.assertEqual(t.get(7), "v7")

    def test_search_absent_gives_default(self):
        t = self.tree([1, 2, 3])
        self.assertIsNone(t.search(9))
        self.assertEqual(t.get(9, "none"), "none")
        self.assertNotIn(9, t)
        self.assertIn(1, t)

    def test_stored_none_value_is_still_present(self):
        t = BPlusTree()
        self.assertTrue(t.insert(1))
        self.assertIn(1, t)
        self.assertIsNone(t.search(1))

    def test_insert_existing_key_overwrites_value(self):
        t = self.tree([1, 2, 3])
        self.assertFalse(t.insert(2, "new"))
        self.assertEqual(t.search(2), "new")
        self.assertEqual(len(t), 3)

    def test_range_scan_is_inclusive_and_crosses_leaves(self):
        t = self.tree(range(0, 40, 2))
        self.assertEqual(t.range_scan(5, 11), [(6, "v6"), (8, "v8"), (10, "v10")])
        self.assertEqual(t.range_scan(4, 4), [(4, "v4")])
        self.assertEqual(t.range_scan(5, 5), [])
        self.assertEqual(t.range_scan(100, 200), [])
        self.assertEqual(len(t.range_scan(-5, 100)), 20)

    def test_range_scan_rejects_inverted_bounds(self):
        with self.assertRaises(ValueError):
            self.tree([1]).range_scan(5, 1)

    def test_range_trace_walks_the_leaf_chain(self):
        t = self.tree(range(1, 8))
        trace = t.range_trace(1, 7)
        self.assertEqual(trace["path"][0], "r")
        ids = {leaf["id"] for leaf in t.to_dict()["leaves"]}
        self.assertEqual(set(trace["leaves"]), ids)
        self.assertEqual(trace["items"], t.items())
        narrow = t.range_trace(1, 1)
        self.assertEqual(len(narrow["leaves"]), 1)

    def test_delete_returns_value_and_borrows_from_right(self):
        t = self.tree([1, 2, 3])
        self.assertEqual(t.delete(1), "v1")
        self.assertEqual(shape(t.root), ([3], [[2], [3]]))
        self.assertTrue(any("borrow" in e and "right" in e for e in t.events))

    def test_delete_borrows_from_left(self):
        t = BPlusTree(4)
        for k in [1, 2, 3, 4, 0]:
            t.insert(k)
        self.assertEqual(shape(t.root), ([3], [[0, 1, 2], [3, 4]]))
        t.delete(4)
        self.assertEqual(shape(t.root), ([2], [[0, 1], [2, 3]]))
        self.assertTrue(any("borrow" in e and "left" in e for e in t.events))

    def test_delete_merges_relinks_and_collapses_root(self):
        t = self.tree([1, 2, 3])
        t.delete(2)
        t.delete(3)
        self.assertEqual(shape(t.root), [1])
        self.assertIsNone(t.root.next)
        self.assertTrue(any("merge" in e for e in t.events))
        self.assertTrue(any("root" in e for e in t.events))

    def test_deleted_key_may_stay_as_routing_separator(self):
        t = self.tree([1, 2, 3])
        t.delete(2)
        self.assertEqual(t.root.keys, [2])
        self.assertNotIn(2, t)
        self.assertEqual(t.search_path(2)[0], False)
        check_bplus(t)

    def test_merge_in_the_middle_keeps_chain(self):
        t = self.tree(range(1, 12))
        for k in [4, 5, 6, 7]:
            t.delete(k)
            check_bplus(t)
        self.assertEqual([k for k, _ in t.items()], [1, 2, 3, 8, 9, 10, 11])

    def test_delete_everything_returns_to_empty_leaf(self):
        t = self.tree(range(30), order=4)
        for k in range(30):
            t.delete(k)
        self.assertEqual(len(t), 0)
        self.assertTrue(t.root.is_leaf)
        self.assertEqual(t.root.keys, [])
        self.assertIsNone(t.root.next)

    def test_to_dict_exports_leaves_and_next_links(self):
        d = self.tree([1, 2, 3]).to_dict()
        self.assertEqual(d["size"], 3)
        self.assertEqual(d["root"]["id"], "r")
        self.assertEqual(d["root"]["children"][0]["next"], "r.1")
        self.assertIsNone(d["root"]["children"][1]["next"])
        self.assertEqual(d["root"]["children"][1]["values"], ["v2", "v3"])
        self.assertEqual(
            d["leaves"],
            [{"id": "r.0", "keys": [1]}, {"id": "r.1", "keys": [2, 3]}],
        )
        json.dumps(d)

    def test_checker_detects_broken_chain(self):
        t = self.tree(range(1, 8))
        t.root.children[0].children[0].next = None
        with self.assertRaises(AssertionError):
            check_bplus(t)

    def test_randomized_against_model(self):
        for order in range(3, 9):
            for seed in range(5):
                rng = random.Random(order * 1000 + seed)
                t = BPlusTree(order)
                model = {}
                for step in range(600):
                    k = rng.randrange(80)
                    if rng.random() < 0.55:
                        self.assertEqual(t.insert(k, step), k not in model)
                        model[k] = step
                    elif k in model:
                        self.assertEqual(t.delete(k), model.pop(k))
                    else:
                        with self.assertRaises(KeyError):
                            t.delete(k)
                    check_bplus(t)
                    self.assertEqual(t.items(), sorted(model.items()))
                    self.assertEqual(t.get(k, "gone"), model.get(k, "gone"))
                    lo = rng.randrange(80)
                    hi = lo + rng.randrange(30)
                    want = sorted((a, b) for a, b in model.items() if lo <= a <= hi)
                    self.assertEqual(t.range_scan(lo, hi), want)


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, op, payload=None):
        return self.c.post("/api/b-tree/" + op, json={} if payload is None else payload)

    def bad(self, op, payload=None):
        res = self.post(op, payload)
        self.assertEqual(res.status_code, 400, (op, payload))
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertTrue(data["error"])
        self.assertIn("btree", data["state"])

    def test_get_state(self):
        res = self.c.get("/api/b-tree")
        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(data["success"])
        self.assertIsNone(data["result"])
        self.assertEqual(data["state"]["order"], r.DEFAULT_ORDER)
        self.assertEqual(data["state"]["btree"]["size"], len(r.DEFAULT_KEYS))
        self.assertEqual(data["state"]["bplus"]["size"], len(r.DEFAULT_KEYS))
        self.assertIn("limits", data["state"])

    def test_insert(self):
        data = self.post("insert", {"key": 99}).get_json()
        self.assertEqual(data["result"]["key"], 99)
        self.assertTrue(data["result"]["inserted"])
        self.assertIsInstance(data["result"]["events"], list)
        self.assertEqual(data["state"]["btree"]["size"], len(r.DEFAULT_KEYS) + 1)
        self.assertEqual(data["state"]["bplus"]["size"], len(r.DEFAULT_KEYS))

    def test_insert_duplicate_reports_not_inserted(self):
        data = self.post("insert", {"key": r.DEFAULT_KEYS[0]}).get_json()
        self.assertTrue(data["success"])
        self.assertFalse(data["result"]["inserted"])

    def test_search(self):
        key = r.DEFAULT_KEYS[0]
        found = self.post("search", {"key": key}).get_json()["result"]
        self.assertTrue(found["found"])
        self.assertEqual(found["path"][0], "r")
        self.assertFalse(self.post("search", {"key": 9999}).get_json()["result"]["found"])

    def test_delete(self):
        key = r.DEFAULT_KEYS[0]
        data = self.post("delete", {"key": key}).get_json()
        self.assertEqual(data["result"]["key"], key)
        self.assertEqual(data["state"]["btree"]["size"], len(r.DEFAULT_KEYS) - 1)
        self.bad("delete", {"key": key})

    def test_bplus_insert_default_and_custom_value(self):
        data = self.post("bplus-insert", {"key": 99}).get_json()
        self.assertTrue(data["result"]["inserted"])
        self.assertEqual(data["result"]["value"], "row 99")
        data = self.post("bplus-insert", {"key": 99, "value": "  hi  "}).get_json()
        self.assertFalse(data["result"]["inserted"])
        self.assertEqual(data["result"]["value"], "hi")
        self.assertEqual(self.post("bplus-search", {"key": 99}).get_json()["result"]["value"], "hi")

    def test_bplus_search_absent(self):
        res = self.post("bplus-search", {"key": 9999}).get_json()["result"]
        self.assertFalse(res["found"])
        self.assertIsNone(res["value"])

    def test_bplus_delete(self):
        key = r.DEFAULT_KEYS[0]
        data = self.post("bplus-delete", {"key": key}).get_json()
        self.assertEqual(data["result"]["value"], "row %d" % key)
        self.bad("bplus-delete", {"key": key})

    def test_bplus_range(self):
        res = self.post("bplus-range", {"low": 6, "high": 12}).get_json()["result"]
        keys = [i["key"] for i in res["items"]]
        self.assertEqual(keys, sorted(k for k in r.DEFAULT_KEYS if 6 <= k <= 12))
        self.assertTrue(res["leaves"])
        self.assertEqual(res["path"][0], "r")

    def test_build_replaces_both_trees(self):
        data = self.post("build", {"keys": [3, 1, 2, 2]}).get_json()
        self.assertEqual(data["state"]["btree"]["size"], 3)
        self.assertEqual(data["state"]["bplus"]["size"], 3)
        data = self.post("build", {"keys": []}).get_json()
        self.assertEqual(data["state"]["btree"]["size"], 0)
        self.assertEqual(data["state"]["btree"]["root"]["keys"], [])

    def test_set_order_rebuilds_and_keeps_contents(self):
        self.post("bplus-insert", {"key": 99, "value": "kept"})
        self.post("insert", {"key": 77})
        data = self.post("set-order", {"order": 3}).get_json()
        self.assertEqual(data["state"]["order"], 3)
        self.assertEqual(data["state"]["btree"]["order"], 3)
        self.assertEqual(data["state"]["bplus"]["order"], 3)
        self.assertEqual(self.post("bplus-search", {"key": 99}).get_json()["result"]["value"], "kept")
        self.assertTrue(self.post("search", {"key": 77}).get_json()["result"]["found"])
        check_btree(r.btree)
        check_bplus(r.bplus)

    def test_reset_restores_initial_state(self):
        first = self.c.get("/api/b-tree").get_json()["state"]
        self.post("set-order", {"order": 5})
        self.post("insert", {"key": 99})
        self.post("bplus-delete", {"key": r.DEFAULT_KEYS[0]})
        self.assertEqual(self.post("reset").get_json()["state"], first)

    def test_key_limit_blocks_new_keys_only(self):
        self.post("build", {"keys": list(range(r.MAX_KEYS))})
        self.bad("insert", {"key": 5000})
        self.bad("bplus-insert", {"key": 5000})
        self.assertFalse(self.post("insert", {"key": 1}).get_json()["result"]["inserted"])
        self.assertEqual(self.post("bplus-insert", {"key": 1, "value": "x"}).status_code, 200)

    def test_whole_float_key_is_accepted(self):
        self.assertEqual(self.post("insert", {"key": 42.0}).get_json()["result"]["key"], 42)

    def test_bad_keys_are_rejected(self):
        bad_keys = [None, "1", True, 1.5, [], {}, r.MAX_ABS + 1, -r.MAX_ABS - 1, 10 ** 30]
        for op in ("insert", "search", "delete", "bplus-insert", "bplus-search", "bplus-delete"):
            self.bad(op, {})
            for key in bad_keys:
                self.bad(op, {"key": key})

    def test_bad_values_are_rejected(self):
        for value in (1, True, [], {}, "", "   ", "x" * (r.MAX_VALUE_LEN + 1)):
            self.bad("bplus-insert", {"key": 1, "value": value})

    def test_bad_range_is_rejected(self):
        for payload in ({}, {"low": 1}, {"high": 1}, {"low": "a", "high": 1}, {"low": 5, "high": 1}):
            self.bad("bplus-range", payload)

    def test_bad_build_is_rejected(self):
        for payload in ({}, {"keys": 3}, {"keys": ["a"]}, {"keys": [True]},
                        {"keys": list(range(r.MAX_KEYS + 1))}):
            self.bad("build", payload)

    def test_bad_order_is_rejected(self):
        for order in (None, "4", True, 3.5, r.MIN_ORDER - 1, r.MAX_ORDER + 1, 10 ** 30):
            self.bad("set-order", {"order": order})
        self.bad("set-order", {})

    def test_failed_ops_leave_state_alone(self):
        first = self.c.get("/api/b-tree").get_json()["state"]
        self.bad("set-order", {"order": 99})
        self.bad("build", {"keys": ["a"]})
        self.bad("delete", {"key": 9999})
        self.assertEqual(self.c.get("/api/b-tree").get_json()["state"], first)

    def test_non_finite_and_malformed_bodies_are_rejected(self):
        for raw in ('{"key": NaN}', '{"key": Infinity}', '{"key": -Infinity}', '{"key": 1e999}',
                    "not json", "[1, 2]", "3", "null", ""):
            res = self.c.post("/api/b-tree/insert", data=raw, content_type="application/json")
            self.assertEqual(res.status_code, 400, raw)
            self.assertIn("btree", res.get_json()["state"])
        res = self.c.post("/api/b-tree/insert", data="key=1")
        self.assertEqual(res.status_code, 400)

    def test_non_finite_build_and_range_are_rejected(self):
        for op, raw in (("build", '{"keys": [NaN]}'), ("bplus-range", '{"low": NaN, "high": 1}'),
                        ("set-order", '{"order": Infinity}')):
            res = self.c.post("/api/b-tree/" + op, data=raw, content_type="application/json")
            self.assertEqual(res.status_code, 400, raw)

    def test_empty_trees_report_errors_not_crashes(self):
        self.post("build", {"keys": []})
        self.bad("delete", {"key": 1})
        self.bad("bplus-delete", {"key": 1})
        self.assertEqual(self.post("search", {"key": 1}).get_json()["result"]["path"], [])
        self.assertEqual(self.post("bplus-range", {"low": 0, "high": 9}).get_json()["result"]["items"], [])

    def test_random_route_sequence_never_500s_and_stays_valid(self):
        rng = random.Random(7)
        for _ in range(400):
            op = rng.choice(["insert", "delete", "bplus-insert", "bplus-delete", "set-order"])
            payload = {"order": rng.randrange(2, 9)} if op == "set-order" else {"key": rng.randrange(30)}
            self.assertIn(self.post(op, payload).status_code, (200, 400))
            check_btree(r.btree)
            check_bplus(r.bplus)


if __name__ == "__main__":
    unittest.main()
