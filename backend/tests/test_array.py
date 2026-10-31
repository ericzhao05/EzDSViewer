import unittest

from DataStrcutures.DynamicArray import (
    DynamicArray,
    binary_search,
    max_subarray,
    range_sum_prefix,
    two_sum_sorted,
)
from api.routes import array_routes
from flask import Blueprint, Flask


def make_client():
    # Mirrors the real app: bp (prefix /array) nested in a parent mounted at /api.
    # tests.helpers.client_for overrides the bp prefix, so it would serve /api/<op>.
    parent = Blueprint("ds_api_test", __name__)
    parent.register_blueprint(array_routes.bp)
    app = Flask(__name__)
    app.register_blueprint(parent, url_prefix="/api")
    return app.test_client()


class DynamicArrayTest(unittest.TestCase):
    def test_starts_empty_capacity_two(self):
        a = DynamicArray()
        self.assertEqual(len(a), 0)
        self.assertEqual(a.to_dict()["capacity"], 2)

    def test_append_doubles_capacity(self):
        a = DynamicArray()
        for i in range(5):
            a.append(i)
        d = a.to_dict()
        self.assertEqual((d["size"], d["capacity"], d["resizes"]), (5, 8, 2))
        self.assertEqual(d["data"], [0, 1, 2, 3, 4, None, None, None])

    def test_getitem_bounds(self):
        a = DynamicArray()
        a.append("x")
        self.assertEqual(a[0], "x")
        for i in (-1, 1):
            with self.assertRaises(IndexError):
                a[i]

    def test_insert(self):
        a = DynamicArray()
        for v in (1, 3):
            a.append(v)
        a.insert(1, 2)
        self.assertEqual([a[i] for i in range(3)], [1, 2, 3])
        a.insert(3, 4)
        self.assertEqual(a[3], 4)
        for i in (-1, 5):
            with self.assertRaises(IndexError):
                a.insert(i, 0)

    def test_pop(self):
        a = DynamicArray()
        for v in (1, 2, 3):
            a.append(v)
        self.assertEqual(a.pop(), 3)
        self.assertEqual(a.pop(0), 1)
        self.assertEqual(a.pop(-1), 2)
        self.assertEqual(a.to_dict()["data"][0], None)
        with self.assertRaises(IndexError):
            a.pop()
        with self.assertRaises(IndexError):
            a.pop(0)

    def test_algorithms(self):
        self.assertEqual(two_sum_sorted([1, 2, 4, 7], 9), [1, 3])
        self.assertEqual(two_sum_sorted([1, 2], 10), [])
        self.assertEqual(two_sum_sorted([], 1), [])
        self.assertEqual(binary_search([1, 3, 5, 7], 7), 3)
        self.assertEqual(binary_search([1, 3, 5, 7], 4), -1)
        self.assertEqual(binary_search([], 4), -1)
        self.assertEqual(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6)
        self.assertEqual(max_subarray([-3]), -3)
        with self.assertRaises(IndexError):
            max_subarray([])
        self.assertEqual(range_sum_prefix([1, 2, 3]), [0, 1, 3, 6])
        self.assertEqual(range_sum_prefix([]), [0])


class ArrayRoutesTest(unittest.TestCase):
    def setUp(self):
        self.c = make_client()
        self.c.post("/api/array/reset")

    def post(self, op, payload=None):
        return self.c.post("/api/array/" + op, json=payload if payload is not None else {})

    def fill(self, *vals):
        for v in vals:
            self.post("append", {"value": v})

    def test_get(self):
        j = self.c.get("/api/array").get_json()
        self.assertTrue(j["success"])
        self.assertEqual(j["state"]["size"], 0)
        self.assertIsNone(j["result"])

    def test_append_and_resize(self):
        self.fill(1, 2, 3)
        s = self.c.get("/api/array").get_json()["state"]
        self.assertEqual((s["size"], s["capacity"], s["resizes"]), (3, 4, 1))

    def test_reset(self):
        self.fill(1, 2, 3)
        s = self.post("reset").get_json()["state"]
        self.assertEqual((s["size"], s["capacity"], s["resizes"]), (0, 2, 0))

    def test_insert_pop_get(self):
        self.fill(1, 3)
        self.assertEqual(self.post("insert", {"index": 1, "value": 2}).status_code, 200)
        self.assertEqual(self.post("get", {"index": 1}).get_json()["result"], 2)
        self.assertEqual(self.post("pop", {}).get_json()["result"], 3)
        self.assertEqual(self.post("pop", {"index": 0}).get_json()["result"], 1)

    def test_bad_input(self):
        self.fill(1)
        cases = [
            ("append", {}),
            ("append", {"value": None}),
            ("append", {"value": True}),
            ("append", {"value": [1]}),
            ("append", {"value": ""}),
            ("append", {"value": "x" * 500}),
            ("insert", {"value": 1}),
            ("insert", {"value": 1, "index": "a"}),
            ("insert", {"value": 1, "index": 5}),
            ("insert", {"value": 1, "index": -1}),
            ("pop", {"index": 9}),
            ("pop", {"index": "z"}),
            ("get", {}),
            ("get", {"index": 1}),
            ("two_sum_sorted", {}),
            ("binary_search", {"target": "a"}),
        ]
        for op, payload in cases:
            r = self.post(op, payload)
            self.assertEqual(r.status_code, 400, (op, payload))
            j = r.get_json()
            self.assertFalse(j["success"])
            self.assertEqual(j["state"]["size"], 1)

    def test_malformed_body(self):
        for op in ("append", "insert", "pop", "get"):
            r = self.c.post("/api/array/" + op, data="not json", content_type="application/json")
            self.assertEqual(r.status_code, 400, op)
        r = self.c.post("/api/array/append")
        self.assertEqual(r.status_code, 400)

    def test_pop_empty(self):
        self.assertEqual(self.post("pop").status_code, 400)

    def test_size_limit(self):
        for i in range(array_routes.MAX_SIZE):
            self.assertEqual(self.post("append", {"value": i}).status_code, 200)
        self.assertEqual(self.post("append", {"value": 1}).status_code, 400)
        self.assertEqual(self.post("insert", {"value": 1, "index": 0}).status_code, 400)

    def test_algorithm_routes(self):
        self.fill(1, 2, 4, 7)
        self.assertEqual(self.post("two_sum_sorted", {"target": 9}).get_json()["result"], [1, 3])
        self.assertEqual(self.post("binary_search", {"target": 4}).get_json()["result"], 2)
        self.assertEqual(self.post("binary_search", {"target": 5}).get_json()["result"], -1)
        self.assertEqual(self.post("max_subarray").get_json()["result"], 14)
        self.assertEqual(self.post("prefix_sums").get_json()["result"], [0, 1, 3, 7, 14])

    def test_algorithm_edge_cases(self):
        self.assertEqual(self.post("max_subarray").status_code, 400)
        self.assertEqual(self.post("prefix_sums").get_json()["result"], [0])
        self.assertEqual(self.post("binary_search", {"target": 1}).get_json()["result"], -1)
        self.fill(5, 1)
        self.assertEqual(self.post("binary_search", {"target": 1}).status_code, 400)
        self.assertEqual(self.post("two_sum_sorted", {"target": 6}).status_code, 400)
        self.post("reset")
        self.fill("a", 1)
        self.assertEqual(self.post("max_subarray").status_code, 400)
        self.assertEqual(self.post("prefix_sums").status_code, 400)


if __name__ == "__main__":
    unittest.main()
