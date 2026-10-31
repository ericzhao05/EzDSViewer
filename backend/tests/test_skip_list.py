import random
import unittest

from api.routes import skip_list_routes as routes
from DataStrcutures.SkipList import SkipList
from tests.helpers import client_for


def check_invariants(sl):
    levels = sl.levels()
    for row in levels:
        assert row == sorted(row) and len(set(row)) == len(row)
    for lower, upper in zip(levels, levels[1:]):
        assert set(upper) <= set(lower)
    assert levels[0] == sl.to_list()
    assert len(sl) == len(levels[0])


class SkipListTests(unittest.TestCase):
    def test_empty(self):
        s = SkipList(seed=1)
        self.assertEqual(len(s), 0)
        self.assertFalse(s.search(3))
        self.assertFalse(s.delete(3))
        self.assertEqual(s.to_list(), [])

    def test_insert_keeps_sorted_and_unique(self):
        s = SkipList(seed=1)
        for k in [5, 1, 9, 3, 7]:
            self.assertIsNotNone(s.insert(k))
        self.assertIsNone(s.insert(5))
        self.assertEqual(s.to_list(), [1, 3, 5, 7, 9])
        self.assertEqual(len(s), 5)
        check_invariants(s)

    def test_search_and_path(self):
        s = SkipList(seed=2)
        for k in range(0, 20, 2):
            s.insert(k)
        r = s.search_path(8)
        self.assertTrue(r["found"])
        self.assertEqual(r["path"][0], {"level": s.max_level - 1, "key": None})
        self.assertEqual(r["path"][-1]["key"], 8)
        self.assertFalse(s.search_path(9)["found"])
        self.assertIn(8, s)

    def test_delete(self):
        s = SkipList(seed=3)
        for k in range(10):
            s.insert(k)
        self.assertTrue(s.delete(4))
        self.assertFalse(s.delete(4))
        self.assertFalse(s.search(4))
        self.assertEqual(len(s), 9)
        check_invariants(s)

    def test_seed_is_deterministic(self):
        a, b = SkipList(seed=42), SkipList(seed=42)
        for k in range(30):
            a.insert(k)
            b.insert(k)
        self.assertEqual(a.levels(), b.levels())

    def test_levels_bounded(self):
        s = SkipList(seed=5, max_level=3)
        for k in range(100):
            self.assertLess(s.insert(k), 3)
        self.assertEqual(len(s.levels()), 3)

    def test_bad_constructor(self):
        with self.assertRaises(ValueError):
            SkipList(max_level=0)
        with self.assertRaises(ValueError):
            SkipList(p=1)

    def test_randomized_against_set(self):
        rng = random.Random(11)
        s = SkipList(seed=9)
        ref = set()
        for _ in range(600):
            k = rng.randint(0, 40)
            op = rng.choice(["i", "d", "s"])
            if op == "i":
                self.assertEqual(s.insert(k) is not None, k not in ref)
                ref.add(k)
            elif op == "d":
                self.assertEqual(s.delete(k), k in ref)
                ref.discard(k)
            else:
                self.assertEqual(s.search(k), k in ref)
            check_invariants(s)
        self.assertEqual(s.to_list(), sorted(ref))


class SkipListRouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(routes.bp)
        self.c.post("/api/skip-list/reset")

    def post(self, op, data=None):
        return self.c.post("/api/skip-list/" + op, json=data)

    def test_get_state(self):
        r = self.c.get("/api/skip-list").get_json()
        self.assertTrue(r["success"])
        self.assertIsNone(r["result"])
        self.assertEqual(r["state"]["keys"], [])

    def test_insert_search_delete(self):
        r = self.post("insert", {"key": 5}).get_json()
        self.assertTrue(r["result"]["inserted"])
        self.assertEqual(r["state"]["keys"], [5])
        self.assertFalse(self.post("insert", {"key": 5}).get_json()["result"]["inserted"])
        s = self.post("search", {"key": 5}).get_json()["result"]
        self.assertTrue(s["found"])
        self.assertFalse(self.post("search", {"key": 6}).get_json()["result"]["found"])
        self.assertTrue(self.post("delete", {"key": 5}).get_json()["result"]["deleted"])
        self.assertFalse(self.post("delete", {"key": 5}).get_json()["result"]["deleted"])

    def test_seed_and_reset(self):
        self.post("insert", {"key": 1})
        r = self.post("seed", {"seed": 99}).get_json()
        self.assertEqual(r["state"]["seed"], 99)
        self.assertEqual(r["state"]["keys"], [])
        self.post("insert", {"key": 1})
        r = self.post("reset").get_json()
        self.assertEqual(r["state"]["keys"], [])
        self.assertEqual(r["state"]["seed"], routes.DEFAULT_SEED)

    def test_same_seed_same_shape(self):
        shapes = []
        for _ in range(2):
            self.post("seed", {"seed": 4})
            for k in range(15):
                self.post("insert", {"key": k})
            shapes.append(self.c.get("/api/skip-list").get_json()["state"]["levels"])
        self.assertEqual(shapes[0], shapes[1])

    def test_bad_input(self):
        bad = [{}, {"key": "a"}, {"key": 1.5}, {"key": True}, {"key": None},
               {"key": 10 ** 10}, {"key": float("nan")}, {"key": float("inf")}]
        for op in ["insert", "search", "delete"]:
            for data in bad:
                r = self.post(op, data)
                self.assertEqual(r.status_code, 400, (op, data))
                self.assertFalse(r.get_json()["success"])
                self.assertIn("state", r.get_json())
            self.assertEqual(self.post(op).status_code, 400)
            r = self.c.post("/api/skip-list/" + op, data="not json", content_type="application/json")
            self.assertEqual(r.status_code, 400)
            r = self.c.post("/api/skip-list/" + op, json=[1])
            self.assertEqual(r.status_code, 400)
        for data in [{}, {"seed": "x"}, {"seed": 1.5}, {"seed": True}, {"seed": 10 ** 10}]:
            self.assertEqual(self.post("seed", data).status_code, 400)

    def test_size_limit(self):
        for k in range(routes.MAX_KEYS):
            self.assertEqual(self.post("insert", {"key": k}).status_code, 200)
        self.assertEqual(self.post("insert", {"key": 1000}).status_code, 400)
        # an existing key is not growth
        self.assertEqual(self.post("insert", {"key": 0}).status_code, 200)
        self.assertEqual(self.post("delete", {"key": 0}).status_code, 200)
        self.assertEqual(self.post("insert", {"key": 1000}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
