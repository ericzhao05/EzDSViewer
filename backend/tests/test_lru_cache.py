import unittest

from api.routes import lru_cache_routes as routes
from DataStrcutures.LRUCache import LRUCache
from tests.helpers import client_for


class LRUCacheTests(unittest.TestCase):
    def test_get_missing_returns_minus_one(self):
        self.assertEqual(LRUCache(2).get("x"), -1)

    def test_put_and_get(self):
        c = LRUCache(2)
        c.put(1, "a")
        self.assertEqual(c.get(1), "a")

    def test_evicts_least_recently_used(self):
        c = LRUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        c.put(3, 3)
        self.assertEqual(c.get(1), -1)
        self.assertEqual(c.get(2), 2)

    def test_get_refreshes_recency(self):
        c = LRUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        c.get(1)
        c.put(3, 3)
        self.assertEqual(c.get(2), -1)
        self.assertEqual(c.get(1), 1)

    def test_put_existing_updates_and_refreshes(self):
        c = LRUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        c.put(1, 10)
        self.assertEqual(len(c), 2)
        c.put(3, 3)
        self.assertEqual(c.get(2), -1)
        self.assertEqual(c.get(1), 10)

    def test_capacity_one(self):
        c = LRUCache(1)
        c.put(1, 1)
        c.put(2, 2)
        self.assertEqual(c.get(1), -1)
        self.assertEqual(c.get(2), 2)

    def test_order_is_most_recent_first(self):
        c = LRUCache(3)
        c.put("a", 1)
        c.put("b", 2)
        c.get("a")
        self.assertEqual(c.items(), [("a", 1), ("b", 2)])
        self.assertEqual(c.to_dict()["order"][0], {"key": "a", "value": 1})


class LRUCacheRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = client_for(routes.bp)
        self.client.post("/api/lru-cache/reset")

    def post(self, op, payload=None):
        return self.client.post("/api/lru-cache/" + op, json=payload)

    def test_get_state(self):
        r = self.client.get("/api/lru-cache")
        self.assertEqual(r.status_code, 200)
        j = r.get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"], {"capacity": 3, "size": 0, "order": []})

    def test_put_get_and_eviction(self):
        for k in ("a", "b", "c"):
            self.post("put", {"key": k, "value": 1})
        self.post("get", {"key": "a"})
        j = self.post("put", {"key": "d", "value": 4}).get_json()
        self.assertEqual(j["result"], {"updated": False, "evicted": {"key": "b", "value": 1}})
        self.assertEqual([e["key"] for e in j["state"]["order"]], ["d", "a", "c"])

    def test_put_existing_reports_updated(self):
        self.post("put", {"key": 1, "value": 1})
        j = self.post("put", {"key": 1, "value": 2}).get_json()
        self.assertEqual(j["result"], {"updated": True, "evicted": None})
        self.assertEqual(j["state"]["size"], 1)

    def test_get_hit_and_miss(self):
        self.post("put", {"key": "a", "value": 5})
        self.assertEqual(self.post("get", {"key": "a"}).get_json()["result"], {"found": True, "value": 5})
        self.assertEqual(self.post("get", {"key": "z"}).get_json()["result"], {"found": False, "value": -1})

    def test_capacity_and_reset(self):
        self.post("put", {"key": "a", "value": 1})
        j = self.post("capacity", {"capacity": 5}).get_json()
        self.assertEqual(j["state"], {"capacity": 5, "size": 0, "order": []})
        self.post("reset")
        self.assertEqual(self.client.get("/api/lru-cache").get_json()["state"]["capacity"], 3)

    def test_bad_input(self):
        cases = [
            ("put", {"key": "", "value": 1}),
            ("put", {"key": True, "value": 1}),
            ("put", {"key": "a"}),
            ("put", {"key": "a", "value": 1.5}),
            ("put", {"key": "a", "value": [1]}),
            ("put", {"key": "x" * 41, "value": 1}),
            ("put", {"key": 10 ** 12, "value": 1}),
            ("put", {"key": "a", "value": float("nan")}),
            ("put", None),
            ("put", [1]),
            ("get", {}),
            ("get", {"key": None}),
            ("capacity", {"capacity": 0}),
            ("capacity", {"capacity": 11}),
            ("capacity", {"capacity": "3"}),
            ("capacity", {"capacity": True}),
            ("capacity", {}),
        ]
        for op, payload in cases:
            r = self.post(op, payload)
            self.assertEqual(r.status_code, 400, (op, payload))
            j = r.get_json()
            self.assertFalse(j["success"])
            self.assertIn("order", j["state"])

    def test_malformed_body(self):
        r = self.client.post("/api/lru-cache/put", data="{nope", content_type="application/json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/lru-cache/put")
        self.assertEqual(r.status_code, 400)


if __name__ == "__main__":
    unittest.main()
