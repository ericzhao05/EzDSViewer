import itertools
import json
import random
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


def dead_branches(trie):
    """Paths of non-root nodes that serve no word: a leaf must always be a word."""
    out = []

    def walk(node, path):
        if not node.children and not node.is_word and path:
            out.append(path)
        for ch, child in node.children.items():
            walk(child, path + ch)

    walk(trie.root, "")
    return out


class TrieDeleteTests(unittest.TestCase):
    def make(self, *words):
        t = Trie()
        for w in words:
            t.insert(w)
        return t

    def check(self, t, expected):
        self.assertEqual(t.words(), sorted(expected))
        self.assertEqual(dead_branches(t), [])

    def test_delete_returns_true_and_removes(self):
        t = self.make("cat", "dog")
        self.assertTrue(t.delete("cat"))
        self.assertFalse(t.search("cat"))
        self.assertFalse(t.starts_with("c"))
        self.check(t, ["dog"])

    def test_delete_prefix_word_keeps_the_longer_word(self):
        t = self.make("car", "card")
        self.assertTrue(t.delete("car"))
        self.assertFalse(t.search("car"))
        self.assertTrue(t.search("card"))
        self.assertTrue(t.starts_with("car"))
        self.check(t, ["card"])

    def test_delete_longer_word_keeps_its_prefix_word(self):
        t = self.make("car", "card")
        self.assertTrue(t.delete("card"))
        self.assertFalse(t.search("card"))
        self.assertFalse(t.starts_with("card"))
        self.assertTrue(t.search("car"))
        self.assertEqual(t.matched_length("card"), 3)
        self.check(t, ["car"])

    def test_delete_keeps_siblings_sharing_a_prefix(self):
        t = self.make("card", "care", "cat")
        self.assertTrue(t.delete("card"))
        self.check(t, ["care", "cat"])
        self.assertTrue(t.delete("care"))
        self.assertFalse(t.starts_with("car"))
        self.assertTrue(t.starts_with("ca"))
        self.check(t, ["cat"])

    def test_pruning_stops_at_a_word_node(self):
        t = self.make("a", "abcd")
        self.assertTrue(t.delete("abcd"))
        self.assertEqual(t.matched_length("abcd"), 1)
        self.check(t, ["a"])

    def test_absent_word_changes_nothing(self):
        t = self.make("car", "card")
        before = t.to_dict()
        for word in ["cat", "cards", "x", "zzzz", "CAR"]:
            self.assertFalse(t.delete(word), word)
            self.assertEqual(t.to_dict(), before, word)

    def test_mere_prefix_changes_nothing(self):
        t = self.make("card")
        before = t.to_dict()
        for word in ["c", "ca", "car"]:
            self.assertFalse(t.delete(word), word)
            self.assertEqual(t.to_dict(), before, word)
        self.assertTrue(t.search("card"))

    def test_delete_twice(self):
        t = self.make("cat")
        self.assertTrue(t.delete("cat"))
        self.assertFalse(t.delete("cat"))

    def test_delete_last_word_empties_the_tree(self):
        t = self.make("cat")
        t.delete("cat")
        self.assertEqual(t.to_dict(), {"char": "", "is_word": False, "children": []})
        self.assertFalse(t.starts_with("c"))
        self.assertFalse(t.delete("cat"))
        t.insert("cat")
        self.assertTrue(t.search("cat"))

    def test_empty_trie_and_empty_string(self):
        t = Trie()
        self.assertFalse(t.delete("a"))
        self.assertFalse(t.delete(""))
        t.insert("a")
        self.assertFalse(t.delete(""))
        t.insert("")
        self.assertTrue(t.search(""))
        self.assertTrue(t.delete(""))
        self.assertFalse(t.search(""))
        self.assertTrue(t.search("a"))
        self.assertEqual(dead_branches(t), [])

    def test_very_long_word_does_not_hit_the_recursion_limit(self):
        word = "a" * 50000
        t = self.make(word)
        self.assertTrue(t.delete(word))
        self.assertEqual(t.root.children, {})

    def test_randomized_against_a_set(self):
        vocabulary = ["".join(p) for n in range(1, 5) for p in itertools.product("ab", repeat=n)]
        vocabulary += ["abc", "abcd", "abd", "ba", "bac", "c", "ca", "cab"]
        for seed in range(25):
            rng = random.Random(seed)
            t = Trie()
            model = set()
            for _ in range(300):
                w = rng.choice(vocabulary)
                if rng.random() < 0.5:
                    t.insert(w)
                    model.add(w)
                else:
                    self.assertEqual(t.delete(w), w in model, w)
                    model.discard(w)
                    self.assertEqual(dead_branches(t), [], w)
                self.assertEqual(t.words(), sorted(model))
                for probe in vocabulary:
                    self.assertEqual(t.search(probe), probe in model)
                    self.assertEqual(t.starts_with(probe), any(m.startswith(probe) for m in model))


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

    def get_state(self):
        return self.c.get("/api/trie").get_json()["state"]

    def live_dead_branches(self):
        return dead_branches(trie_routes.trie)

    def test_delete_prunes_and_reports(self):
        s, j = self.post("delete", {"word": "dog"})
        self.assertEqual(s, 200)
        self.assertTrue(j["success"])
        self.assertEqual(j["result"], {"word": "dog", "deleted": True, "pruned": 1, "matched": 2})
        self.assertNotIn("dog", j["state"]["words"])
        self.assertIn("do", j["state"]["words"])
        self.assertFalse(self.post("search", {"word": "dog"})[1]["result"]["found"])
        self.assertEqual(self.live_dead_branches(), [])

    def test_delete_prefix_word_keeps_longer_words(self):
        s, j = self.post("delete", {"word": "car"})
        self.assertEqual(s, 200)
        self.assertEqual(j["result"], {"word": "car", "deleted": True, "pruned": 0, "matched": 3})
        self.assertEqual(j["state"]["words"], ["card", "care", "cat", "do", "dog"])
        self.assertTrue(self.post("search", {"word": "card"})[1]["result"]["found"])

    def test_delete_longer_word_keeps_prefix_word(self):
        _, j = self.post("delete", {"word": "card"})
        self.assertEqual(j["result"], {"word": "card", "deleted": True, "pruned": 1, "matched": 3})
        self.assertIn("car", j["state"]["words"])
        self.assertTrue(self.post("search", {"word": "car"})[1]["result"]["found"])

    def test_delete_prunes_a_whole_branch(self):
        self.post("insert", {"word": "zebra"})
        _, j = self.post("delete", {"word": "zebra"})
        self.assertEqual(j["result"], {"word": "zebra", "deleted": True, "pruned": 5, "matched": 0})
        self.assertNotIn("z", [c["char"] for c in j["state"]["tree"]["children"]])

    def test_delete_normalizes_like_insert(self):
        _, j = self.post("delete", {"word": "  DoG "})
        self.assertEqual(j["result"]["word"], "dog")
        self.assertTrue(j["result"]["deleted"])

    def test_delete_absent_word_is_a_clear_result(self):
        before = self.get_state()
        for word, matched in [("zebra", 0), ("cars", 3), ("ca", 2), ("c", 1)]:
            s, j = self.post("delete", {"word": word})
            self.assertEqual(s, 200, word)
            self.assertTrue(j["success"])
            self.assertEqual(j["result"], {"word": word, "deleted": False, "pruned": 0, "matched": matched})
            self.assertEqual(j["state"], before)

    def test_delete_twice_and_reinsert(self):
        self.assertTrue(self.post("delete", {"word": "cat"})[1]["result"]["deleted"])
        self.assertFalse(self.post("delete", {"word": "cat"})[1]["result"]["deleted"])
        self.assertTrue(self.post("insert", {"word": "cat"})[1]["result"]["added"])
        self.assertIn("cat", self.get_state()["words"])

    def test_delete_everything_then_reset(self):
        for w in list(self.get_state()["words"]):
            self.assertTrue(self.post("delete", {"word": w})[1]["result"]["deleted"])
        state = self.get_state()
        self.assertEqual(state["words"], [])
        self.assertEqual(state["tree"]["children"], [])
        self.assertEqual(self.post("autocomplete", {"prefix": ""})[1]["result"]["count"], 0)
        self.assertEqual(len(self.post("reset")[1]["state"]["words"]), len(trie_routes.DEFAULT))

    def test_delete_frees_room_at_the_word_limit(self):
        names = ["".join(p) for p in itertools.islice(itertools.product("xyz", repeat=4), 40)]
        for w in names:
            self.post("insert", {"word": w})
        self.assertEqual(len(self.get_state()["words"]), trie_routes.MAX_WORDS)
        self.assertEqual(self.post("insert", {"word": "qqqq"})[0], 400)
        self.assertEqual(self.post("delete", {"word": "car"})[0], 200)
        self.assertEqual(self.post("insert", {"word": "qqqq"})[0], 200)

    def test_delete_bad_input_leaves_state_unchanged(self):
        before = self.get_state()
        for bad in [None, True, False, 0, 5, 1.5, 10 ** 30, -(10 ** 30), "", " ", "a1", "a b", "\ud800", "ca\ud800r",
                    "x" * 17, "x" * 200000, [], ["car"], {}, {"word": "car"}]:
            r = self.c.post("/api/trie/delete", data=json.dumps({"word": bad}), content_type="application/json")
            j = r.get_json()
            self.assertEqual(r.status_code, 400, repr(bad)[:40])
            self.assertFalse(j["success"])
            self.assertIn("letters", j["error"])
            self.assertEqual(j["state"], before)
            self.assertEqual(self.get_state(), before)

    def test_delete_malformed_or_missing_body(self):
        before = self.get_state()
        for raw in ("", "{bad", "[1]", "null", "5", '"car"', "NaN", '{"word": NaN}', "[" * 50000, '{"prefix": "car"}'):
            r = self.c.post("/api/trie/delete", data=raw, content_type="application/json")
            self.assertEqual(r.status_code, 400, raw[:12])
            self.assertEqual(r.get_json()["state"], before)
        r = self.c.post("/api/trie/delete")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.get_json()["state"], before)

    def test_randomized_routes_against_a_set(self):
        rng = random.Random(99)
        vocabulary = ["".join(p) for n in range(1, 5) for p in itertools.product("abc", repeat=n)]
        for _ in range(4):
            self.post("reset")
            model = set(trie_routes.DEFAULT)
            for _ in range(200):
                w = rng.choice(vocabulary + list(trie_routes.DEFAULT))
                if rng.random() < 0.45 and (w in model or len(model) < trie_routes.MAX_WORDS):
                    self.assertEqual(self.post("insert", {"word": w})[1]["result"]["added"], w not in model)
                    model.add(w)
                else:
                    s, j = self.post("delete", {"word": w})
                    self.assertEqual(s, 200)
                    self.assertEqual(j["result"]["deleted"], w in model)
                    model.discard(w)
                    self.assertEqual(self.live_dead_branches(), [], w)
                state = self.get_state()
                self.assertEqual(state["words"], sorted(model))
                self.assertEqual(trie_routes.trie.words(), sorted(model))


if __name__ == "__main__":
    unittest.main()
