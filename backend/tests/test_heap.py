import heapq
import random
import unittest

from DataStrcutures.Heap import MedianFinder, MinHeap, kth_largest, top_k_frequent
from api.routes import heap_routes as r
from tests.helpers import client_for


def is_heap(a):
    return all(a[(i - 1) // 2] <= a[i] for i in range(1, len(a)))


class ClassTests(unittest.TestCase):
    def test_push_pop_sorted(self):
        h = MinHeap()
        for v in [5, 3, 8, 1, 9, 2]:
            h.push(v)
            self.assertTrue(is_heap(h.to_list()))
        self.assertEqual(h.peek(), 1)
        self.assertEqual(len(h), 6)
        self.assertEqual([h.pop() for _ in range(6)], [1, 2, 3, 5, 8, 9])

    def test_build_random(self):
        rng = random.Random(1)
        for _ in range(50):
            items = [rng.randint(-20, 20) for _ in range(rng.randint(0, 20))]
            h = MinHeap(items)
            self.assertTrue(is_heap(h.to_list()))
            self.assertEqual([h.pop() for _ in range(len(items))], sorted(items))

    def test_empty_raises(self):
        with self.assertRaises(IndexError):
            MinHeap().peek()
        with self.assertRaises(IndexError):
            MinHeap().pop()

    def test_single_and_duplicates(self):
        h = MinHeap([4])
        self.assertEqual(h.pop(), 4)
        self.assertEqual(len(h), 0)
        h = MinHeap([2, 2, 2])
        self.assertEqual([h.pop(), h.pop(), h.pop()], [2, 2, 2])

    def test_kth_largest(self):
        self.assertEqual(kth_largest([3, 2, 1, 5, 6, 4], 2), 5)
        self.assertEqual(kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4), 4)

    def test_top_k_frequent(self):
        self.assertEqual(top_k_frequent([1, 1, 1, 2, 2, 3], 2), [1, 2])

    def test_median_finder(self):
        m = MedianFinder()
        m.add(1)
        m.add(2)
        self.assertEqual(m.median(), 1.5)
        m.add(3)
        self.assertEqual(m.median(), 2)
        rng = random.Random(2)
        m, seen = MedianFinder(), []
        for _ in range(40):
            x = rng.randint(-50, 50)
            m.add(x)
            seen.append(x)
            s = sorted(seen)
            n = len(s)
            exp = s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2
            self.assertEqual(m.median(), exp)
        d = m.to_dict()
        self.assertEqual(sorted(d["low"] + d["high"]), sorted(seen))


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, op, data=None):
        resp = self.c.post(f"/api/heap/{op}", json=data if data is not None else {})
        return resp.status_code, resp.get_json()

    def test_get(self):
        j = self.c.get("/api/heap").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertTrue(is_heap(j["state"]["items"]))
        self.assertEqual(j["state"]["size"], 7)

    def test_push_pop_peek(self):
        code, j = self.post("push", {"value": 1})
        self.assertEqual(code, 200)
        self.assertEqual(j["state"]["items"][0], 1)
        self.assertEqual(self.post("peek")[1]["result"], 1)
        self.assertEqual(self.post("pop")[1]["result"], 1)
        self.assertEqual(self.post("pop")[1]["result"], 3)

    def test_empty(self):
        self.post("build", {"items": []})
        for op in ("pop", "peek"):
            code, j = self.post(op)
            self.assertEqual(code, 400)
            self.assertFalse(j["success"])
            self.assertEqual(j["state"]["items"], [])

    def test_build_and_search(self):
        code, j = self.post("build", {"items": [5, 4, 3, 2, 1]})
        self.assertEqual(code, 200)
        self.assertEqual(j["state"]["items"][0], 1)
        res = self.post("search", {"value": 5})[1]["result"]
        self.assertGreaterEqual(res["index"], 0)
        self.assertEqual(self.post("search", {"value": 99})[1]["result"], {"index": -1, "checked": 5})

    def test_reset(self):
        self.post("pop")
        self.post("median-add", {"value": 4})
        j = self.post("reset")[1]
        self.assertEqual(j["state"]["size"], 7)
        self.assertEqual(j["state"]["median"]["count"], 0)

    def test_limits(self):
        self.post("build", {"items": list(range(31))})
        self.assertEqual(self.post("push", {"value": 1})[0], 400)
        self.assertEqual(self.post("build", {"items": list(range(32))})[0], 400)

    def test_algorithms(self):
        self.assertEqual(self.post("kth-largest", {"nums": [3, 2, 1, 5, 6, 4], "k": 2})[1]["result"], 5)
        self.assertEqual(self.post("top-k-frequent", {"nums": [1, 1, 1, 2, 2, 3], "k": 2})[1]["result"], [1, 2])

    def test_median(self):
        self.assertEqual(self.post("median")[0], 400)
        self.post("median-add", {"value": 1})
        j = self.post("median-add", {"value": 2})[1]
        self.assertEqual(j["result"], 1.5)
        self.assertEqual(j["state"]["median"]["count"], 2)
        self.assertEqual(self.post("median")[1]["result"], 1.5)

    def test_bad_input(self):
        bad = [
            ("push", {}), ("push", {"value": "a"}), ("push", {"value": True}),
            ("push", {"value": 1.5}), ("push", {"value": 10 ** 12}),
            ("build", {"items": "x"}), ("build", {"items": [1, "a"]}), ("build", {}),
            ("search", {}), ("median-add", {"value": None}),
            ("kth-largest", {"nums": [], "k": 1}), ("kth-largest", {"nums": [1], "k": 2}),
            ("kth-largest", {"nums": [1], "k": 0}), ("kth-largest", {"nums": [1], "k": "1"}),
            ("kth-largest", {"nums": list(range(101)), "k": 1}),
            ("top-k-frequent", {"nums": [1, 1], "k": 2}), ("top-k-frequent", {"k": 1}),
        ]
        for op, data in bad:
            code, j = self.post(op, data)
            self.assertEqual(code, 400, (op, data))
            self.assertFalse(j["success"])
            self.assertIn("items", j["state"])

    def test_non_finite_and_malformed_body(self):
        for raw in ('{"value": NaN}', '{"value": Infinity}', "not json", "[1,2]"):
            resp = self.c.post("/api/heap/push", data=raw, content_type="application/json")
            self.assertEqual(resp.status_code, 400, raw)
        resp = self.c.post("/api/heap/push")
        self.assertEqual(resp.status_code, 400)
        resp = self.c.post("/api/heap/kth-largest", data='{"nums":[1],"k":NaN}', content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_median_cap(self):
        for i in range(100):
            self.assertEqual(self.post("median-add", {"value": i})[0], 200)
        self.assertEqual(self.post("median-add", {"value": 1})[0], 400)


if __name__ == "__main__":
    unittest.main()
