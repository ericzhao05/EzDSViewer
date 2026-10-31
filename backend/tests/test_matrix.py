import unittest

from DataStrcutures.Matrix import island_labels, number_of_islands, rotate_clockwise
from api.routes import matrix_routes as m
from tests.helpers import client_for


class MatrixClassTests(unittest.TestCase):
    def test_islands(self):
        self.assertEqual(number_of_islands([]), 0)
        self.assertEqual(number_of_islands([["0"]]), 0)
        self.assertEqual(number_of_islands([["1", "0", "1"], ["0", "0", "1"]]), 2)
        self.assertEqual(number_of_islands([["1", "1"], ["1", "1"]]), 1)
        # diagonal cells are not connected
        self.assertEqual(number_of_islands([["1", "0"], ["0", "1"]]), 2)

    def test_labels(self):
        self.assertEqual(island_labels([["1", "0", "1"], ["0", "0", "1"]]), [[1, 0, 2], [0, 0, 2]])
        self.assertEqual(island_labels([]), [])

    def test_rotate(self):
        g = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        rotate_clockwise(g)
        self.assertEqual(g, [[7, 4, 1], [8, 5, 2], [9, 6, 3]])
        one = [[1]]
        rotate_clockwise(one)
        self.assertEqual(one, [[1]])
        empty = []
        rotate_clockwise(empty)
        self.assertEqual(empty, [])


class MatrixRouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(m.bp)
        self.c.post("/api/matrix/reset")

    def post(self, op, payload=None, **kw):
        return self.c.post("/api/matrix/" + op, json=payload, **kw)

    def test_get(self):
        j = self.c.get("/api/matrix").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual((j["state"]["rows"], j["state"]["cols"]), (4, 5))

    def test_set_cell(self):
        j = self.post("set-cell", {"row": 0, "col": 2, "value": "1"}).get_json()
        self.assertEqual(j["state"]["grid"][0][2], "1")

    def test_set_cell_bad(self):
        for p in [None, {}, {"row": 9, "col": 0, "value": "1"}, {"row": -1, "col": 0, "value": "1"},
                  {"row": 0, "col": 5, "value": "1"}, {"row": True, "col": 0, "value": "1"},
                  {"row": "0", "col": 0, "value": "1"}, {"row": 0, "col": 0, "value": 1},
                  {"row": 0, "col": 0, "value": ""}, {"row": 0, "col": 0, "value": "abcd"}]:
            r = self.post("set-cell", p)
            self.assertEqual(r.status_code, 400, p)
            self.assertIn("grid", r.get_json()["state"])

    def test_resize(self):
        j = self.post("resize", {"rows": 2, "cols": 6}).get_json()
        self.assertEqual(j["state"]["grid"], [["1", "1", "0", "0", "0", "0"],
                                              ["1", "1", "0", "0", "1", "0"]])
        for p in [{}, {"rows": 0, "cols": 1}, {"rows": 13, "cols": 1}, {"rows": 1.5, "cols": 2},
                  {"rows": True, "cols": 2}, {"rows": "2", "cols": 2}]:
            self.assertEqual(self.post("resize", p).status_code, 400, p)

    def test_set_grid(self):
        j = self.post("set-grid", {"grid": [["1", "0"], ["0", "1"]]}).get_json()
        self.assertEqual(j["state"]["rows"], 2)
        for g in [None, [], [[]], [["1"], ["1", "0"]], "x", [["1"], "0"], [[1]], [[""]],
                  [["0"]] * 13, [["0"] * 13]]:
            self.assertEqual(self.post("set-grid", {"grid": g}).status_code, 400, g)

    def test_rotate(self):
        r = self.post("rotate")
        self.assertEqual(r.status_code, 400)
        self.post("set-grid", {"grid": [["1", "2"], ["3", "4"]]})
        j = self.post("rotate").get_json()
        self.assertEqual(j["state"]["grid"], [["3", "1"], ["4", "2"]])

    def test_islands(self):
        j = self.post("islands").get_json()
        self.assertEqual(j["result"]["count"], 4)
        self.assertEqual(j["result"]["labels"][0][:2], [1, 1])

    def test_reset(self):
        self.post("resize", {"rows": 1, "cols": 1})
        j = self.post("reset").get_json()
        self.assertEqual(j["state"]["rows"], 4)

    def test_malformed_body(self):
        for raw in ["not json", "[1,2]", "NaN", "null"]:
            r = self.post("set-cell", data=raw, content_type="application/json")
            self.assertEqual(r.status_code, 400)
        r = self.post("resize", data='{"rows": NaN, "cols": 2}', content_type="application/json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.post("set-cell", data="{" * 100000,
                                   content_type="application/json").status_code, 400)


if __name__ == "__main__":
    unittest.main()
