import unittest

from api.routes import run_routes
from tests.helpers import client_for


class RunRouteTest(unittest.TestCase):
    def setUp(self):
        self.client = client_for(run_routes.bp)

    def test_success(self):
        res = self.client.get("/api/run", query_string={"cmd": "array.append(1)"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["calls"], ["append(1)"])

    def test_failure_is_400_json(self):
        res = self.client.get("/api/run", query_string={"cmd": "array.pop()"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["code"], "runtime_error")

    def test_missing_cmd(self):
        res = self.client.get("/api/run")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["code"], "missing_command")

    def test_hostile_input_never_500(self):
        for cmd in (
            "array.__class__()",
            "array.handler()",
            "array" + ".append(1)" * 65,
            'array.append("<script>alert(1)</script>")',
            "(" * 5000,
            "array.append([[[[1]]]])",
        ):
            res = self.client.get("/api/run", query_string={"cmd": cmd})
            self.assertIn(res.status_code, (200, 400), cmd[:30])
            self.assertIsNotNone(res.get_json())

    def test_identical_requests_identical_json(self):
        q = {"cmd": "array.append(1).append(2).append(3)"}
        a = self.client.get("/api/run", query_string=q).get_data()
        b = self.client.get("/api/run", query_string=q).get_data()
        self.assertEqual(a, b)

    def test_post_not_allowed(self):
        self.assertEqual(self.client.post("/api/run").status_code, 405)

    def test_registered_in_app(self):
        from app import app

        res = app.test_client().get("/api/run", query_string={"cmd": "array"})
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
