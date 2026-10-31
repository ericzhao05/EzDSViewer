import heapq
import json
import random
import unittest

from DataStrcutures.FibonacciHeap import FibonacciHeap
from api.routes import fibonacci_heap_routes as r
from tests.helpers import client_for


def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def ring(node):
    """Walk a circular list, asserting both directions agree and it closes."""
    out = []
    cur = node
    while True:
        out.append(cur)
        assert cur.right.left is cur and cur.left.right is cur
        cur = cur.right
        assert len(out) < 100000, "ring does not close"
        if cur is node:
            return out


def subtree_size(node, test):
    """Checks the subtree under node and returns how many nodes it holds."""
    if node.child is None:
        test.assertEqual(node.degree, 0)
        return 1
    children = ring(node.child)
    test.assertEqual(node.degree, len(children))
    total = 1
    for child in children:
        test.assertIs(child.parent, node)
        test.assertGreaterEqual(child.key, node.key)
        total += subtree_size(child, test)
    return total


def check(heap, test):
    """Every structural invariant of a Fibonacci heap."""
    if heap.min is None:
        test.assertEqual(len(heap), 0)
        return
    roots = ring(heap.min)
    total = 0
    for root in roots:
        test.assertIsNone(root.parent)
        test.assertFalse(root.mark)
        test.assertGreaterEqual(root.key, heap.min.key)
        total += subtree_size(root, test)
    test.assertEqual(total, len(heap))
    # the bound that gives the structure its name: size(x) >= F(degree + 2)
    for node in heap.nodes():
        test.assertGreaterEqual(subtree_size(node, test), fib(node.degree + 2))


def single_b3():
    """Insert 0..8 and extract 0: consolidation leaves one tree of degree 3."""
    h = FibonacciHeap()
    for k in range(9):
        h.insert(k)
    h.extract_min()
    return h


