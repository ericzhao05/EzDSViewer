import json
import math
import random
import unittest

from DataStrcutures import BalancedTrees as t
from api.routes import balanced_trees_routes as r
from tests.helpers import client_for


def inorder_nodes(node, nil=None):
    if node is nil:
        return []
    return inorder_nodes(node.left, nil) + [node.val] + inorder_nodes(node.right, nil)


def check_avl(node):
    """Assert the AVL rules below node from the structure alone; return the true height."""
    if node is None:
        return 0
    lh = check_avl(node.left)
    rh = check_avl(node.right)
    assert abs(lh - rh) <= 1, "unbalanced at %r" % node.val
    assert node.height == 1 + max(lh, rh), "stale height at %r" % node.val
    return 1 + max(lh, rh)


def check_rb(tree):
    """Assert every red-black rule from the structure alone; return (black height, levels)."""
    nil = tree.nil
    assert nil.color == t.BLACK, "sentinel turned red"
    assert tree.root.color == t.BLACK, "root is red"

    def walk(n):
        if n is nil:
            return 1, 0
        for child in (n.left, n.right):
            if child is not nil:
                assert child.parent is n, "bad parent pointer at %r" % child.val
                if n.color == t.RED:
                    assert child.color == t.BLACK, "red-red at %r" % n.val
        lb, lh = walk(n.left)
        rb, rh = walk(n.right)
        assert lb == rb, "black heights differ at %r" % n.val
        return lb + (1 if n.color == t.BLACK else 0), 1 + max(lh, rh)

    return walk(tree.root)


def snapshot_inorder(snap):
    if snap is None:
        return []
    return snapshot_inorder(snap["left"]) + [snap["val"]] + snapshot_inorder(snap["right"])


def avl_from(vals):
    root = None
    for v in vals:
        root = t.avl_insert(root, v)
    return root


class AvlFunctionTests(unittest.TestCase):
    def test_four_insert_cases_end_balanced_with_20_on_top(self):
        for seq in ([30, 20, 10], [10, 20, 30], [30, 10, 20], [10, 30, 20]):
            root = avl_from(seq)
            self.assertEqual(root.val, 20, seq)
            self.assertEqual((root.left.val, root.right.val), (10, 30))
            self.assertEqual(root.height, 2)

    def test_rotations_preserve_order_and_match_the_diagram(self):
        y = t.AVLNode(4)
        y.left, y.right = t.AVLNode(2), t.AVLNode(5)
        y.left.left, y.left.right = t.AVLNode(1), t.AVLNode(3)
        t._update_height(y.left)
        t._update_height(y)
        x = t._rotate_right(y)
        self.assertEqual(x.val, 2)
        self.assertEqual(x.right.left.val, 3)
        self.assertEqual(inorder_nodes(x), [1, 2, 3, 4, 5])
        back = t._rotate_left(x)
        self.assertEqual(back.val, 4)
        self.assertEqual(back.left.right.val, 3)
        self.assertEqual(inorder_nodes(back), [1, 2, 3, 4, 5])

    def test_helpers_on_none_and_nodes(self):
        self.assertEqual(t._height(None), 0)
        root = avl_from([2, 1])
        self.assertEqual(t._height(root), 2)
        self.assertEqual(t._balance(root), 1)

    def test_duplicate_insert_is_ignored(self):
        root = avl_from([2, 1, 3, 2, 1])
        self.assertEqual(inorder_nodes(root), [1, 2, 3])

    def test_delete_leaf_one_child_two_children_missing(self):
        root = avl_from([20, 10, 30, 5])
        root = t.avl_delete(root, 5)
        self.assertEqual(inorder_nodes(root), [10, 20, 30])
        root = avl_from([20, 10, 30, 5])
        root = t.avl_delete(root, 10)
        self.assertEqual(root.left.val, 5)
        root = t.avl_delete(avl_from([20, 10, 30]), 20)
        self.assertEqual(root.val, 30)
        self.assertEqual(inorder_nodes(root), [10, 30])
        root = t.avl_delete(avl_from([1, 2]), 99)
        self.assertEqual(inorder_nodes(root), [1, 2])
        self.assertIsNone(t.avl_delete(None, 1))
        self.assertIsNone(t.avl_delete(t.AVLNode(1), 1))

    def test_delete_rotates_when_a_side_gets_too_short(self):
        # single rotation, including the tie where the heavy child has balance 0
        root = t.avl_delete(avl_from([20, 10, 30, 5, 15]), 30)
        self.assertEqual(root.val, 10)
        check_avl(root)
        # double rotation
        root = t.avl_delete(avl_from([20, 10, 30, 15]), 30)
        self.assertEqual(root.val, 15)
        check_avl(root)

    def test_randomized_functions_keep_the_rules(self):
        for seed in range(20):
            rng = random.Random(seed)
            root, model = None, set()
            for _ in range(400):
                v = rng.randint(0, 120)
                if rng.random() < 0.55:
                    root = t.avl_insert(root, v)
                    model.add(v)
                else:
                    root = t.avl_delete(root, v)
                    model.discard(v)
                height = check_avl(root)
                self.assertEqual(inorder_nodes(root), sorted(model))
                if model:
                    self.assertLess(height, 1.4405 * math.log2(len(model) + 2))


