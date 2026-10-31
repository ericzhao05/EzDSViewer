import unittest

from DataStrcutures.UnionFind import UnionFind
from api.routes import union_find_routes as r
from tests.helpers import client_for


class UnionFindTests(unittest.TestCase):
    def test_initial(self):
        u = UnionFind(4)
        self.assertEqual(u.parent, [0, 1, 2, 3])
        self.assertEqual(u.components, 4)

    def test_union_and_find(self):
        u = UnionFind(5)
        self.assertTrue(u.union(0, 1))
        self.assertTrue(u.union(2, 3))
        self.assertTrue(u.union(1, 3))
        self.assertFalse(u.union(0, 2))
        self.assertEqual(u.components, 2)
        self.assertEqual(u.find(0), u.find(3))
        self.assertNotEqual(u.find(0), u.find(4))

    def test_rank_grows_only_on_equal(self):
        u = UnionFind(4)
        u.union(0, 1)
        self.assertEqual(u.rank[0], 1)
        u.union(0, 2)
        self.assertEqual(u.rank[0], 1)
        self.assertEqual(u.parent[2], 0)

    def test_path_compression(self):
        u = UnionFind(4)
        u.parent = [0, 0, 1, 2]
        self.assertEqual(u.find(3), 0)
        self.assertEqual(u.parent[3], 1)

    def test_connected_and_dict(self):
        u = UnionFind(3)
        u.union(0, 2)
        self.assertTrue(u.connected(0, 2))
        self.assertFalse(u.connected(0, 1))
        self.assertEqual(u.to_dict()["components"], 2)


class UnionFindRouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(r.bp)
        self.c.post("/api/union-find/reset")

    def post(self, op, data=None):
        resp = self.c.post(f"/api/union-find/{op}", json=data)
        return resp.status_code, resp.get_json()

    def test_get(self):
        j = self.c.get("/api/union-find").get_json()
        self.assertTrue(j["success"])
        self.assertEqual(j["state"]["size"], 8)
        self.assertEqual(j["state"]["components"], 8)

    def test_union_find_connected(self):
        code, j = self.post("union", {"a": 0, "b": 1})
        self.assertEqual((code, j["result"]), (200, {"merged": True}))
        self.assertEqual(j["state"]["components"], 7)
        self.assertFalse(self.post("union", {"a": 1, "b": 0})[1]["result"]["merged"])
        j = self.post("find", {"x": 1})[1]
        self.assertEqual(j["result"]["root"], 0)
        self.assertEqual(j["result"]["path"], [1, 0])
        self.assertTrue(self.post("connected", {"a": 0, "b": 1})[1]["result"]["connected"])
        self.assertFalse(self.post("connected", {"a": 0, "b": 5})[1]["result"]["connected"])

    def test_init_and_reset(self):
        code, j = self.post("init", {"size": 3})
        self.assertEqual(j["state"]["parent"], [0, 1, 2])
        j = self.post("reset")[1]
        self.assertEqual(j["state"]["size"], 8)

    def test_bad_input(self):
        bad = [
            ("union", {"a": 0, "b": 8}),
            ("union", {"a": -1, "b": 0}),
            ("union", {"a": "0", "b": 1}),
            ("union", {"a": True, "b": 1}),
            ("union", {"a": float("nan"), "b": 1}),
            ("union", {"a": 0}),
            ("union", None),
            ("find", {"x": 99}),
            ("find", {}),
            ("connected", {"a": 0, "b": None}),
            ("init", {"size": 0}),
            ("init", {"size": 21}),
            ("init", {"size": "3"}),
            ("init", {"size": 2.5}),
        ]
        for op, data in bad:
            with self.subTest(op=op, data=data):
                code, j = self.post(op, data)
                self.assertEqual(code, 400)
                self.assertFalse(j["success"])
                self.assertIn("parent", j["state"])

    def test_malformed_body(self):
        resp = self.c.post("/api/union-find/union", data="{oops", content_type="application/json")
        self.assertEqual(resp.status_code, 400)
        resp = self.c.post("/api/union-find/union", data="[1,2]", content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_float_integer_accepted(self):
        self.assertEqual(self.post("find", {"x": 2.0})[0], 200)


if __name__ == "__main__":
    unittest.main()
