import unittest

from DataStrcutures import Graph as g
from api.routes import graph_routes as r
from tests.helpers import client_for


class ClassTests(unittest.TestCase):
    def test_build_graph(self):
        self.assertEqual(g.build_graph([(0, 1)])[1], [0])
        self.assertEqual(g.build_graph([(0, 1)], True).get(1, []), [])

    def test_bfs_dfs(self):
        gr = g.build_graph([(0, 1), (0, 2), (1, 3), (2, 3)])
        self.assertEqual(g.bfs(gr, 0), [0, 1, 2, 3])
        self.assertEqual(g.dfs(gr, 0), [0, 1, 3, 2])

    def test_disconnected_only_reaches_component(self):
        gr = g.build_graph([(0, 1), (2, 3)])
        self.assertEqual(g.bfs(gr, 0), [0, 1])
        self.assertEqual(g.connected_components(5, [(0, 1), (2, 3)]), [[0, 1], [2, 3], [4]])

    def test_topological(self):
        self.assertEqual(g.topological_sort(4, [(0, 1), (1, 2), (0, 3)]), [0, 1, 3, 2])
        self.assertEqual(g.topological_sort(2, [(0, 1), (1, 0)]), [])

    def test_dijkstra(self):
        gr = {0: [(1, 4), (2, 1)], 2: [(1, 2)], 1: []}
        self.assertEqual(g.dijkstra(gr, 0), {0: 0, 2: 1, 1: 3})

    def test_has_cycle(self):
        self.assertTrue(g.has_cycle(3, [(0, 1), (1, 2), (2, 0)], True))
        # diamond: visited node reached twice but no directed cycle
        self.assertFalse(g.has_cycle(4, [(0, 1), (0, 2), (1, 3), (2, 3)], True))
        self.assertFalse(g.has_cycle(3, [(0, 1), (1, 2)], False))
        self.assertTrue(g.has_cycle(3, [(0, 1), (1, 2), (2, 0)], False))

    def test_graph_class(self):
        gr = g.Graph(3)
        gr.add_edge(1, 0, 5)
        self.assertEqual(gr.to_dict()["edges"], [{"u": 0, "v": 1, "w": 5}])
        with self.assertRaises(IndexError):
            gr.add_edge(0, 9)
        with self.assertRaises(ValueError):
            gr.add_edge(1, 1)
        with self.assertRaises(KeyError):
            gr.remove_edge(0, 2)
        gr.remove_last_node()
        self.assertEqual(gr.n, 2)


class RouteTests(unittest.TestCase):
    def setUp(self):
        r.graph = r._fresh()
        self.c = client_for(r.bp)

    def post(self, op, data=None):
        res = self.c.post(f"/api/graph/{op}", json=data if data is not None else {})
        return res.status_code, res.get_json()

    def test_get(self):
        j = self.c.get("/api/graph").get_json()
        self.assertTrue(j["success"])
        self.assertEqual(j["state"]["n"], 5)
        self.assertIsNone(j["result"])

    def test_bfs_dfs(self):
        _, j = self.post("bfs", {"start": 0})
        self.assertEqual(j["result"]["order"], [0, 1, 2, 3, 4])
        self.assertEqual(len(j["result"]["tree_edges"]), 4)
        _, j = self.post("dfs", {"start": 0})
        self.assertEqual(sorted(j["result"]["order"]), [0, 1, 2, 3, 4])

    def test_dijkstra(self):
        _, j = self.post("dijkstra", {"start": 0})
        self.assertEqual(j["result"]["distances"], [0, 3, 1, 4, 7])

    def test_dijkstra_unreachable_and_negative(self):
        self.post("add-node")
        _, j = self.post("dijkstra", {"start": 0})
        self.assertIsNone(j["result"]["distances"][5])
        self.post("add-edge", {"u": 0, "v": 5, "w": -1})
        code, j = self.post("dijkstra", {"start": 0})
        self.assertEqual(code, 400)
        self.assertIn("non-negative", j["error"])

    def test_topological_and_directed(self):
        code, _ = self.post("topological-sort")
        self.assertEqual(code, 400)
        self.post("set-directed", {"directed": True})
        _, j = self.post("topological-sort")
        self.assertEqual(j["result"]["has_cycle"], False)
        self.assertEqual(len(j["result"]["order"]), 5)
        self.post("add-edge", {"u": 4, "v": 0})
        self.post("add-edge", {"u": 3, "v": 4})
        _, j = self.post("topological-sort")
        self.assertEqual(j["result"], {"order": [], "has_cycle": True})
        _, j = self.post("has-cycle")
        self.assertTrue(j["result"]["has_cycle"])

    def test_components(self):
        self.post("add-node")
        _, j = self.post("components")
        self.assertEqual(j["result"]["components"], [[0, 1, 2, 3, 4], [5]])

    def test_edges_and_nodes(self):
        _, j = self.post("add-edge", {"u": 0, "v": 4, "w": 9})
        self.assertIn({"u": 0, "v": 4, "w": 9}, j["state"]["edges"])
        _, j = self.post("remove-edge", {"u": 4, "v": 0})
        self.assertNotIn({"u": 0, "v": 4, "w": 9}, j["state"]["edges"])
        _, j = self.post("remove-node")
        self.assertEqual(j["state"]["n"], 4)
        self.assertTrue(all(e["u"] < 4 and e["v"] < 4 for e in j["state"]["edges"]))
        _, j = self.post("reset")
        self.assertEqual(j["state"]["n"], 5)

    def test_bad_input(self):
        cases = [
            ("bfs", {}), ("bfs", {"start": 9}), ("bfs", {"start": "a"}), ("bfs", {"start": True}),
            ("bfs", {"start": -1}), ("bfs", {"start": 1.5}),
            ("add-edge", {"u": 0}), ("add-edge", {"u": 0, "v": 0}), ("add-edge", {"u": 0, "v": 1, "w": "x"}),
            ("add-edge", {"u": 0, "v": 1, "w": 10 ** 6}), ("add-edge", {"u": 0, "v": 1, "w": float("nan")}),
            ("add-edge", {"u": 0, "v": 1, "w": float("inf")}),
            ("remove-edge", {"u": 0, "v": 4}), ("remove-edge", {}),
            ("set-directed", {"directed": "yes"}), ("set-directed", {}),
            ("dfs", {"start": None}), ("dijkstra", {"start": 99}),
        ]
        for op, data in cases:
            code, j = self.post(op, data)
            self.assertEqual(code, 400, (op, data))
            self.assertFalse(j["success"])
            self.assertIn("n", j["state"])

    def test_malformed_body(self):
        for raw in (b"not json", b"[1,2]", b"", b"null"):
            res = self.c.post("/api/graph/bfs", data=raw, content_type="application/json")
            self.assertEqual(res.status_code, 400)

    def test_node_limit_and_empty(self):
        for _ in range(r.MAX_NODES - 5):
            self.assertEqual(self.post("add-node")[0], 200)
        self.assertEqual(self.post("add-node")[0], 400)
        for _ in range(r.MAX_NODES):
            self.assertEqual(self.post("remove-node")[0], 200)
        self.assertEqual(self.post("remove-node")[0], 400)
        self.assertEqual(self.post("bfs", {"start": 0})[0], 400)
        self.assertEqual(self.post("components")[1]["result"]["components"], [])
        self.assertFalse(self.post("has-cycle")[1]["result"]["has_cycle"])


if __name__ == "__main__":
    unittest.main()
