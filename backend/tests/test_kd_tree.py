import random
import unittest

from DataStrcutures.KdTree import KdTree
from api.routes import kd_tree_routes as r
from tests.helpers import client_for


def brute(points, q):
    return min(sum((a - b) ** 2 for a, b in zip(p, q)) for p in points)


class ClassTests(unittest.TestCase):
    def test_insert_structure(self):
        t = KdTree(2)
        for p in [(7, 2), (5, 4), (9, 6), (2, 3)]:
            self.assertTrue(t.insert(p))
        d = t.to_dict()
        self.assertEqual(d["root"]["point"], [7, 2])
        self.assertEqual(d["root"]["left"]["point"], [5, 4])
        self.assertEqual(d["root"]["left"]["axis"], 1)
        self.assertEqual(d["root"]["right"]["point"], [9, 6])
        self.assertEqual(d["root"]["left"]["left"]["point"], [2, 3])
        self.assertEqual(len(t), 4)

    def test_duplicate_ignored_and_contains(self):
        t = KdTree(2)
        t.insert((1, 1))
        self.assertFalse(t.insert([1, 1]))
        self.assertEqual(len(t), 1)
        self.assertTrue(t.contains((1, 1)))
        self.assertFalse(t.contains((1, 2)))

    def test_equal_coordinate_goes_right(self):
        t = KdTree(2)
        t.insert((5, 5))
        t.insert((5, 9))
        self.assertEqual(t.to_dict()["root"]["right"]["point"], [5, 9])

    def test_empty_and_bad_input(self):
        t = KdTree(3)
        with self.assertRaises(ValueError):
            t.nearest((0, 0, 0))
        with self.assertRaises(ValueError):
            t.insert((1, 2))
        with self.assertRaises(ValueError):
            KdTree(0)
        with self.assertRaises(ValueError):
            t.contains((1, 2))

    def test_nearest_matches_brute_force(self):
        rng = random.Random(7)
        for k in (1, 2, 3):
            for _ in range(60):
                t = KdTree(k)
                pts = [tuple(rng.randint(-10, 10) for _ in range(k)) for _ in range(rng.randint(1, 30))]
                for p in pts:
                    t.insert(p)
                q = tuple(rng.randint(-12, 12) for _ in range(k))
                best, d2, visited = t.nearest(q)
                self.assertEqual(d2, brute(pts, q))
                self.assertIn(best, pts)
                self.assertLessEqual(len(visited), len(set(pts)))

    def test_pruning_visits_fewer(self):
        t = KdTree(2)
        for x in range(10):
            for y in range(10):
                t.insert((x, y))
        _, d2, visited = t.nearest((0, 0))
        self.assertEqual(d2, 0)
        self.assertLess(len(visited), 100)


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, op, data=None):
        return self.c.post(f"/api/kd-tree/{op}", json=data)

    def test_get(self):
        j = self.c.get("/api/kd-tree").get_json()
        self.assertTrue(j["success"])
        self.assertEqual(j["state"]["size"], 6)
        self.assertIsNone(j["result"])

    def test_insert_search(self):
        j = self.post("insert", {"point": [1, 1]}).get_json()
        self.assertEqual(j["result"], {"inserted": True, "point": [1, 1]})
        self.assertEqual(j["state"]["size"], 7)
        self.assertFalse(self.post("insert", {"point": [1, 1]}).get_json()["result"]["inserted"])
        self.assertTrue(self.post("search", {"point": [1, 1]}).get_json()["result"]["found"])
        self.assertFalse(self.post("search", {"point": [3, 3]}).get_json()["result"]["found"])

    def test_nearest(self):
        j = self.post("nearest", {"point": [9, 2]}).get_json()
        self.assertEqual(j["result"]["point"], [8, 1])
        self.assertEqual(j["result"]["distance_squared"], 2)
        self.assertTrue(j["result"]["visited"])

    def test_nearest_empty(self):
        self.post("clear")
        resp = self.post("nearest", {"point": [0, 0]})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.get_json()["state"]["size"], 0)

    def test_reset_clear(self):
        self.post("clear")
        self.assertEqual(self.c.get("/api/kd-tree").get_json()["state"]["size"], 0)
        self.assertEqual(self.post("reset").get_json()["state"]["size"], 6)

    def test_bad_input(self):
        bad = [None, {}, {"point": 1}, {"point": [1]}, {"point": [1, 2, 3]}, {"point": ["a", 1]},
               {"point": [True, 1]}, {"point": [1, 1000]}, {"point": [None, 1]}]
        for op in ("insert", "search", "nearest"):
            for b in bad:
                resp = self.post(op, b)
                self.assertEqual(resp.status_code, 400, (op, b))
                self.assertFalse(resp.get_json()["success"])
                self.assertIn("size", resp.get_json()["state"])

    def test_non_finite_and_malformed(self):
        for raw in ('{"point": [NaN, 1]}', '{"point": [Infinity, 1]}', "not json", "[1,2]"):
            resp = self.c.post("/api/kd-tree/insert", data=raw, content_type="application/json")
            self.assertEqual(resp.status_code, 400)

    def test_limit(self):
        n = 0
        while len(r.tree) < r.MAX_POINTS:
            self.post("insert", {"point": [n % 90, n // 90]})
            n += 1
        self.assertEqual(self.post("insert", {"point": [-99, -99]}).status_code, 400)
        self.assertEqual(self.post("insert", {"point": [7, 2]}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
