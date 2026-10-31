import unittest

from app import app


class AppRoutesTest(unittest.TestCase):
    def test_app_starts_and_serves_registered_structures(self):
        client = app.test_client()
        self.assertEqual(client.get("/api/stack").status_code, 200)
        self.assertEqual(client.get("/api/queue").status_code, 200)


if __name__ == "__main__":
    unittest.main()