class ClassTests(unittest.TestCase):
    def test_empty(self):
        h = FibonacciHeap()
        self.assertEqual(len(h), 0)
        with self.assertRaises(IndexError):
            h.find_min()
        with self.assertRaises(IndexError):
            h.extract_min()
        self.assertEqual(h.to_dict()["roots"], [])
        self.assertIsNone(h.to_dict()["min_id"])

    def test_insert_is_lazy(self):
        h = FibonacciHeap()
        for k in [5, 3, 8]:
            h.insert(k)
        state = h.to_dict()
        self.assertEqual(state["trees"], 3)
        self.assertTrue(all(root["children"] == [] for root in state["roots"]))
        self.assertEqual(h.find_min(), 3)
        check(h, self)

    def test_extract_in_sorted_order(self):
        keys = [7, 3, 9, 3, 1, 8, -2, 5]
        h = FibonacciHeap()
        for k in keys:
            h.insert(k)
        out = []
        while len(h):
            out.append(h.extract_min())
            check(h, self)
        self.assertEqual(out, sorted(keys))

    def test_consolidation_gives_distinct_root_degrees(self):
        h = FibonacciHeap()
        for k in range(16):
            h.insert(k)
        h.extract_min()
        # 15 = 1 + 2 + 4 + 8: exactly four binomial trees
        degrees = sorted(root["degree"] for root in h.to_dict()["roots"])
        self.assertEqual(degrees, [0, 1, 2, 3])
        self.assertEqual(len(h.last_links), 11)  # 15 roots down to 4

    def test_b3_shape(self):
        h = single_b3()
        self.assertEqual(h.to_dict()["trees"], 1)
        self.assertEqual(h.min.key, 1)
        self.assertEqual(h.min.degree, 3)
        check(h, self)

    def test_decrease_without_violation_stays_put(self):
        h = FibonacciHeap()
        for k in range(9):
            h.insert(k * 10)
        h.extract_min()
        child = next(n for n in h.nodes() if n.parent is not None)
        h.decrease_key(child, child.parent.key + 1)
        self.assertIsNotNone(child.parent)
        self.assertEqual(h.last_cuts, [])
        self.assertIsNone(h.last_marked)
        check(h, self)

    def test_decrease_to_same_key_is_allowed(self):
        h = FibonacciHeap()
        n = h.insert(4)
        h.decrease_key(n, 4)
        self.assertEqual(n.key, 4)

    def test_decrease_updates_min(self):
        h = FibonacciHeap()
        h.insert(1)
        n = h.insert(5)
        h.decrease_key(n, 0)
        self.assertIs(h.min, n)
        self.assertEqual(h.find_min(), 0)

    def test_cut_marks_parent_then_cascades(self):
        h = single_b3()
        root = h.min
        a = next(c for c in ring(root.child) if c.degree == 2)
        b = next(c for c in ring(a.child) if c.degree == 1)
        d = next(c for c in ring(a.child) if c.degree == 0)
        c = b.child

        # first loss: c is cut, its parent b becomes marked
        c_key = c.key
        h.decrease_key(c, -1)
        self.assertIsNone(c.parent)
        self.assertTrue(b.mark)
        self.assertEqual(h.last_marked, b.key)
        self.assertEqual(
            h.last_cuts, [{"key": -1, "old_key": c_key, "parent_key": b.key, "cascading": False}]
        )
        self.assertIs(h.min, c)
        check(h, self)

        # cutting marked b itself clears its mark and marks a
        h.decrease_key(b, -2)
        self.assertFalse(b.mark)
        self.assertIsNone(b.parent)
        self.assertTrue(a.mark)
        check(h, self)

        # a has now lost a second child: it is cut too, and the root is never marked
        h.decrease_key(d, -3)
        self.assertIsNone(d.parent)
        self.assertIsNone(a.parent)
        self.assertFalse(a.mark)
        self.assertFalse(root.mark)
        self.assertIsNone(h.last_marked)
        self.assertEqual([cut["cascading"] for cut in h.last_cuts], [False, True])
        self.assertEqual(root.degree, 2)
        check(h, self)

    def test_decrease_key_rejects_larger_key(self):
        h = FibonacciHeap()
        n = h.insert(4)
        with self.assertRaises(ValueError):
            h.decrease_key(n, 5)
        self.assertEqual(n.key, 4)

    def test_decrease_key_rejects_extracted_node(self):
        h = FibonacciHeap()
        n = h.insert(1)
        h.insert(2)
        h.extract_min()
        with self.assertRaises(ValueError):
            h.decrease_key(n, 0)
        check(h, self)

    def test_decrease_key_rejects_node_of_another_heap(self):
        a, b = FibonacciHeap(), FibonacciHeap()
        a.insert(1)
        n = b.insert(2)
        with self.assertRaises(ValueError):
            a.decrease_key(n, 0)
        self.assertEqual(n.key, 2)
        check(a, self)

    def test_merge(self):
        a, b = FibonacciHeap(), FibonacciHeap()
        for k in [5, 2]:
            a.insert(k)
        for k in [9, 1, 4]:
            b.insert(k)
        a.merge(b)
        self.assertEqual(len(a), 5)
        self.assertEqual(len(b), 0)
        self.assertEqual(a.find_min(), 1)
        self.assertEqual(a.to_dict()["trees"], 5)  # merge is a splice: no consolidation
        check(a, self)
        check(b, self)
        self.assertEqual([a.extract_min() for _ in range(5)], [1, 2, 4, 5, 9])

    def test_merge_empty_sides(self):
        a, b = FibonacciHeap(), FibonacciHeap()
        a.merge(b)
        self.assertEqual(len(a), 0)
        b.insert(3)
        a.merge(b)
        self.assertEqual(a.find_min(), 3)
        a.merge(b)  # b is empty again
        self.assertEqual(len(a), 1)
        check(a, self)

    def test_merge_with_self_or_non_heap_rejected(self):
        a = FibonacciHeap()
        a.insert(1)
        with self.assertRaises(ValueError):
            a.merge(a)
        with self.assertRaises(TypeError):
            a.merge([1, 2])
        self.assertEqual(len(a), 1)

    def test_handles_follow_merge_chain(self):
        a, b, c = FibonacciHeap(), FibonacciHeap(), FibonacciHeap()
        n = c.insert(7)
        b.merge(c)
        a.merge(b)
        a.decrease_key(n, 0)
        self.assertEqual(a.find_min(), 0)
        with self.assertRaises(ValueError):
            c.decrease_key(n, -1)
        # a heap emptied by merge starts fresh and owns new inserts
        m = c.insert(9)
        c.decrease_key(m, 8)
        with self.assertRaises(ValueError):
            a.decrease_key(m, 1)

    def test_to_dict_shape(self):
        h = single_b3()
        child = next(n for n in h.nodes() if n.parent is not None and n.degree == 0)
        grandparent = child.parent.parent
        h.decrease_key(child, -5)
        state = h.to_dict()
        self.assertEqual(state["size"], 8)
        self.assertEqual(state["min_id"], child.id)
        self.assertEqual(state["min_key"], -5)
        self.assertEqual(state["roots"][0]["id"], child.id)  # listed starting at min
        # a depth-1 parent gets marked; a root parent does not
        marked = 1 if grandparent is not None else 0
        self.assertEqual(state["marked"], marked)
        self.assertEqual(state["potential"], state["trees"] + 2 * marked)
        self.assertEqual(state["roots"][0]["key"], -5)
        self.assertEqual(set(state["roots"][0]), {"id", "key", "degree", "mark", "children"})
        json.dumps(state)


