import unittest

from DataStrcutures.Stack import ArrayStack, MinStack, daily_temperatures, is_valid_parentheses
from DataStrcutures.StaticArrayStack import StaticArrayStack
from api.routes import stack_routes
from tests.helpers import client_for


class StackClassTests(unittest.TestCase):
    def test_lifo(self):
        s = ArrayStack()
        s.push(1)
        s.push(2)
        self.assertEqual(len(s), 2)
        self.assertEqual(s.peek(), 2)
        self.assertEqual(s.pop(), 2)
        self.assertEqual(s.pop(), 1)

    def test_empty_errors(self):
        s = ArrayStack()
        with self.assertRaises(IndexError):
            s.pop()
        with self.assertRaises(IndexError):
            s.peek()

    def test_static_stack_capacity(self):
        s = StaticArrayStack(1)
        s.push("a")
        with self.assertRaises(Exception):
            s.push("b")

    def test_parentheses(self):
        self.assertTrue(is_valid_parentheses("()[]{}"))
        self.assertTrue(is_valid_parentheses(""))
        self.assertFalse(is_valid_parentheses("(]"))
        self.assertFalse(is_valid_parentheses("(("))
        self.assertFalse(is_valid_parentheses(")"))

    def test_min_stack(self):
        m = MinStack()
        for v in (3, 1, 2):
            m.push(v)
        self.assertEqual(m.get_min(), 1)
        self.assertEqual(m.pop(), 2)
        self.assertEqual(m.pop(), 1)
        self.assertEqual(m.get_min(), 3)

    def test_min_stack_empty(self):
        with self.assertRaises(IndexError):
            MinStack().pop()
        with self.assertRaises(IndexError):
            MinStack().get_min()

    def test_daily_temperatures(self):
        self.assertEqual(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]), [1, 1, 4, 2, 1, 1, 0, 0])
        self.assertEqual(daily_temperatures([]), [])


class StackRouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(stack_routes.bp)
        self.c.post("/api/stack/reset")

    def post(self, op, payload=None):
        r = self.c.post("/api/stack/" + op, json=payload if payload is not None else {})
        return r.status_code, r.get_json()

    def test_get(self):
        r = self.c.get("/api/stack")
        self.assertEqual(r.status_code, 200)
        d = r.get_json()
        self.assertTrue(d["success"])
        self.assertIsNone(d["result"])
        self.assertEqual(d["state"]["items"], [])
        self.assertEqual(d["state"]["capacity"], stack_routes.CAPACITY)

    def test_push_pop_peek(self):
        self.post("push", {"value": "a"})
        code, d = self.post("push", {"value": 5})
        self.assertEqual(code, 200)
        self.assertEqual(d["state"]["items"], ["a", 5])
        self.assertEqual(self.post("peek")[1]["result"], 5)
        code, d = self.post("pop")
        self.assertEqual(d["result"], 5)
        self.assertEqual(d["state"]["items"], ["a"])

    def test_pop_peek_empty(self):
        for op in ("pop", "peek"):
            code, d = self.post(op)
            self.assertEqual(code, 400)
            self.assertFalse(d["success"])
            self.assertEqual(d["state"]["items"], [])

    def test_capacity(self):
        for i in range(stack_routes.CAPACITY):
            self.assertEqual(self.post("push", {"value": i})[0], 200)
        code, d = self.post("push", {"value": 1})
        self.assertEqual(code, 400)
        self.assertEqual(len(d["state"]["items"]), stack_routes.CAPACITY)

    def test_push_bad_input(self):
        for payload in ({}, {"value": None}, {"value": True}, {"value": [1]}, {"value": ""},
                        {"value": "x" * 100}, {"value": 1.5}):
            self.assertEqual(self.post("push", payload)[0], 400, payload)
        r = self.c.post("/api/stack/push", data="not json", content_type="application/json")
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/stack/push", json=[1])
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/stack/push")
        self.assertEqual(r.status_code, 400)

    def test_reset(self):
        self.post("push", {"value": 1})
        self.assertEqual(self.post("reset")[1]["state"]["items"], [])

    def test_valid_parentheses(self):
        self.assertTrue(self.post("valid-parentheses", {"text": "([])"})[1]["result"])
        self.assertFalse(self.post("valid-parentheses", {"text": "(]"})[1]["result"])
        self.assertEqual(self.post("valid-parentheses", {"text": 3})[0], 400)
        self.assertEqual(self.post("valid-parentheses", {"text": "(" * 500})[0], 400)
        self.assertEqual(self.post("valid-parentheses", {})[0], 400)

    def test_min_stack(self):
        code, d = self.post("min-stack", {"values": [3, 1, 2]})
        self.assertEqual(code, 200)
        self.assertEqual(d["result"], [
            {"value": 3, "min": 3}, {"value": 1, "min": 1}, {"value": 2, "min": 1}])
        self.assertEqual(self.post("min-stack", {"values": []})[1]["result"], [])
        for bad in ({"values": "x"}, {"values": [True]}, {"values": ["a"]}, {"values": [1] * 500}, {}):
            self.assertEqual(self.post("min-stack", bad)[0], 400, bad)

    def test_daily_temperatures(self):
        code, d = self.post("daily-temperatures", {"temps": [73, 74, 75, 71, 69, 72, 76, 73]})
        self.assertEqual(d["result"], [1, 1, 4, 2, 1, 1, 0, 0])
        for bad in ({"temps": "x"}, {"temps": [1.5]}, {"temps": [1] * 500}, {}):
            self.assertEqual(self.post("daily-temperatures", bad)[0], 400, bad)


if __name__ == "__main__":
    unittest.main()
