import unittest

from api.routes import range_query_routes as routes
from DataStrcutures.FenwickSegment import FenwickTree, SegmentTree
from tests.helpers import client_for


class FenwickTests(unittest.TestCase):
    def setUp(self):
        self.nums = [5, 2, 7, 1, 9, 3]
        self.f = FenwickTree(len(self.nums))
        for i, v in enumerate(self.nums):
            self.f.add(i, v)

    def test_prefix_sums_match_brute_force(self):
        for k in range(len(self.nums) + 1):
            self.assertEqual(self.f.prefix_sum(k), sum(self.nums[:k]))

    def test_range_sums_match_brute_force(self):
        for a in range(len(self.nums)):
            for b in range(a, len(self.nums)):
                self.assertEqual(self.f.range_sum(a, b), sum(self.nums[a:b + 1]))

    def test_add_updates_later_queries(self):
        self.f.add(2, -10)
        self.assertEqual(self.f.range_sum(2, 2), -3)

    def test_empty_prefix_is_zero(self):
        self.assertEqual(self.f.prefix_sum(0), 0)

    def test_paths(self):
        self.assertEqual(self.f.add_path(0), [1, 2, 4])
        self.assertEqual(self.f.prefix_path(6), [6, 4])


class SegmentTests(unittest.TestCase):
    def test_queries_match_brute_force(self):
        nums = [5, 2, 7, 1, 9, 3, 6]  # odd size
        s = SegmentTree(nums)
        for a in range(len(nums)):
            for b in range(a, len(nums)):
                self.assertEqual(s.query(a, b), min(nums[a:b + 1]))

    def test_update(self):
        nums = [5, 2, 7, 1]
        s = SegmentTree(nums)
        s.update(3, 10)
        nums[3] = 10
        self.assertEqual(s.query(0, 3), 2)
        s.update(1, -4)
        self.assertEqual(s.query(0, 3), -4)

    def test_single_element(self):
        s = SegmentTree([8])
        self.assertEqual(s.query(0, 0), 8)
        s.update(0, 3)
        self.assertEqual(s.query(0, 0), 3)

    def test_empty_query_is_infinity(self):
        self.assertEqual(SegmentTree([1, 2]).query(1, 0), float("inf"))

    def test_nodes_and_path(self):
        s = SegmentTree([5, 2, 7, 1])
        self.assertEqual(s.update_path(0), [4, 2, 1])
        self.assertEqual(s.query_nodes(0, 3), [1])
        self.assertEqual(min(s.to_list()[i] for i in s.query_nodes(1, 2)), 2)


class RouteTests(unittest.TestCase):
    def setUp(self):
        routes.nums = []
        routes._build(routes.DEFAULT_NUMS)
        self.c = client_for(routes.bp)

    def post(self, op, payload=None):
        return self.c.post("/api/range-query/" + op, json=payload)

    def test_get_state(self):
        r = self.c.get("/api/range-query").get_json()
        self.assertTrue(r["success"])
        self.assertEqual(r["state"]["nums"], routes.DEFAULT_NUMS)
        self.assertEqual(len(r["state"]["segment"]), 2 * len(routes.DEFAULT_NUMS))
        self.assertEqual(len(r["state"]["fenwick"]), len(routes.DEFAULT_NUMS))
        self.assertIsNone(r["result"])

    def test_range_sum_and_min(self):
        r = self.post("range-sum", {"left": 1, "right": 4}).get_json()
        self.assertEqual(r["result"]["sum"], 2 + 7 + 1 + 9)
        r = self.post("range-min", {"left": 1, "right": 4}).get_json()
        self.assertEqual(r["result"]["min"], 1)

    def test_prefix_sum(self):
        r = self.post("prefix-sum", {"count": 3}).get_json()
        self.assertEqual(r["result"]["sum"], 14)
        self.assertEqual(self.post("prefix-sum", {"count": 0}).get_json()["result"]["sum"], 0)

    def test_set_updates_both(self):
        r = self.post("set", {"index": 3, "value": -5}).get_json()
        self.assertEqual(r["state"]["nums"][3], -5)
        self.assertEqual(self.post("range-sum", {"left": 3, "right": 3}).get_json()["result"]["sum"], -5)
        self.assertEqual(self.post("range-min", {"left": 0, "right": 7}).get_json()["result"]["min"], -5)
        self.assertTrue(r["result"]["touched"]["fenwick"])

    def test_add(self):
        r = self.post("add", {"index": 0, "delta": 10}).get_json()
        self.assertEqual(r["state"]["nums"][0], 15)
        self.assertEqual(self.post("range-sum", {"left": 0, "right": 0}).get_json()["result"]["sum"], 15)

    def test_load_and_reset(self):
        r = self.post("load", {"nums": [3, 1, 2]}).get_json()
        self.assertEqual(r["state"]["nums"], [3, 1, 2])
        self.assertEqual(self.post("range-min", {"left": 0, "right": 2}).get_json()["result"]["min"], 1)
        r = self.post("reset").get_json()
        self.assertEqual(r["state"]["nums"], routes.DEFAULT_NUMS)

    def assert_400(self, op, payload):
        r = self.post(op, payload)
        self.assertEqual(r.status_code, 400, (op, payload))
        j = r.get_json()
        self.assertFalse(j["success"])
        self.assertEqual(j["state"]["nums"], routes.DEFAULT_NUMS)

    def test_bad_input(self):
        for payload in (None, {}, [], {"left": 3, "right": 1}, {"left": -1, "right": 2},
                        {"left": 0, "right": 8}, {"left": "0", "right": 1}, {"left": True, "right": 1},
                        {"left": 0.5, "right": 1}):
            self.assert_400("range-sum", payload)
            self.assert_400("range-min", payload)
        for payload in (None, {}, {"count": 9}, {"count": -1}, {"count": "1"}, {"count": 1.5}):
            self.assert_400("prefix-sum", payload)
        for op, key in (("set", "value"), ("add", "delta")):
            for payload in (None, {}, {"index": 8, key: 1}, {"index": -1, key: 1}, {"index": 0},
                            {"index": 0, key: "x"}, {"index": 0, key: 1.5}, {"index": 0, key: True},
                            {"index": 0, key: 10 ** 7}, {"index": "0", key: 1}):
                self.assert_400(op, payload)
        self.assert_400("add", {"index": 0, "delta": 10 ** 6})
        for payload in (None, {}, {"nums": []}, {"nums": "abc"}, {"nums": [1, "a"]},
                        {"nums": [1.5]}, {"nums": [True]}, {"nums": [0] * 17}, {"nums": [10 ** 7]}):
            self.assert_400("load", payload)

    def test_non_finite_and_malformed_json(self):
        r = self.c.post("/api/range-query/set", data='{"index": 0, "value": NaN}',
                        content_type="application/json")
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/range-query/range-sum", data="{bad", content_type="application/json")
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/range-query/load", data='{"nums": [Infinity]}',
                        content_type="application/json")
        self.assertEqual(r.status_code, 400)


if __name__ == "__main__":
    unittest.main()