class RedBlackTests(unittest.TestCase):
    def test_first_insert_is_a_black_root(self):
        tree = t.RedBlackTree()
        tree.insert(5)
        self.assertEqual(tree.root.color, t.BLACK)
        self.assertEqual(tree.to_dict()["color"], "black")

    def test_new_nodes_under_black_parent_stay_red(self):
        tree = t.RedBlackTree([5, 3, 8])
        self.assertEqual(tree.root.left.color, t.RED)
        self.assertEqual(tree.root.right.color, t.RED)

    def test_red_uncle_recolors_without_rotating(self):
        tree = t.RedBlackTree([5, 3, 8])
        outcome = tree.insert(1)
        self.assertEqual(outcome["rotations"], 0)
        self.assertEqual(tree.root.left.color, t.BLACK)
        self.assertEqual(tree.root.right.color, t.BLACK)
        self.assertEqual(tree.root.left.left.color, t.RED)

    def test_black_uncle_line_and_triangle_rotate(self):
        self.assertEqual(t.RedBlackTree([3, 2]).insert(1)["rotations"], 1)
        self.assertEqual(t.RedBlackTree([1, 2]).insert(3)["rotations"], 1)
        self.assertEqual(t.RedBlackTree([3, 1]).insert(2)["rotations"], 2)
        self.assertEqual(t.RedBlackTree([1, 3]).insert(2)["rotations"], 2)
        tree = t.RedBlackTree([1, 3, 2])
        self.assertEqual(tree.root.val, 2)
        check_rb(tree)

    def test_duplicate_and_missing_change_nothing(self):
        tree = t.RedBlackTree([2, 1, 3])
        self.assertFalse(tree.insert(2)["changed"])
        self.assertFalse(tree.delete(9)["changed"])
        self.assertEqual(tree.inorder(), [1, 2, 3])
        self.assertEqual(tree.size, 3)

    def test_delete_down_to_empty(self):
        tree = t.RedBlackTree([2, 1, 3])
        for v in (2, 1, 3):
            self.assertTrue(tree.delete(v)["changed"])
            check_rb(tree)
        self.assertIsNone(tree.to_dict())
        self.assertEqual(tree.size, 0)
        self.assertFalse(tree.delete(1)["changed"])
        tree.insert(7)
        self.assertEqual(tree.inorder(), [7])
        self.assertEqual(tree.root.color, t.BLACK)

    def test_randomized_sequences_keep_every_rule(self):
        for seed in range(20):
            rng = random.Random(seed)
            tree, model = t.RedBlackTree(), set()
            for _ in range(400):
                v = rng.randint(0, 120)
                if rng.random() < 0.55:
                    outcome = tree.insert(v, record=False)
                    self.assertEqual(outcome["changed"], v not in model)
                    self.assertLessEqual(outcome["rotations"], 2)
                    model.add(v)
                else:
                    outcome = tree.delete(v, record=False)
                    self.assertEqual(outcome["changed"], v in model)
                    self.assertLessEqual(outcome["rotations"], 3)
                    model.discard(v)
                _, levels = check_rb(tree)
                self.assertEqual(tree.inorder(), sorted(model))
                self.assertEqual(tree.size, len(model))
                self.assertLessEqual(levels, 2 * math.log2(len(model) + 1) + 1e-9)

    def test_sorted_and_reverse_sorted_runs(self):
        for values in (range(1, 200), range(200, 0, -1)):
            tree = t.RedBlackTree(values)
            check_rb(tree)
            for v in values:
                tree.delete(v, record=False)
                check_rb(tree)

    def test_black_height_reported(self):
        tree = t.RedBlackTree([5, 3, 8])
        self.assertEqual(tree.black_height(), 1)
        tree.insert(1)
        self.assertEqual(tree.black_height(), 2)
        self.assertEqual(t.RedBlackTree().black_height(), 0)


