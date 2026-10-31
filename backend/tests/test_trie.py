import unittest

from DataStrcutures.Trie import Trie
from api.routes import trie_routes
from api.routes.trie_routes import bp
from tests.helpers import client_for


class TrieTests(unittest.TestCase):
    def test_basic(self):
        t = Trie()
        for w in ["apple", "app", "bat"]:
            t.insert(w)
        self.assertTrue(t.search("app"))
        self.assertFalse(t.search("appl"))
        self.assertTrue(t.starts_with("appl"))
        self.assertFalse(t.starts_with("c"))
        self.assertTrue(t.starts_with(""))
        self.assertFalse(t.search("apples"))

    def test_helpers(self):
        t = Trie()
        for w in ["card", "car", "cat"]:
            t.insert(w)
        self.assertEqual(t.words("ca"), ["car", "card", "cat"])
        self.assertEqual(t.words("x"), [])
        self.assertEqual(t.matched_length("cab"), 2)
        self.assertEqual(t.to_dict()["children"][0]["char"], "c")


class RouteTests(unittest.TestCase):
    def setUp(self):
        trie_routes._reset()
        self.c = client_for(bp)

    def post(self, op, data=None):
        r = self.c.post(f"/api/trie/{op}", json=data)
        return r.status_code, r.get_json()

    def test_get(self):
        j = self.c.get("/api/trie").get_json()
        self.assertTrue(j["success"])
        self.assertIn("car", j["state"]["words"])
        self.assertIsNone(j["result"])

    def test_insert_search(self):
        s, j = self.post("insert", {"word": "Cart"})
        self.assertEqual(s, 200)
        self.assertEqual(j["result"], {"word": "cart", "added": True, "matched": 0 + 3})
        self.assertIn("cart", j["state"]["words"])
        self.assertTrue(self.post("search", {"word": "cart"})[1]["result"]["found"])
        r = self.post("search", {"word": "ca"})[1]["result"]
        self.assertEqual((r["found"], r["matched"]), (False, 2))

    def test_insert_duplicate(self):
        _, j = self.post("insert", {"word": "car"})
        self.assertFalse(j["result"]["added"])
        self.assertEqual(j["state"]["words"].count("car"), 1)

    def test_starts_with_and_autocomplete(self):
        r = self.post("starts-with", {"prefix": "ca"})[1]["result"]
        self.assertTrue(r["found"])
        self.assertFalse(self.post("starts-with", {"prefix": "zz"})[1]["result"]["found"])
        r = self.post("autocomplete", {"prefix": "car"})[1]["result"]
        self.assertEqual(r["words"], ["car", "card", "care"])
        self.assertEqual(r["count"], 3)
        self.assertEqual(self.post("autocomplete", {"prefix": ""})[1]["result"]["count"], 6)

    def test_reset(self):
        self.post("insert", {"word": "zebra"})
        j = self.post("reset")[1]
        self.assertNotIn("zebra", j["state"]["words"])

    def test_bad_input(self):
        for op, data in [
            ("insert", {}), ("insert", {"word": ""}), ("insert", {"word": 5}),
            ("insert", {"word": "a b"}), ("insert", {"word": "a1"}), ("insert", {"word": "x" * 17}),
            ("insert", None), ("insert", [1]), ("search", {"word": None}),
            ("starts-with", {"prefix": ""}), ("autocomplete", {"prefix": "1"}),
            ("autocomplete", {"prefix": ["a"]}),
        ]:
            s, j = self.post(op, data)
            self.assertEqual(s, 400, (op, data))
            self.assertFalse(j["success"])
            self.assertIn("tree", j["state"])
        r = self.c.post("/api/trie/insert", data="{bad", content_type="application/json")
        self.assertEqual(r.status_code, 400)

    def test_word_limit(self):
        for i in range(trie_routes.MAX_WORDS):
            s, _ = self.post("insert", {"word": "w" + "a" * (i % 5) + "b" * (i // 5)})
            if s == 400:
                break
        s, j = self.post("insert", {"word": "qqqqq"})
        self.assertEqual(s, 400)
        self.assertEqual(len(j["state"]["words"]), trie_routes.MAX_WORDS)


if __name__ == "__main__":
    unittest.main()
