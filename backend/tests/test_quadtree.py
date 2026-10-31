import random
import unittest

from DataStrcutures.Quadtree import Quadtree
from api.routes import quadtree_routes as r
from tests.helpers import client_for


class ClassTests(unittest.TestCase):
    def test_leaf_holds_capacity_without_splitting(self):
        q = Quadtree(0, 0, 100, 100, capacity=2)
        q.insert(10, 10)
        q.insert(20, 20)
        self.assertIsNone(q.children)
        self.assertEqual(q.node_count(), 1)

    def test_subdivides_when_over_capacity(self):
        q = Quadtree(0, 0, 100, 100, capacity=1)
        q.insert(10, 10)
        q.insert(90, 90)
        self.assertEqual(len(q.children), 4)
        self.assertEqual(q.points, [])
        nw, ne, sw, se = q.children
        self.assertEqual(nw.points, [(10, 10)])
        self.assertEqual(se.points, [(90, 90)])
        self.assertEqual((ne.points, sw.points), ([], []))
        self.assertEqual(q.count(), 2)

    def test_dividing_line_goes_to_larger_side(self):
        q = Quadtree(0, 0, 100, 100, capacity=1)
        q.insert(0, 0)
        q.insert(50, 50)
        self.assertEqual(q.children[3].points, [(50, 50)])

    def test_out_of_bounds_rejected(self):
        q = Quadtree(0, 0, 100, 100)
        self.assertFalse(q.insert(-1, 5))
        self.assertFalse(q.insert(5, 101))
        self.assertTrue(q.insert(100, 100))
        self.assertEqual(q.count(), 1)

    def test_duplicates_stop_at_max_depth(self):
        q = Quadtree(0, 0, 100, 100, capacity=1, max_depth=3)
        for _ in range(10):
            q.insert(5, 5)
        self.assertEqual(q.count(), 10)
        self.assertEqual(q.height_of_tree(), 3)

    def test_bad_construction(self):
        with self.assertRaises(ValueError):
            Quadtree(0, 0, 0, 10)
        with self.assertRaises(ValueError):
            Quadtree(0, 0, 10, 10, capacity=0)

    def test_range_query_empty_and_swapped_corners(self):
        q = Quadtree()
        self.assertEqual(q.query_range(0, 0, 100, 100), [])
        q.insert(30, 30)
        self.assertEqual(q.query_range(40, 40, 20, 20), [(30, 30)])
        self.assertEqual(q.query_range(0, 0, 10, 10), [])

    def test_range_query_matches_brute_force(self):
        rng = random.Random(7)
        for cap in (1, 2, 5):
            q = Quadtree(0, 0, 100, 100, capacity=cap)
            pts = [(rng.randint(0, 100), rng.randint(0, 100)) for _ in range(150)]
            for p in pts:
                q.insert(*p)
            self.assertEqual(q.count(), 150)
            for _ in range(40):
                x0, x1 = sorted(rng.uniform(-10, 110) for _ in range(2))
                y0, y1 = sorted(rng.uniform(-10, 110) for _ in range(2))
                expected = sorted(p for p in pts if x0 <= p[0] <= x1 and y0 <= p[1] <= y1)
                self.assertEqual(sorted(q.query_range(x0, y0, x1, y1)), expected)

    def test_query_prunes_quadrants(self):
        q = Quadtree(0, 0, 100, 100, capacity=1)
        for p in [(10, 10), (90, 10), (10, 90), (90, 90)]:
            q.insert(*p)
        _, visited = q.query_range_stats(0, 0, 20, 20)
        self.assertLess(len(visited), q.node_count())

    def test_to_dict_shape(self):
        q = Quadtree(0, 0, 100, 100, capacity=1)
        q.insert(10, 10)
        q.insert(90, 90)
        d = q.to_dict()
        self.assertEqual(len(d["children"]), 4)
        self.assertEqual(d["children"][0]["points"], [[10, 10]])
        self.assertEqual(d["children"][0]["depth"], 1)
        self.assertIsNone(d["children"][0]["children"])


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, path, payload=None):
        return self.c.post(f"/api/quadtree/{path}", json=payload)

    def test_get_initial(self):
        j = self.c.get("/api/quadtree").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"]["count"], 0)
        self.assertIsNone(j["state"]["tree"]["children"])

    def test_insert_and_subdivide(self):
        for p in [(10, 10), (20, 20), (80, 80)]:
            res = self.post("insert", {"x": p[0], "y": p[1]})
            self.assertEqual(res.status_code, 200)
        s = res.get_json()["state"]
        self.assertEqual(s["count"], 3)
        self.assertEqual(s["depth"], 1)
        self.assertEqual(s["node_count"], 5)

    def test_insert_bad_input(self):
        for payload in [None, {}, {"x": 1}, {"x": "1", "y": 2}, {"x": True, "y": 2},
                        {"x": 101, "y": 5}, {"x": 5, "y": -0.1}, [1, 2]]:
            res = self.post("insert", payload)
            self.assertEqual(res.status_code, 400, payload)
            self.assertFalse(res.get_json()["success"])
            self.assertEqual(res.get_json()["state"]["count"], 0)

    def test_insert_nan_rejected(self):
        res = self.c.post("/api/quadtree/insert", data='{"x": NaN, "y": 1}',
                          content_type="application/json")
        self.assertEqual(res.status_code, 400)
        res = self.c.post("/api/quadtree/insert", data='{"x": Infinity, "y": 1}',
                          content_type="application/json")
        self.assertEqual(res.status_code, 400)

    def test_malformed_body(self):
        res = self.c.post("/api/quadtree/insert", data="{bad", content_type="application/json")
        self.assertEqual(res.status_code, 400)

    def test_random_seeded_deterministic(self):
        a = self.post("random", {"n": 20, "seed": 3}).get_json()
        r._reset()
        b = self.post("random", {"n": 20, "seed": 3}).get_json()
        self.assertEqual(a["result"]["added"], b["result"]["added"])
        self.assertEqual(a["state"]["count"], 20)

    def test_random_bad_input(self):
        for payload in [None, {}, {"n": 0}, {"n": 101}, {"n": "5"}, {"n": 2.5},
                        {"n": 5, "seed": "x"}, {"n": 5, "seed": 10**12}]:
            self.assertEqual(self.post("random", payload).status_code, 400, payload)

    def test_point_limit(self):
        for _ in range(3):
            self.assertEqual(self.post("random", {"n": 100, "seed": 1}).status_code, 200)
        self.assertEqual(self.post("random", {"n": 1}).status_code, 400)
        self.assertEqual(self.post("insert", {"x": 1, "y": 1}).status_code, 400)
        self.assertEqual(self.c.get("/api/quadtree").get_json()["state"]["count"], 300)

    def test_query(self):
        for p in [(10, 10), (90, 10), (10, 90), (90, 90)]:
            self.post("insert", {"x": p[0], "y": p[1]})
        res = self.post("query", {"x0": 0, "y0": 0, "x1": 50, "y1": 50}).get_json()
        self.assertEqual(res["result"]["points"], [[10, 10]])
        self.assertEqual(res["result"]["rect"], [0, 0, 50, 50])
        self.assertLessEqual(res["result"]["nodes_visited"], res["result"]["total_nodes"])
        self.assertEqual(len(res["result"]["visited"]), res["result"]["nodes_visited"])

    def test_query_swapped_and_empty(self):
        res = self.post("query", {"x0": 50, "y0": 50, "x1": 0, "y1": 0}).get_json()
        self.assertEqual(res["result"]["points"], [])
        self.assertEqual(res["result"]["rect"], [0, 0, 50, 50])

    def test_query_bad_input(self):
        for payload in [None, {}, {"x0": 0, "y0": 0, "x1": 5}, {"x0": "a", "y0": 0, "x1": 1, "y1": 1}]:
            self.assertEqual(self.post("query", payload).status_code, 400, payload)

    def test_configure(self):
        res = self.post("configure", {"capacity": 4})
        self.assertEqual(res.get_json()["state"]["capacity"], 4)
        for payload in [None, {}, {"capacity": 0}, {"capacity": 9}, {"capacity": "2"}, {"capacity": 2.5}, {"capacity": True}]:
            self.assertEqual(self.post("configure", payload).status_code, 400, payload)

    def test_reset(self):
        self.post("insert", {"x": 1, "y": 1})
        self.post("configure", {"capacity": 5})
        self.post("insert", {"x": 1, "y": 1})
        s = self.post("reset").get_json()["state"]
        self.assertEqual(s["count"], 0)
        self.assertEqual(s["capacity"], r.DEFAULT_CAPACITY)


if __name__ == "__main__":
    unittest.main()