class AvlTreeWrapperTests(unittest.TestCase):
    def test_wrapper_matches_the_plain_functions(self):
        rng = random.Random(7)
        values = [rng.randint(0, 80) for _ in range(150)]
        tree, root = t.AVLTree(), None
        for v in values:
            tree.insert(v)
            root = t.avl_insert(root, v)
        self.assertEqual(tree.to_dict(), t._avl_snapshot(root))
        self.assertEqual(tree.size, len(set(values)))

    def test_search_path(self):
        tree = t.AVLTree([20, 10, 30])
        self.assertEqual(tree.search(10), {"found": True, "path": [20, 10]})
        self.assertEqual(tree.search(25), {"found": False, "path": [20, 30]})
        self.assertEqual(t.AVLTree().search(1), {"found": False, "path": []})

    def test_rotation_counter_accumulates(self):
        tree = t.AVLTree()
        for v in (1, 2, 3):
            tree.insert(v)
        self.assertEqual(tree.rotations, 1)
        tree = t.AVLTree([30, 10])
        self.assertEqual(tree.insert(20)["rotations"], 2)
        self.assertEqual(tree.rotations, 2)


class StepTests(unittest.TestCase):
    def _check(self, make_tree):
        """Every recorded picture must be a whole, sorted tree holding the right values."""
        rng = random.Random(11)
        tree, model = make_tree(), set()
        for _ in range(500):
            v = rng.randint(0, 40)
            before = set(model)
            if rng.random() < 0.6:
                outcome = tree.insert(v)
                model.add(v)
            else:
                outcome = tree.delete(v)
                model.discard(v)
            if not outcome["changed"]:
                self.assertEqual(outcome["steps"], [])
                continue
            self.assertEqual(snapshot_inorder(outcome["steps"][0]["tree"]), sorted(before))
            for step in outcome["steps"]:
                self.assertIn("tree", step, step["kind"])
                shown = snapshot_inorder(step["tree"])
                self.assertEqual(shown, sorted(shown), step)
                self.assertIn(set(shown), (before, model), step)
            self.assertEqual(outcome["steps"][-1]["tree"], tree.to_dict())
            rotates = [s for s in outcome["steps"] if s["kind"] == "rotate"]
            self.assertEqual(len(rotates), outcome["rotations"])

    def test_avl_steps_are_whole_trees(self):
        self._check(t.AVLTree)

    def test_red_black_steps_are_whole_trees(self):
        self._check(t.RedBlackTree)

    def test_avl_double_rotation_steps_show_the_intermediate_shape(self):
        steps = t.AVLTree([30, 10]).insert(20)["steps"]
        self.assertEqual([s["kind"] for s in steps], ["start", "place", "imbalance", "rotate", "rotate"])
        self.assertEqual(steps[1]["tree"]["balance"], 2)
        self.assertEqual(steps[2]["case"], "left-right")
        self.assertEqual((steps[3]["pivot"], steps[3]["direction"]), (10, "left"))
        self.assertEqual(steps[3]["tree"]["left"]["val"], 20)
        self.assertEqual((steps[4]["pivot"], steps[4]["direction"]), (30, "right"))
        self.assertEqual(steps[4]["tree"]["val"], 20)

    def test_record_false_skips_pictures(self):
        self.assertEqual(t.AVLTree().insert(1, record=False)["steps"], [])
        self.assertEqual(t.RedBlackTree().insert(1, record=False)["steps"], [])


