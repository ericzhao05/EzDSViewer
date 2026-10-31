import unittest
from urllib.parse import parse_qs, urlparse

from commands.engine import run
from wsgi import MAX_RUNS_PER_MINUTE, create_app


class PublicAppTest(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_run_works(self):
        res = self.client.get("/api/run?cmd=array.append(1)")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["result"], 1)

    def test_shared_state_routes_and_debug_routes_are_gone(self):
        for path in ("/api/array", "/api/stack", "/routes", "/api/data", "/api/test"):
            self.assertEqual(self.client.get(path).status_code, 404, path)
        self.assertEqual(self.client.post("/api/stack/push", json={"value": 1}).status_code, 404)
        self.assertEqual(self.client.post("/api/process", json={"input": "x"}).status_code, 404)

    def test_no_cors_header(self):
        res = self.client.get("/api/run?cmd=array", headers={"Origin": "https://example.com"})
        self.assertNotIn("Access-Control-Allow-Origin", res.headers)

    def test_home_redirects_to_a_working_example(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 302)
        target = urlparse(res.headers["Location"])
        self.assertEqual(target.path, "/v")
        self.assertTrue(run(parse_qs(target.query)["c"][0])["success"])

    def test_limit_returns_json_with_retry_after(self):
        for _ in range(MAX_RUNS_PER_MINUTE):
            self.assertEqual(self.client.get("/api/run?cmd=array").status_code, 200)
        res = self.client.get("/api/run?cmd=array")
        self.assertEqual(res.status_code, 429)
        self.assertFalse(res.get_json()["success"])
        self.assertIn("Too many requests", res.get_json()["error"])
        self.assertIn("Retry-After", res.headers)

    def test_limit_is_per_visitor_using_the_forwarded_address(self):
        one = {"X-Forwarded-For": "203.0.113.1"}
        two = {"X-Forwarded-For": "203.0.113.2"}
        for _ in range(MAX_RUNS_PER_MINUTE):
            self.client.get("/api/run?cmd=array", headers=one)
        self.assertEqual(self.client.get("/api/run?cmd=array", headers=one).status_code, 429)
        self.assertEqual(self.client.get("/api/run?cmd=array", headers=two).status_code, 200)

    def test_limit_applies_only_to_run(self):
        for _ in range(MAX_RUNS_PER_MINUTE + 1):
            self.client.get("/api/run?cmd=array")
        self.assertEqual(self.client.get("/").status_code, 302)

    def test_limit_resets_in_the_next_minute(self):
        now = [1000.0]
        client = create_app(clock=lambda: now[0]).test_client()
        for _ in range(MAX_RUNS_PER_MINUTE + 1):
            client.get("/api/run?cmd=array")
        now[0] += 60
        self.assertEqual(client.get("/api/run?cmd=array").status_code, 200)


if __name__ == "__main__":
    unittest.main()
