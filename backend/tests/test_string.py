import unittest

from DataStrcutures.StringAlgos import (
    is_anagram,
    is_palindrome,
    longest_unique_substring,
    longest_unique_window,
)
from api.routes import string_routes
from api.routes.string_routes import bp
from flask import Blueprint, Flask


def make_client():
    # Mirror ds_routes.py: bp (url_prefix=/string) nested in a parent mounted at /api.
    # tests.helpers.client_for would override bp's own prefix with /api.
    parent = Blueprint("test_ds_api", __name__)
    parent.register_blueprint(bp)
    app = Flask(__name__)
    app.register_blueprint(parent, url_prefix="/api")
    return app.test_client()


class StringAlgosTest(unittest.TestCase):
    def test_anagram(self):
        self.assertTrue(is_anagram("listen", "silent"))
        self.assertFalse(is_anagram("aab", "abb"))
        self.assertFalse(is_anagram("a", "aa"))
        self.assertTrue(is_anagram("", ""))

    def test_palindrome(self):
        self.assertTrue(is_palindrome(""))
        self.assertTrue(is_palindrome("a"))
        self.assertTrue(is_palindrome("abba"))
        self.assertTrue(is_palindrome("aaa"))
        self.assertFalse(is_palindrome("abca"))

    def test_longest_unique(self):
        self.assertEqual(longest_unique_substring(""), 0)
        self.assertEqual(longest_unique_substring("a"), 1)
        self.assertEqual(longest_unique_substring("aaaa"), 1)
        self.assertEqual(longest_unique_substring("abcabcbb"), 3)
        self.assertEqual(longest_unique_substring("pwwkew"), 3)
        self.assertEqual(longest_unique_substring("abba"), 2)

    def test_window_matches_length(self):
        for text in ["", "a", "aaaa", "abcabcbb", "pwwkew", "abba", "dvdf"]:
            length, start = longest_unique_window(text)
            self.assertEqual(length, longest_unique_substring(text))
            window = text[start:start + length]
            self.assertEqual(len(set(window)), len(window))


class StringRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = make_client()
        self.client.post("/api/string/reset")

    def post(self, op, payload=None):
        return self.client.post(f"/api/string/{op}", json=payload)

    def test_get(self):
        data = self.client.get("/api/string").get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["state"], {"text": "abcabcbb"})
        self.assertIsNone(data["result"])

    def test_set_and_reset(self):
        data = self.post("set", {"text": "hello"}).get_json()
        self.assertEqual(data["state"]["text"], "hello")
        self.assertEqual(self.post("set", {"text": ""}).get_json()["state"]["text"], "")
        data = self.post("reset").get_json()
        self.assertEqual(data["state"]["text"], "abcabcbb")

    def test_palindrome(self):
        self.post("set", {"text": "racecar"})
        self.assertTrue(self.post("is_palindrome").get_json()["result"])
        self.post("set", {"text": "ab"})
        self.assertFalse(self.post("is_palindrome").get_json()["result"])

    def test_anagram(self):
        self.post("set", {"text": "listen"})
        self.assertTrue(self.post("is_anagram", {"other": "silent"}).get_json()["result"])
        self.assertFalse(self.post("is_anagram", {"other": "silence"}).get_json()["result"])

    def test_longest_unique(self):
        data = self.post("longest_unique_substring").get_json()
        self.assertEqual(data["result"], {"length": 3, "start": 0, "substring": "abc"})
        self.post("set", {"text": ""})
        data = self.post("longest_unique_substring").get_json()
        self.assertEqual(data["result"]["length"], 0)

    def test_bad_input(self):
        cases = [
            ("set", None),
            ("set", {}),
            ("set", {"text": 5}),
            ("set", {"text": None}),
            ("set", {"text": "x" * (string_routes.MAX_LEN + 1)}),
            ("is_anagram", {}),
            ("is_anagram", {"other": 3}),
            ("is_anagram", {"other": "x" * (string_routes.MAX_LEN + 1)}),
        ]
        for op, payload in cases:
            resp = self.post(op, payload)
            self.assertEqual(resp.status_code, 400, (op, payload))
            data = resp.get_json()
            self.assertFalse(data["success"])
            self.assertEqual(data["state"], {"text": "abcabcbb"})

    def test_malformed_json(self):
        resp = self.client.post("/api/string/set", data="{nope", content_type="application/json")
        self.assertEqual(resp.status_code, 400)
        resp = self.client.post("/api/string/set", data="[1]", content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_max_length_accepted(self):
        text = "a" * string_routes.MAX_LEN
        self.assertEqual(self.post("set", {"text": text}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