class HelperTests(unittest.TestCase):
    def test_rotation_demo(self):
        right = t.rotation_demo("right")
        self.assertEqual(right["before"]["val"], 4)
        self.assertEqual(right["after"]["val"], 2)
        self.assertEqual(right["inorder"], [1, 2, 3, 4, 5])
        left = t.rotation_demo("left")
        self.assertEqual(left["before"]["val"], 2)
        self.assertEqual(left["after"]["val"], 4)

    def test_avl_case_uses_the_named_rotations(self):
        expected = {"left-left": 1, "right-right": 1, "left-right": 2, "right-left": 2}
        for name, count in expected.items():
            tree, outcome = t.avl_case(name)
            self.assertEqual(outcome["rotations"], count, name)
            self.assertEqual(tree.root.val, 20)
            self.assertEqual([s["case"] for s in outcome["steps"] if s["kind"] == "imbalance"], [name])

    def test_compare_counts_both_trees(self):
        out = t.compare(list(range(1, 64)))
        self.assertEqual(out["count"], 63)
        self.assertEqual(out["avl"]["height"], 6)
        self.assertGreaterEqual(out["rb"]["height"], out["avl"]["height"])
        self.assertLessEqual(out["rb"]["height"], 12)
        for side in ("avl", "rb"):
            self.assertGreater(out[side]["insert_rotations"], 0)
            self.assertGreaterEqual(out[side]["delete_rotations"], 0)

    def test_height_bounds(self):
        self.assertIsNone(t.AVLTree().height_bound())
        self.assertIsNone(t.RedBlackTree().height_bound())
        self.assertEqual(t.AVLTree(range(1, 9)).height_bound(), 4.32)
        self.assertEqual(t.RedBlackTree(range(1, 8)).height_bound(), 6.0)


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, op, payload=None):
        return self.c.post("/api/balanced-trees/" + op, json={} if payload is None else payload)

    def test_get_state(self):
        res = self.c.get("/api/balanced-trees")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIsNone(data["result"])
        state = data["state"]
        for side in ("avl", "rb"):
            self.assertEqual(state[side]["inorder"], sorted(r.DEFAULT))
            self.assertEqual(state[side]["count"], len(r.DEFAULT))
        self.assertIn("balance", state["avl"]["tree"])
        self.assertIn("color", state["rb"]["tree"])
        self.assertIn("black_height", state["rb"])
        self.assertEqual(state["limits"]["max_nodes"], r.MAX_NODES)

    def test_insert_delete_search_on_both_trees(self):
        for kind in ("avl", "rb"):
            res = self.post(kind + "-insert", {"value": 35})
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["result"]["value"], 35)
            self.assertGreater(len(data["result"]["steps"]), 0)
            self.assertIn(35, data["state"][kind]["inorder"])
            found = self.post(kind + "-search", {"value": 35}).get_json()["result"]
            self.assertTrue(found["found"])
            self.assertEqual(found["path"][-1], 35)
            self.assertFalse(self.post(kind + "-search", {"value": 36}).get_json()["result"]["found"])
            data = self.post(kind + "-delete", {"value": 35}).get_json()
            self.assertNotIn(35, data["state"][kind]["inorder"])
            self.assertEqual(data["result"]["value"], 35)

    def test_trees_are_independent(self):
        data = self.post("avl-insert", {"value": 35}).get_json()
        self.assertNotIn(35, data["state"]["rb"]["inorder"])

    def test_whole_number_float_accepted(self):
        self.assertEqual(self.post("avl-insert", {"value": 35.0}).get_json()["result"]["value"], 35)

    def test_build_and_clear(self):
        for kind in ("avl", "rb"):
            data = self.post(kind + "-build", {"values": [1, 2, 3, 2]}).get_json()
            self.assertEqual(data["state"][kind]["inorder"], [1, 2, 3])
            self.assertEqual(data["result"]["count"], 3)
            self.assertEqual(data["result"]["rotations"], 1)
            data = self.post(kind + "-build", {"values": []}).get_json()
            self.assertIsNone(data["state"][kind]["tree"])
            self.assertEqual(data["state"][kind]["height"], 0)

    def test_reset_restores_both(self):
        self.post("avl-delete", {"value": r.DEFAULT[0]})
        self.post("rb-build", {"values": []})
        state = self.post("reset").get_json()["state"]
        self.assertEqual(state["avl"]["inorder"], sorted(r.DEFAULT))
        self.assertEqual(state["rb"]["inorder"], sorted(r.DEFAULT))

    def test_avl_case(self):
        data = self.post("avl-case", {"case": "right-left"}).get_json()
        self.assertEqual(data["result"]["rotations"], 2)
        self.assertEqual(data["state"]["avl"]["inorder"], [10, 20, 30])

    def test_rotate_demo_leaves_state_alone(self):
        before = self.c.get("/api/balanced-trees").get_json()["state"]
        data = self.post("rotate", {"direction": "left"}).get_json()
        self.assertEqual(data["result"]["after"]["val"], 4)
        self.assertEqual(data["state"], before)

    def test_compare_leaves_state_alone(self):
        before = self.c.get("/api/balanced-trees").get_json()["state"]
        data = self.post("compare", {"values": [1, 2, 3, 4, 5, 6, 7]}).get_json()
        self.assertEqual(data["result"]["avl"]["height"], 3)
        self.assertEqual(data["state"], before)

    def test_bad_values_get_400_with_state(self):
        bad = [None, "x", True, 1.5, [1], {"a": 1}, 10 ** 10, float("inf"), float("nan")]
        for op in ("avl-insert", "avl-delete", "avl-search", "rb-insert", "rb-delete", "rb-search"):
            for value in bad:
                res = self.c.post(
                    "/api/balanced-trees/" + op,
                    data=json.dumps({"value": value}),
                    content_type="application/json",
                )
                self.assertEqual(res.status_code, 400, (op, value))
                data = res.get_json()
                self.assertFalse(data["success"])
                self.assertIn("avl", data["state"])

    def test_missing_or_malformed_body_gets_400(self):
        for op in ("avl-insert", "rb-delete", "avl-build", "compare", "rotate", "avl-case"):
            self.assertEqual(self.c.post("/api/balanced-trees/" + op).status_code, 400, op)
            res = self.c.post("/api/balanced-trees/" + op, data="{nope", content_type="application/json")
            self.assertEqual(res.status_code, 400, op)
            res = self.c.post("/api/balanced-trees/" + op, data="[1]", content_type="application/json")
            self.assertEqual(res.status_code, 400, op)

    def test_duplicate_missing_and_full_get_400(self):
        for kind in ("avl", "rb"):
            self.assertEqual(self.post(kind + "-insert", {"value": r.DEFAULT[0]}).status_code, 400)
            self.assertEqual(self.post(kind + "-delete", {"value": 999}).status_code, 400)
            values = list(range(r.MAX_NODES))
            self.assertEqual(self.post(kind + "-build", {"values": values}).status_code, 200)
            self.assertEqual(self.post(kind + "-insert", {"value": 999}).status_code, 400)
            self.post(kind + "-build", {"values": []})
            self.assertEqual(self.post(kind + "-delete", {"value": 1}).status_code, 400)

    def test_bad_lists_get_400_and_keep_the_tree(self):
        before = self.c.get("/api/balanced-trees").get_json()["state"]
        too_many = list(range(r.MAX_NODES + 1))
        for kind in ("avl", "rb"):
            for values in (None, "1,2", [1, "2"], [True], too_many):
                res = self.post(kind + "-build", {"values": values})
                self.assertEqual(res.status_code, 400, values)
                self.assertEqual(res.get_json()["state"], before)
        for values in (None, [], [1, "2"], list(range(r.MAX_COMPARE + 1))):
            self.assertEqual(self.post("compare", {"values": values}).status_code, 400, values)

    def test_bad_case_and_direction_get_400(self):
        for value in (None, "up", 3, [], {}):
            self.assertEqual(self.post("rotate", {"direction": value}).status_code, 400, value)
            self.assertEqual(self.post("avl-case", {"case": value}).status_code, 400, value)

    def test_full_size_compare_runs(self):
        values = list(range(r.MAX_COMPARE))
        res = self.post("compare", {"values": values})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["result"]["count"], r.MAX_COMPARE)


if __name__ == "__main__":
    unittest.main()
