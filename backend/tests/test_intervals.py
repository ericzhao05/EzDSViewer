import unittest

from DataStrcutures.Intervals import (
    erase_overlap_intervals,
    insert_interval,
    merge_intervals,
    min_meeting_rooms,
    overlaps,
)
from api.routes import intervals_routes as r
from tests.helpers import client_for


class ClassTests(unittest.TestCase):
    def test_overlaps(self):
        self.assertTrue(overlaps([1, 3], [2, 4]))
        self.assertFalse(overlaps([1, 2], [2, 3]))
        self.assertTrue(overlaps([1, 10], [3, 4]))

    def test_merge(self):
        self.assertEqual(merge_intervals([[8, 10], [1, 3], [2, 6], [15, 18]]), [[1, 6], [8, 10], [15, 18]])
        self.assertEqual(merge_intervals([[1, 4], [4, 5]]), [[1, 5]])
        self.assertEqual(merge_intervals([[1, 10], [2, 3]]), [[1, 10]])
        self.assertEqual(merge_intervals([]), [])

    def test_merge_does_not_mutate(self):
        src = [[1, 3], [2, 6]]
        merge_intervals(src)
        self.assertEqual(src, [[1, 3], [2, 6]])

    def test_rooms(self):
        self.assertEqual(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]), 2)
        self.assertEqual(min_meeting_rooms([[7, 10], [2, 4]]), 1)
        self.assertEqual(min_meeting_rooms([[1, 2], [2, 3]]), 1)
        self.assertEqual(min_meeting_rooms([]), 0)

    def test_insert(self):
        self.assertEqual(insert_interval([[1, 3], [6, 9]], [2, 5]), [[1, 5], [6, 9]])
        self.assertEqual(
            insert_interval([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]),
            [[1, 2], [3, 10], [12, 16]],
        )
        self.assertEqual(insert_interval([], [5, 7]), [[5, 7]])
        self.assertEqual(insert_interval([[1, 2]], [3, 4]), [[1, 2], [3, 4]])
        self.assertEqual(insert_interval([[5, 6]], [1, 2]), [[1, 2], [5, 6]])

    def test_erase_random_matches_brute_force(self):
        import itertools
        import random
        rng = random.Random(7)
        for _ in range(300):
            ivs = []
            for _ in range(rng.randint(0, 7)):
                a = rng.randint(0, 8)
                ivs.append([a, a + rng.randint(1, 4)])
            best = len(ivs)
            for mask in range(1 << len(ivs)):
                keep = [ivs[i] for i in range(len(ivs)) if mask >> i & 1]
                if all(not overlaps(x, y) for x, y in itertools.combinations(keep, 2)):
                    best = min(best, len(ivs) - len(keep))
            self.assertEqual(erase_overlap_intervals(ivs), best, ivs)

    def test_erase(self):
        self.assertEqual(erase_overlap_intervals([[1, 2], [2, 3], [3, 4], [1, 3]]), 1)
        self.assertEqual(erase_overlap_intervals([[1, 2], [1, 2], [1, 2]]), 2)
        self.assertEqual(erase_overlap_intervals([[1, 2], [2, 3]]), 0)
        self.assertEqual(erase_overlap_intervals([]), 0)


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, op, payload=None):
        resp = self.c.post(f"/api/intervals/{op}", json=payload)
        return resp.status_code, resp.get_json()

    def test_get_and_reset(self):
        d = self.c.get("/api/intervals").get_json()
        self.assertTrue(d["success"])
        self.assertEqual(d["state"]["intervals"], r.DEFAULT)
        self.assertIsNone(d["result"])
        self.post("clear")
        s, d = self.post("reset")
        self.assertEqual(d["state"]["intervals"], r.DEFAULT)

    def test_add_remove(self):
        s, d = self.post("add", {"interval": [20, 25]})
        self.assertEqual((s, d["result"]), (200, [20, 25]))
        self.assertEqual(d["state"]["size"], 5)
        s, d = self.post("remove", {"index": 0})
        self.assertEqual(d["result"], [1, 3])
        self.assertEqual(d["state"]["size"], 4)

    def test_build_and_ops(self):
        self.post("build", {"intervals": [[0, 30], [5, 10], [15, 20]]})
        self.assertEqual(self.post("meeting-rooms")[1]["result"], 2)
        self.assertEqual(self.post("merge")[1]["result"], [[0, 30]])
        self.assertEqual(self.post("non-overlapping")[1]["result"], 1)
        s, d = self.post("insert", {"interval": [40, 50]})
        self.assertEqual(d["result"]["result"], [[0, 30], [40, 50]])
        s, d = self.post("overlap", {"a": [1, 3], "b": [3, 5]})
        self.assertIs(d["result"], False)

    def test_ops_on_empty(self):
        self.post("clear")
        self.assertEqual(self.post("merge")[1]["result"], [])
        self.assertEqual(self.post("meeting-rooms")[1]["result"], 0)
        self.assertEqual(self.post("non-overlapping")[1]["result"], 0)
        self.assertEqual(self.post("insert", {"interval": [1, 2]})[1]["result"]["result"], [[1, 2]])

    def test_bad_input(self):
        bads = [
            ("add", None), ("add", {}), ("add", {"interval": [3, 1]}), ("add", {"interval": [3, 3]}), ("add", {"interval": [1]}),
            ("add", {"interval": ["a", 2]}), ("add", {"interval": [True, 2]}),
            ("add", {"interval": [1, 10 ** 9]}), ("add", {"interval": "12"}),
            ("remove", {"index": 99}), ("remove", {"index": -1}), ("remove", {}), ("remove", {"index": "0"}),
            ("build", {"intervals": "x"}), ("build", {"intervals": [[1, 2], [5]]}),
            ("build", {"intervals": [[0, 1]] * 31}),
            ("overlap", {"a": [1, 2]}), ("insert", {}), ("insert", {"interval": [2, 1]}), ("build", {"intervals": [[4, 4]]}), ("overlap", {"a": [1, 1], "b": [1, 2]}),
        ]
        for op, payload in bads:
            s, d = self.post(op, payload)
            self.assertEqual(s, 400, (op, payload))
            self.assertFalse(d["success"])
            self.assertIn("intervals", d["state"])

    def test_non_finite_and_malformed(self):
        resp = self.c.post("/api/intervals/add", data='{"interval": [NaN, 2]}', content_type="application/json")
        self.assertEqual(resp.status_code, 400)
        resp = self.c.post("/api/intervals/add", data="not json", content_type="application/json")
        self.assertEqual(resp.status_code, 400)
        resp = self.c.post("/api/intervals/add", data="[1,2]", content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_size_cap(self):
        self.post("build", {"intervals": [[i, i + 1] for i in range(30)]})
        s, d = self.post("add", {"interval": [1, 2]})
        self.assertEqual(s, 400)


if __name__ == "__main__":
    unittest.main()