class RandomizedTests(unittest.TestCase):
    def test_against_heapq(self):
        """Random inserts, extracts, decreases and merges, checked against heapq."""
        for seed in range(25):
            rng = random.Random(seed)
            heap = FibonacciHeap()
            model = []  # heapq of (key, node id); stale entries are skipped lazily
            live = {}  # node id -> node

            def model_min():
                while model and (model[0][1] not in live or live[model[0][1]].key != model[0][0]):
                    heapq.heappop(model)
                return model[0][0] if model else None

            for _ in range(600):
                roll = rng.random()
                if roll < 0.45 or not live:
                    node = heap.insert(rng.randint(-1000, 1000))
                    live[node.id] = node
                    heapq.heappush(model, (node.key, node.id))
                elif roll < 0.65:
                    expected = model_min()
                    self.assertEqual(heap.find_min(), expected)
                    removed = heap.min
                    self.assertEqual(heap.extract_min(), expected)
                    del live[removed.id]
                elif roll < 0.9:
                    node = live[rng.choice(sorted(live))]
                    node_key = node.key - rng.randint(0, 500)
                    heap.decrease_key(node, node_key)
                    heapq.heappush(model, (node_key, node.id))
                else:
                    other = FibonacciHeap()
                    for _ in range(rng.randint(0, 5)):
                        node = other.insert(rng.randint(-1000, 1000))
                        live[node.id] = node
                        heapq.heappush(model, (node.key, node.id))
                    heap.merge(other)
                self.assertEqual(len(heap), len(live))
                if live:
                    self.assertEqual(heap.find_min(), model_min())
                if rng.random() < 0.05:
                    check(heap, self)

            drained = [heap.extract_min() for _ in range(len(heap))]
            self.assertEqual(drained, sorted(n.key for n in live.values()))

    def test_plain_sort_matches_heapq(self):
        rng = random.Random(99)
        keys = [rng.randint(-50, 50) for _ in range(2000)]
        h = FibonacciHeap()
        model = []
        for k in keys:
            h.insert(k)
            heapq.heappush(model, k)
        out = [h.extract_min() for _ in keys]
        self.assertEqual(out, [heapq.heappop(model) for _ in keys])


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.client = client_for(r.bp)

    def post(self, op, payload=None):
        return self.client.post(f"/api/fibonacci-heap/{op}", json=payload if payload is not None else {})

    def bad(self, op, payload=None):
        res = self.post(op, payload)
        self.assertEqual(res.status_code, 400, res.get_data(as_text=True))
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("heap", data["state"])
        return data

    def good(self, op, payload=None):
        res = self.post(op, payload)
        self.assertEqual(res.status_code, 200, res.get_data(as_text=True))
        return res.get_json()

    def find(self, state, key):
        stack = list(state["roots"])
        while stack:
            node = stack.pop()
            if node["key"] == key:
                return node
            stack.extend(node["children"])
        raise AssertionError(f"no node with key {key}")

    def test_get_initial_state(self):
        data = self.client.get("/api/fibonacci-heap").get_json()
        self.assertTrue(data["success"])
        self.assertIsNone(data["result"])
        state = data["state"]
        # the opening state must show trees and a marked node, so decrease-key demos immediately
        self.assertGreater(state["heap"]["trees"], 1)
        self.assertEqual(state["heap"]["marked"], 1)
        self.assertGreater(state["other"]["size"], 0)
        self.assertIn("max_items", state["limits"])
        self.assertEqual(state["heap"]["min_id"], state["heap"]["roots"][0]["id"])

    def test_insert(self):
        before = self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]
        data = self.good("insert", {"value": -40})
        self.assertEqual(data["result"]["key"], -40)
        self.assertEqual(data["state"]["heap"]["size"], before["size"] + 1)
        self.assertEqual(data["state"]["heap"]["trees"], before["trees"] + 1)
        self.assertEqual(data["state"]["heap"]["min_key"], -40)
        self.assertEqual(data["state"]["heap"]["min_id"], data["result"]["id"])

    def test_other_insert(self):
        before = self.client.get("/api/fibonacci-heap").get_json()["state"]
        data = self.good("other-insert", {"value": 99})
        self.assertEqual(data["result"]["key"], 99)
        self.assertEqual(data["state"]["other"]["size"], before["other"]["size"] + 1)
        self.assertEqual(data["state"]["heap"]["size"], before["heap"]["size"])

    def test_find_min(self):
        state = self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]
        data = self.good("find-min")
        self.assertEqual(data["result"], {"id": state["min_id"], "key": state["min_key"]})
        self.assertEqual(data["state"]["heap"], state)

    def test_extract_min_reports_links(self):
        before = self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]
        data = self.good("extract-min")
        self.assertEqual(data["result"]["key"], before["min_key"])
        self.assertEqual(data["result"]["id"], before["min_id"])
        self.assertEqual(data["state"]["heap"]["size"], before["size"] - 1)
        self.assertIsInstance(data["result"]["links"], list)
        degrees = [root["degree"] for root in data["state"]["heap"]["roots"]]
        self.assertEqual(len(degrees), len(set(degrees)))

    def test_decrease_key_reports_cuts(self):
        state = self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]
        child = state["roots"][0]["children"][0] if state["roots"][0]["children"] else None
        if child is None:
            child = next(root["children"][0] for root in state["roots"] if root["children"])
        data = self.good("decrease-key", {"id": child["id"], "key": -500})
        self.assertEqual(data["result"]["id"], child["id"])
        self.assertEqual(data["result"]["key"], -500)
        self.assertEqual(data["result"]["old_key"], child["key"])
        self.assertEqual(len(data["result"]["cuts"]), 1)
        self.assertFalse(data["result"]["cuts"][0]["cascading"])
        self.assertEqual(data["state"]["heap"]["min_id"], child["id"])

    def test_initial_state_demonstrates_a_cascading_cut(self):
        state = self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]
        self.assertTrue(self.find(state, 46)["mark"])
        data = self.good("decrease-key", {"id": self.find(state, 57)["id"], "key": 2})
        self.assertEqual(
            data["result"]["cuts"],
            [
                {"key": 2, "old_key": 57, "parent_key": 46, "cascading": False},
                {"key": 46, "old_key": 46, "parent_key": 30, "cascading": True},
            ],
        )
        self.assertEqual(data["result"]["marked"], 30)
        after = data["state"]["heap"]
        self.assertFalse(self.find(after, 46)["mark"])
        self.assertTrue(self.find(after, 30)["mark"])
        self.assertEqual(after["min_key"], 2)

    def test_merge(self):
        before = self.client.get("/api/fibonacci-heap").get_json()["state"]
        data = self.good("merge")
        self.assertEqual(data["result"]["moved"], before["other"]["size"])
        self.assertEqual(data["state"]["heap"]["size"], before["heap"]["size"] + before["other"]["size"])
        self.assertEqual(data["state"]["other"]["size"], 0)
        self.assertEqual(data["state"]["heap"]["trees"], before["heap"]["trees"] + before["other"]["trees"])
        # node handles survive the merge
        moved = before["other"]["roots"][0]
        self.good("decrease-key", {"id": moved["id"], "key": -999})
        # merging an empty heap is a no-op, not an error
        self.assertEqual(self.good("merge")["result"]["moved"], 0)

    def test_reset_restores_initial_state(self):
        first = self.client.get("/api/fibonacci-heap").get_json()["state"]
        self.good("insert", {"value": 1})
        self.good("extract-min")
        self.good("merge")
        data = self.good("reset")
        self.assertEqual(data["state"], first)
        self.assertIsNone(data["result"])

    def test_bad_values(self):
        for op in ("insert", "other-insert"):
            for bad in (None, "7", True, False, 1.5, [1], {"a": 1}, r.MAX_ABS + 1, -(10 ** 10), 1e308):
                self.bad(op, {"value": bad})
            self.bad(op, {})

    def test_float_whole_number_accepted(self):
        self.assertEqual(self.good("insert", {"value": 4.0})["result"]["key"], 4)

    def test_non_finite_rejected(self):
        for raw in ('{"value": NaN}', '{"value": Infinity}', '{"value": -Infinity}'):
            res = self.client.post("/api/fibonacci-heap/insert", data=raw, content_type="application/json")
            self.assertEqual(res.status_code, 400)

    def test_absent_and_malformed_bodies(self):
        for op in ("insert", "other-insert", "decrease-key"):
            self.assertEqual(self.client.post(f"/api/fibonacci-heap/{op}").status_code, 400)
            res = self.client.post(f"/api/fibonacci-heap/{op}", data="{oops", content_type="application/json")
            self.assertEqual(res.status_code, 400)
            res = self.client.post(f"/api/fibonacci-heap/{op}", data="[1, 2]", content_type="application/json")
            self.assertEqual(res.status_code, 400)

    def test_operations_on_empty(self):
        size = self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]["size"]
        for _ in range(size):
            self.good("extract-min")
        self.assertIn("empty", self.bad("find-min")["error"])
        self.assertIn("empty", self.bad("extract-min")["error"])
        self.assertIsNone(self.client.get("/api/fibonacci-heap").get_json()["state"]["heap"]["min_id"])

    def test_decrease_key_bad_input(self):
        heap = self.client.get("/api/fibonacci-heap").get_json()["state"]
        node = heap["heap"]["roots"][0]
        for bad_id in (None, "1", True, 1.5, [1], 10 ** 10, 999999, -1):
            self.bad("decrease-key", {"id": bad_id, "key": -1})
        for bad_key in (None, "1", True, 1.5, [1], 10 ** 10, -(r.MAX_ABS + 1)):
            self.bad("decrease-key", {"id": node["id"], "key": bad_key})
        self.bad("decrease-key", {"key": -1})
        self.bad("decrease-key", {"id": node["id"]})
        # larger than the current key
        self.assertIn("larger", self.bad("decrease-key", {"id": node["id"], "key": node["key"] + 1})["error"])
        # an extracted node is gone
        self.good("extract-min")
        self.bad("decrease-key", {"id": node["id"], "key": -1})
        # a node still in heap B can't be decreased until it is merged
        other_id = heap["other"]["roots"][0]["id"]
        self.bad("decrease-key", {"id": other_id, "key": -1})
        after = self.client.get("/api/fibonacci-heap").get_json()["state"]
        self.assertEqual(after["other"], heap["other"])

    def test_size_limits(self):
        limit = r.MAX_ITEMS
        while True:
            state = self.client.get("/api/fibonacci-heap").get_json()["state"]
            if state["heap"]["size"] >= limit:
                break
            self.good("insert", {"value": 1})
        self.assertIn("limited", self.bad("insert", {"value": 1})["error"])
        # merge must not pass the same limit
        self.assertIn("limited", self.bad("merge")["error"])
        self.assertGreater(
            self.client.get("/api/fibonacci-heap").get_json()["state"]["other"]["size"], 0
        )
        while True:
            state = self.client.get("/api/fibonacci-heap").get_json()["state"]
            if state["other"]["size"] >= limit:
                break
            self.good("other-insert", {"value": 1})
        self.assertIn("limited", self.bad("other-insert", {"value": 1})["error"])

    def test_state_stays_valid_through_ops(self):
        rng = random.Random(3)
        for _ in range(200):
            state = self.client.get("/api/fibonacci-heap").get_json()["state"]
            nodes, stack = [], list(state["heap"]["roots"])
            while stack:
                node = stack.pop()
                nodes.append(node)
                stack.extend(node["children"])
            self.assertEqual(len(nodes), state["heap"]["size"])
            self.assertEqual(sum(1 for n in nodes if n["mark"]), state["heap"]["marked"])
            roll = rng.random()
            if roll < 0.3 and state["heap"]["size"] < r.MAX_ITEMS:
                self.good("insert", {"value": rng.randint(-99, 99)})
            elif roll < 0.6 and nodes:
                node = rng.choice(nodes)
                self.good("decrease-key", {"id": node["id"], "key": node["key"] - rng.randint(0, 50)})
            elif nodes:
                self.good("extract-min")


if __name__ == "__main__":
    unittest.main()
