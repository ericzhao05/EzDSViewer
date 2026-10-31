import unittest

from api.routes import hash_table_routes as routes
from DataStrcutures.HashTable import (
    HashMap,
    group_anagrams,
    longest_consecutive,
    two_sum,
)
from tests.helpers import client_for


class HashMapTests(unittest.TestCase):
    def test_put_get_update_len(self):
        m = HashMap()
        m.put("a", 1)
        m.put("a", 2)
        self.assertEqual(len(m), 1)
        self.assertEqual(m.get("a"), 2)
        self.assertIsNone(m.get("zz"))
        self.assertEqual(m.get("zz", 7), 7)

    def test_remove(self):
        m = HashMap()
        m.put(1, "x")
        self.assertTrue(m.remove(1))
        self.assertFalse(m.remove(1))
        self.assertEqual(len(m), 0)

    def test_collisions_chain(self):
        m = HashMap(8)
        m.put(1, "a")
        m.put(9, "b")
        self.assertEqual(m.to_dict()["buckets"][1], [[1, "a"], [9, "b"]])
        self.assertEqual(m.get(9), "b")

    def test_resize_past_threshold(self):
        m = HashMap(8)
        for i in range(6):
            m.put(i, i)
        self.assertEqual(m.capacity, 8)  # 6/8 == 0.75 is not above
        m.put(6, 6)
        self.assertEqual(m.capacity, 16)
        for i in range(7):
            self.assertEqual(m.get(i), i)

    def test_helpers(self):
        self.assertEqual(two_sum([2, 7, 11, 15], 9), [0, 1])
        self.assertEqual(two_sum([1, 2], 99), [])
        self.assertEqual(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]),
                         [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]])
        self.assertEqual(group_anagrams([]), [])
        self.assertEqual(longest_consecutive([100, 4, 200, 1, 3, 2]), 4)
        self.assertEqual(longest_consecutive([]), 0)


class HashTableRouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(routes.bp)
        self.c.post("/api/hash-table/reset")

    def post(self, op, payload=None):
        return self.c.post("/api/hash-table/" + op, json=payload)

    def test_get_initial(self):
        j = self.c.get("/api/hash-table").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"]["capacity"], 8)
        self.assertEqual(j["state"]["size"], 0)
        self.assertEqual(j["state"]["threshold"], 0.75)

    def test_put_get_remove(self):
        j = self.post("put", {"key": "a", "value": 1}).get_json()
        self.assertEqual(j["result"], {"updated": False, "resized": False})
        j = self.post("put", {"key": "a", "value": 2}).get_json()
        self.assertTrue(j["result"]["updated"])
        self.assertEqual(j["state"]["size"], 1)
        j = self.post("get", {"key": "a"}).get_json()
        self.assertEqual(j["result"], {"found": True, "value": 2})
        j = self.post("get", {"key": "b"}).get_json()
        self.assertEqual(j["result"], {"found": False, "value": None})
        j = self.post("remove", {"key": "a"}).get_json()
        self.assertEqual(j["result"], {"removed": True})
        j = self.post("remove", {"key": "a"}).get_json()
        self.assertEqual(j["result"], {"removed": False})

    def test_int_and_string_keys_differ(self):
        self.post("put", {"key": 5, "value": "i"})
        self.post("put", {"key": "5", "value": "s"})
        self.assertEqual(self.post("get", {"key": 5}).get_json()["result"]["value"], "i")
        self.assertEqual(self.post("get", {"key": "5"}).get_json()["result"]["value"], "s")

    def test_resize_reported(self):
        res = None
        for i in range(7):
            res = self.post("put", {"key": i, "value": i}).get_json()
        self.assertTrue(res["result"]["resized"])
        self.assertEqual(res["state"]["capacity"], 16)

    def test_reset(self):
        self.post("put", {"key": "a", "value": 1})
        j = self.post("reset").get_json()
        self.assertEqual(j["state"]["size"], 0)

    def test_entry_limit(self):
        for i in range(routes.MAX_ENTRIES):
            self.assertEqual(self.post("put", {"key": i, "value": i}).status_code, 200)
        r = self.post("put", {"key": 999, "value": 1})
        self.assertEqual(r.status_code, 400)
        # updating an existing key is still allowed
        self.assertEqual(self.post("put", {"key": 0, "value": 5}).status_code, 200)

    def test_bad_input(self):
        bad = [
            ("put", None), ("put", {}), ("put", {"key": "a"}), ("put", {"value": 1}),
            ("put", {"key": "", "value": 1}), ("put", {"key": True, "value": 1}),
            ("put", {"key": 1.5, "value": 1}), ("put", {"key": [1], "value": 1}),
            ("put", {"key": "a", "value": None}), ("put", {"key": "a", "value": [1]}),
            ("put", {"key": "x" * 500, "value": 1}), ("put", {"key": 10 ** 30, "value": 1}),
            ("put", {"key": "a", "value": "y" * 500}),
            ("get", None), ("get", {}), ("get", {"key": None}),
            ("remove", None), ("remove", {"key": {}}),
            ("two-sum", None), ("two-sum", {"nums": [1], "target": "x"}),
            ("two-sum", {"nums": ["a"], "target": 1}), ("two-sum", {"nums": [True], "target": 1}),
            ("two-sum", {"nums": [1] * 101, "target": 1}),
            ("group-anagrams", None), ("group-anagrams", {"words": [1]}),
            ("group-anagrams", {"words": "abc"}),
            ("longest-consecutive", None), ("longest-consecutive", {"nums": [1.5]}),
        ]
        for op, payload in bad:
            r = self.post(op, payload)
            self.assertEqual(r.status_code, 400, (op, payload))
            j = r.get_json()
            self.assertFalse(j["success"])
            self.assertIn("state", j)

    def test_non_object_and_malformed_body(self):
        self.assertEqual(self.post("put", [1, 2]).status_code, 400)
        r = self.c.post("/api/hash-table/put", data="{not json", content_type="application/json")
        self.assertEqual(r.status_code, 400)

    def test_algorithm_ops(self):
        self.assertEqual(self.post("two-sum", {"nums": [2, 7, 11, 15], "target": 9}).get_json()["result"], [0, 1])
        self.assertEqual(self.post("group-anagrams", {"words": ["eat", "tea", "bat"]}).get_json()["result"],
                         [["eat", "tea"], ["bat"]])
        self.assertEqual(self.post("longest-consecutive", {"nums": [100, 4, 200, 1, 3, 2]}).get_json()["result"], 4)


if __name__ == "__main__":
    unittest.main()
