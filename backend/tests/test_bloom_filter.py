import unittest

from DataStrcutures.BloomFilter import BloomFilter
from api.routes import bloom_filter_routes as r
from tests.helpers import client_for


class ClassTests(unittest.TestCase):
    def test_no_false_negatives(self):
        bf = BloomFilter(64, 3)
        words = [f"word{i}" for i in range(30)]
        for w in words:
            bf.add(w)
        self.assertTrue(all(w in bf for w in words))

    def test_empty_contains_nothing(self):
        bf = BloomFilter()
        self.assertFalse(bf.might_contain("a"))
        self.assertEqual(bf.bits_set(), 0)
        self.assertEqual(bf.false_positive_rate(), 0.0)

    def test_positions_deterministic_and_in_range(self):
        bf = BloomFilter(16, 4)
        p = bf.positions("hello")
        self.assertEqual(p, bf.positions("hello"))
        self.assertEqual(len(p), 4)
        self.assertTrue(all(0 <= i < 16 for i in p))

    def test_add_sets_exactly_its_positions(self):
        bf = BloomFilter(32, 3)
        pos = bf.add("x")
        self.assertEqual({i for i, b in enumerate(bf.bits) if b}, set(pos))

    def test_false_positive_possible_when_saturated(self):
        bf = BloomFilter(8, 2)
        for i in range(100):
            bf.add(str(i))
        self.assertTrue(bf.might_contain("never-added"))
        self.assertGreater(bf.false_positive_rate(), 0.9)

    def test_single_bit_filter(self):
        bf = BloomFilter(1, 1)
        bf.add("a")
        self.assertTrue(bf.might_contain("b"))

    def test_invalid_construction(self):
        for args in [(0, 1), (-1, 1), (8, 0), (True, 1), (8, "x")]:
            with self.assertRaises(ValueError):
                BloomFilter(*args)


class RouteTests(unittest.TestCase):
    def setUp(self):
        r._reset()
        self.c = client_for(r.bp)

    def post(self, op, payload=None):
        return self.c.post(f"/api/bloom-filter/{op}", json=payload)

    def test_get_state(self):
        d = self.c.get("/api/bloom-filter").get_json()
        self.assertTrue(d["success"])
        self.assertEqual(d["state"]["bits"], [0] * 32)
        self.assertIsNone(d["result"])

    def test_add_then_check(self):
        res = self.post("add", {"item": "apple"}).get_json()
        self.assertEqual(len(res["result"]["positions"]), 3)
        self.assertEqual(res["state"]["added"], ["apple"])
        self.assertEqual(res["state"]["count"], 1)
        chk = self.post("check", {"item": "apple"}).get_json()["result"]
        self.assertTrue(chk["possibly_present"])
        self.assertTrue(chk["actually_added"])
        self.assertFalse(chk["false_positive"])

    def test_check_absent(self):
        chk = self.post("check", {"item": "ghost"}).get_json()["result"]
        self.assertFalse(chk["possibly_present"])
        self.assertFalse(chk["false_positive"])

    def test_false_positive_flagged(self):
        self.post("configure", {"size": 8, "num_hashes": 2})
        for i in range(60):
            self.post("add", {"item": f"i{i}"})
        chk = self.post("check", {"item": "absent"}).get_json()["result"]
        self.assertTrue(chk["possibly_present"])
        self.assertTrue(chk["false_positive"])

    def test_configure_and_reset(self):
        s = self.post("configure", {"size": 16, "num_hashes": 2}).get_json()["state"]
        self.assertEqual((s["size"], s["num_hashes"], len(s["bits"])), (16, 2, 16))
        self.post("add", {"item": "a"})
        s = self.post("reset").get_json()["state"]
        self.assertEqual((s["size"], s["count"], s["added"]), (32, 0, []))

    def test_bad_input(self):
        cases = [
            ("add", None), ("add", {}), ("add", {"item": ""}), ("add", {"item": 5}),
            ("add", {"item": "x" * 101}), ("check", {"item": None}), ("check", {}),
            ("configure", {"size": 7, "num_hashes": 2}),
            ("configure", {"size": 129, "num_hashes": 2}),
            ("configure", {"size": 16, "num_hashes": 0}),
            ("configure", {"size": 16, "num_hashes": 9}),
            ("configure", {"size": "16", "num_hashes": 2}),
            ("configure", {"size": True, "num_hashes": 2}),
            ("configure", {"size": 16.5, "num_hashes": 2}),
            ("configure", {}),
        ]
        for op, payload in cases:
            resp = self.post(op, payload)
            self.assertEqual(resp.status_code, 400, (op, payload))
            self.assertFalse(resp.get_json()["success"])
            self.assertIn("bits", resp.get_json()["state"])

    def test_non_json_body_and_nan(self):
        resp = self.c.post("/api/bloom-filter/add", data="nope", content_type="text/plain")
        self.assertEqual(resp.status_code, 400)
        resp = self.c.post("/api/bloom-filter/configure", data='{"size": NaN, "num_hashes": 2}',
                           content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_add_limit(self):
        for _ in range(r.MAX_ADDS):
            self.assertEqual(self.post("add", {"item": "a"}).status_code, 200)
        self.assertEqual(self.post("add", {"item": "a"}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
