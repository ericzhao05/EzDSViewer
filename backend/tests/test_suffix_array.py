import random
import unittest

from DataStrcutures.SuffixArray import SuffixArray
from api.routes import suffix_array_routes as r
from tests.helpers import client_for


def brute_positions(text, p):
    return [i for i in range(len(text)) if text.startswith(p, i)]


class ClassTests(unittest.TestCase):
    def test_banana(self):
        s = SuffixArray("banana")
        self.assertEqual(s.sa, [5, 3, 1, 0, 4, 2])
        self.assertEqual(s.lcp, [0, 1, 3, 0, 0, 2])
        self.assertEqual(s.suffixes()[0], "a")
        self.assertEqual(s.longest_repeated_substring(), "ana")

    def test_empty_and_single(self):
        e = SuffixArray("")
        self.assertEqual((e.sa, e.lcp, e.search("a"), e.longest_repeated_substring()), ([], [], [], ""))
        s = SuffixArray("x")
        self.assertEqual(s.sa, [0])
        self.assertEqual(s.search("x"), [0])

    def test_matches_brute_force(self):
        rng = random.Random(7)
        for _ in range(300):
            text = "".join(rng.choice("abc") for _ in range(rng.randint(0, 25)))
            s = SuffixArray(text)
            expected = sorted(range(len(text)), key=lambda i: text[i:])
            self.assertEqual(s.sa, expected)
            for i in range(1, len(text)):
                a, b = text[expected[i - 1]:], text[expected[i]:]
                k = 0
                while k < min(len(a), len(b)) and a[k] == b[k]:
                    k += 1
                self.assertEqual(s.lcp[i], k)
            for _ in range(8):
                p = "".join(rng.choice("abc") for _ in range(rng.randint(1, 4)))
                self.assertEqual(s.search(p), brute_positions(text, p))
                self.assertEqual(s.count(p), len(brute_positions(text, p)))

    def test_overlapping_and_missing(self):
        s = SuffixArray("aaaa")
        self.assertEqual(s.search("aa"), [0, 1, 2])
        self.assertEqual(s.search("b"), [])
        self.assertEqual(s.search("aaaaa"), [])


class RouteTests(unittest.TestCase):
    def setUp(self):
        r.sa.set_text(r.DEFAULT_TEXT)
        self.c = client_for(r.bp)

    def post(self, op, data=None):
        return self.c.post(f"/api/suffix-array/{op}", json=data)

    def test_get_and_reset(self):
        j = self.c.get("/api/suffix-array").get_json()
        self.assertTrue(j["success"])
        self.assertEqual(j["state"]["sa"], [5, 3, 1, 0, 4, 2])
        self.post("build", {"text": "abc"})
        self.assertEqual(self.post("reset").get_json()["state"]["text"], "banana")

    def test_build(self):
        j = self.post("build", {"text": "mississippi"}).get_json()
        self.assertEqual(j["state"]["sa"], [10, 7, 4, 1, 0, 9, 8, 6, 3, 5, 2])
        self.assertEqual(j["result"]["length"], 11)

    def test_search_count_longest(self):
        j = self.post("search", {"pattern": "an"}).get_json()
        self.assertEqual(j["result"]["positions"], [1, 3])
        self.assertEqual(j["result"]["range"], [1, 3])
        self.assertEqual(self.post("count", {"pattern": "a"}).get_json()["result"]["count"], 3)
        self.assertEqual(self.post("search", {"pattern": "zz"}).get_json()["result"]["positions"], [])
        self.assertEqual(self.post("longest-repeated").get_json()["result"]["substring"], "ana")

    def test_bad_input(self):
        cases = [
            ("build", None), ("build", {}), ("build", {"text": 5}), ("build", {"text": ""}),
            ("build", {"text": "x" * (r.MAX_TEXT_LEN + 1)}),
            ("search", {}), ("search", {"pattern": ""}), ("search", {"pattern": None}),
            ("search", {"pattern": "x" * (r.MAX_PATTERN_LEN + 1)}),
            ("count", {"pattern": 3}), ("build", {"text": "\ud800"}),
        ]
        for op, data in cases:
            with self.subTest(op=op, data=data):
                resp = self.post(op, data)
                self.assertEqual(resp.status_code, 400)
                self.assertFalse(resp.get_json()["success"])
                self.assertIn("sa", resp.get_json()["state"])

    def test_malformed_body(self):
        resp = self.c.post("/api/suffix-array/search", data="{nope", content_type="application/json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self.c.post("/api/suffix-array/build", data="[1]", content_type="application/json").status_code, 400)

    def test_max_length_text_ok(self):
        resp = self.post("build", {"text": "ab" * (r.MAX_TEXT_LEN // 2)})
        self.assertEqual(resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
