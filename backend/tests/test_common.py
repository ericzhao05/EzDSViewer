import unittest

from flask import Flask

from api.routes._common import body


class BodyTest(unittest.TestCase):
    def parsed(self, **kwargs):
        with Flask(__name__).test_request_context("/", method="POST", **kwargs):
            return body()

    def test_returns_json_objects(self):
        self.assertEqual(self.parsed(json={"value": 1}), {"value": 1})

    def test_non_object_json_counts_as_empty(self):
        for value in ([1], "s", 5, True, None, []):
            self.assertEqual(self.parsed(json=value), {})

    def test_nan_and_malformed_and_missing_bodies_count_as_empty(self):
        for raw in (b"NaN", b"{not json", b""):
            self.assertEqual(self.parsed(data=raw, content_type="application/json"), {})
        self.assertEqual(self.parsed(), {})


if __name__ == "__main__":
    unittest.main()
