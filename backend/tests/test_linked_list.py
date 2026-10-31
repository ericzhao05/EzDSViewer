import unittest

from api.routes import linked_list_routes as routes
from DataStrcutures.LinkedList import (
    LinkedList,
    ListNode,
    from_list,
    has_cycle,
    merge_sorted,
    middle_node,
    remove_nth_from_end,
    reverse_list,
)
from tests.helpers import client_for


def to_values(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


class AlgoTests(unittest.TestCase):
    def test_reverse(self):
        self.assertEqual(to_values(reverse_list(from_list([1, 2, 3]))), [3, 2, 1])
        self.assertIsNone(reverse_list(None))
        self.assertEqual(to_values(reverse_list(from_list([1]))), [1])

    def test_has_cycle(self):
        self.assertFalse(has_cycle(None))
        self.assertFalse(has_cycle(from_list([1, 2, 3])))
        head = from_list([1, 2, 3])
        head.next.next.next = head.next
        self.assertTrue(has_cycle(head))
        one = ListNode(1)
        one.next = one
        self.assertTrue(has_cycle(one))

    def test_middle(self):
        self.assertEqual(middle_node(from_list([1, 2, 3])).val, 2)
        self.assertEqual(middle_node(from_list([1, 2, 3, 4])).val, 3)
        self.assertIsNone(middle_node(None))

    def test_merge(self):
        merged = merge_sorted(from_list([1, 3, 5]), from_list([2, 4]))
        self.assertEqual(to_values(merged), [1, 2, 3, 4, 5])
        self.assertEqual(to_values(merge_sorted(None, from_list([1]))), [1])
        self.assertIsNone(merge_sorted(None, None))

    def test_remove_nth(self):
        self.assertEqual(to_values(remove_nth_from_end(from_list([1, 2, 3]), 1)), [1, 2])
        self.assertEqual(to_values(remove_nth_from_end(from_list([1, 2, 3]), 3)), [2, 3])
        self.assertIsNone(remove_nth_from_end(from_list([1]), 1))


class ClassTests(unittest.TestCase):
    def test_ops(self):
        l = LinkedList()
        l.push_back(2)
        l.push_front(1)
        l.insert(2, 4)
        l.insert(2, 3)
        self.assertEqual(l.to_list(), [1, 2, 3, 4])
        self.assertEqual(l.delete(0), 1)
        self.assertEqual(l.delete(2), 4)
        self.assertEqual(l.find(3), 1)
        self.assertEqual(l.find(99), -1)
        with self.assertRaises(IndexError):
            l.insert(5, 0)
        with self.assertRaises(IndexError):
            l.delete(2)

    def test_cycle_safe_state(self):
        l = LinkedList([1, 2, 3])
        l.make_cycle(1)
        self.assertEqual(l.to_dict(), {"values": [1, 2, 3], "length": 3, "cycle_to": 1})
        l.break_cycle()
        self.assertIsNone(l.cycle_to())


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(routes.bp)
        self.c.post("/api/linked-list/reset")

    def post(self, op, payload=None):
        r = self.c.post("/api/linked-list/" + op, json=payload if payload is not None else {})
        return r.status_code, r.get_json()

    def values(self):
        return self.c.get("/api/linked-list").get_json()["state"]["values"]

    def test_get_and_reset(self):
        j = self.c.get("/api/linked-list").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"]["values"], [1, 2, 3, 4, 5])
        self.post("push-back", {"value": 9})
        _, j = self.post("reset")
        self.assertEqual(j["state"]["values"], [1, 2, 3, 4, 5])

    def test_push_insert_delete_find(self):
        self.post("push-front", {"value": 0})
        self.post("push-back", {"value": 6})
        self.post("insert", {"index": 1, "value": 10})
        self.assertEqual(self.values(), [0, 10, 1, 2, 3, 4, 5, 6])
        _, j = self.post("delete", {"index": 1})
        self.assertEqual(j["result"], {"removed": 10})
        _, j = self.post("find", {"value": 5})
        self.assertEqual(j["result"], {"found": True, "index": 5})
        _, j = self.post("find", {"value": 77})
        self.assertEqual(j["result"], {"found": False, "index": None})

    def test_reverse_middle(self):
        _, j = self.post("middle")
        self.assertEqual(j["result"], {"index": 2, "value": 3})
        _, j = self.post("reverse")
        self.assertEqual(j["state"]["values"], [5, 4, 3, 2, 1])

    def test_cycle_flow(self):
        _, j = self.post("has-cycle")
        self.assertFalse(j["result"]["has_cycle"])
        code, j = self.post("make-cycle", {"index": 1})
        self.assertEqual(j["state"]["cycle_to"], 1)
        self.assertEqual(self.post("has-cycle")[1]["result"], {"has_cycle": True, "cycle_to": 1})
        for op, payload in [("reverse", {}), ("push-back", {"value": 1}), ("delete", {"index": 0}),
                            ("remove-nth-from-end", {"n": 1}), ("merge-sorted", {"values": [1]}),
                            ("make-cycle", {"index": 0}), ("middle", {})]:
            self.assertEqual(self.post(op, payload)[0], 400, op)
        _, j = self.post("break-cycle")
        self.assertIsNone(j["state"]["cycle_to"])

    def test_merge_and_remove_nth(self):
        _, j = self.post("merge-sorted", {"values": [0, 3, 9]})
        self.assertEqual(j["state"]["values"], [0, 1, 2, 3, 3, 4, 5, 9])
        _, j = self.post("remove-nth-from-end", {"n": 2})
        self.assertEqual(j["result"], {"removed": 5})
        self.assertEqual(self.values(), [0, 1, 2, 3, 3, 4, 9])

    def test_empty_list(self):
        for _ in range(5):
            self.post("delete", {"index": 0})
        self.assertEqual(self.values(), [])
        for op, payload in [("delete", {"index": 0}), ("middle", {}), ("make-cycle", {"index": 0}),
                            ("remove-nth-from-end", {"n": 1})]:
            self.assertEqual(self.post(op, payload)[0], 400, op)
        self.assertEqual(self.post("reverse")[0], 200)
        self.assertFalse(self.post("has-cycle")[1]["result"]["has_cycle"])
        self.assertEqual(self.post("push-back", {"value": 1})[0], 200)

    def test_bad_input(self):
        cases = [
            ("push-front", {}), ("push-front", {"value": "a"}), ("push-back", {"value": True}),
            ("push-back", {"value": 10 ** 12}), ("insert", {"index": 99, "value": 1}),
            ("insert", {"index": -1, "value": 1}), ("insert", {"index": 0}),
            ("delete", {"index": 5}), ("delete", {"index": "x"}), ("find", {}),
            ("make-cycle", {"index": 9}), ("merge-sorted", {"values": "x"}),
            ("merge-sorted", {"values": [3, 1]}), ("merge-sorted", {"values": [1, "a"]}),
            ("merge-sorted", {"values": list(range(40))}),
            ("remove-nth-from-end", {"n": 0}), ("remove-nth-from-end", {"n": 6}),
            ("remove-nth-from-end", {"n": 1.5}),
        ]
        for op, payload in cases:
            code, j = self.post(op, payload)
            self.assertEqual(code, 400, (op, payload))
            self.assertFalse(j["success"])
            self.assertEqual(j["state"]["values"], [1, 2, 3, 4, 5])

    def test_malformed_body(self):
        for raw in ("not json", "[1,2]", "null", ""):
            r = self.c.post("/api/linked-list/push-back", data=raw, content_type="application/json")
            self.assertEqual(r.status_code, 400, raw)
        r = self.c.post("/api/linked-list/insert")
        self.assertEqual(r.status_code, 400)

    def test_node_limit(self):
        for i in range(routes.MAX_NODES - 5):
            self.assertEqual(self.post("push-back", {"value": i})[0], 200)
        self.assertEqual(self.post("push-back", {"value": 1})[0], 400)
        self.assertEqual(self.post("insert", {"index": 0, "value": 1})[0], 400)
        self.assertEqual(len(self.values()), routes.MAX_NODES)


if __name__ == "__main__":
    unittest.main()
