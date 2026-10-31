import json
import random
import unittest
from unittest import mock

from api.routes import linked_list_routes as routes
from DataStrcutures import LinkedList as linked_list_module
from DataStrcutures.LinkedList import (
    DoublyLinkedList,
    DoublyNode,
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


class DoublyClassTests(unittest.TestCase):
    def assertLinks(self, l, expected):
        """Follow next from head and prev from tail; both must agree with expected."""
        self.assertEqual(l.to_list(), expected)
        self.assertEqual(l.to_list_backward(), expected[::-1])
        self.assertEqual(len(l), len(expected))
        assert_links_consistent(self, l)

    def test_empty(self):
        l = DoublyLinkedList()
        self.assertIsNone(l.head)
        self.assertIsNone(l.tail)
        self.assertLinks(l, [])
        self.assertEqual(l.to_dict(), {"values": [], "length": 0, "head": None, "tail": None, "nodes": []})
        with self.assertRaises(IndexError):
            l.pop_front()
        with self.assertRaises(IndexError):
            l.pop_back()
        self.assertIsNone(l.find(1))

    def test_real_pointers(self):
        l = DoublyLinkedList([1, 2, 3])
        a, b, c = l.head, l.head.next, l.tail
        self.assertIsNone(a.prev)
        self.assertIs(a.next, b)
        self.assertIs(b.prev, a)
        self.assertIs(b.next, c)
        self.assertIs(c.prev, b)
        self.assertIsNone(c.next)

    def test_push_and_pop(self):
        l = DoublyLinkedList()
        self.assertEqual(l.push_back(2).val, 2)
        self.assertEqual(l.push_front(1).val, 1)
        l.push_back(3)
        self.assertLinks(l, [1, 2, 3])
        self.assertEqual(l.pop_front(), 1)
        self.assertLinks(l, [2, 3])
        self.assertEqual(l.pop_back(), 3)
        self.assertLinks(l, [2])
        self.assertIs(l.head, l.tail)
        self.assertEqual(l.pop_back(), 2)
        self.assertLinks(l, [])
        self.assertIsNone(l.head)
        self.assertIsNone(l.tail)

    def test_insert_after(self):
        l = DoublyLinkedList([1, 3])
        new = l.insert_after(l.head, 2)
        self.assertEqual(new.val, 2)
        self.assertLinks(l, [1, 2, 3])
        tail = l.insert_after(l.tail, 4)
        self.assertIs(l.tail, tail)
        self.assertLinks(l, [1, 2, 3, 4])

    def test_delete_middle_head_tail_only(self):
        l = DoublyLinkedList([1, 2, 3, 4])
        self.assertEqual(l.delete(l.head.next), 2)
        self.assertLinks(l, [1, 3, 4])
        self.assertEqual(l.delete(l.head), 1)
        self.assertLinks(l, [3, 4])
        self.assertEqual(l.delete(l.tail), 4)
        self.assertLinks(l, [3])
        self.assertEqual(l.delete(l.head), 3)
        self.assertLinks(l, [])

    def test_deleted_node_is_detached_and_refused(self):
        l = DoublyLinkedList([1, 2, 3])
        mid = l.head.next
        l.delete(mid)
        self.assertIsNone(mid.prev)
        self.assertIsNone(mid.next)
        with self.assertRaises(ValueError):
            l.delete(mid)
        with self.assertRaises(ValueError):
            l.insert_after(mid, 9)
        self.assertLinks(l, [1, 3])

    def test_foreign_node_is_refused(self):
        a, b = DoublyLinkedList([1, 2]), DoublyLinkedList([1, 2])
        for bad in (b.head, None, DoublyNode(1)):
            with self.assertRaises(ValueError):
                a.delete(bad)
            with self.assertRaises(ValueError):
                a.insert_after(bad, 9)
        self.assertLinks(a, [1, 2])
        self.assertLinks(b, [1, 2])

    def test_find_returns_first_match(self):
        l = DoublyLinkedList([1, 2, 1])
        self.assertIs(l.find(1), l.head)
        self.assertIs(l.find(2), l.head.next)
        self.assertIsNone(l.find(9))

    def test_traversal_order(self):
        l = DoublyLinkedList([1, 2, 3])
        self.assertEqual([n.val for n in l.forward()], [1, 2, 3])
        self.assertEqual([n.val for n in l.backward()], [3, 2, 1])

    def test_ids_are_stable_and_never_reused(self):
        l = DoublyLinkedList([1, 2, 3])
        ids = [n.id for n in l.forward()]
        self.assertEqual(len(set(ids)), 3)
        doomed = l.tail
        l.pop_back()
        new = l.push_back(9)
        self.assertNotEqual(new.id, doomed.id)
        self.assertIsNone(l.node_by_id(doomed.id))
        self.assertIs(l.node_by_id(new.id), new)
        l.push_front(0)
        self.assertEqual([n.id for n in l.forward()][1:3], ids[:2])

    def test_node_by_id_absent(self):
        l = DoublyLinkedList([1])
        self.assertIsNone(l.node_by_id(999))

    def test_to_dict_shows_pointers(self):
        l = DoublyLinkedList([7, 8])
        a, b = l.head, l.tail
        self.assertEqual(l.to_dict(), {
            "values": [7, 8],
            "length": 2,
            "head": a.id,
            "tail": b.id,
            "nodes": [
                {"id": a.id, "value": 7, "prev": None, "next": b.id},
                {"id": b.id, "value": 8, "prev": a.id, "next": None},
            ],
        })

    def test_known_node_ops_do_not_depend_on_length(self):
        """O(1) at a known node: the pointer reads must not grow with the list."""
        reads = {"count": 0}

        class CountingNode(DoublyNode):
            def __getattribute__(self, name):
                if name in ("next", "prev"):
                    reads["count"] += 1
                return object.__getattribute__(self, name)

        def cost(size):
            with mock.patch.object(linked_list_module, "DoublyNode", CountingNode):
                l = DoublyLinkedList(range(size))
                mid = l.head
                for _ in range(size // 2):
                    mid = mid.next
                reads["count"] = 0
                new = l.insert_after(l.node_by_id(mid.id), -1)
                l.delete(l.node_by_id(new.id))
                len(l)
                return reads["count"]

        self.assertEqual(cost(10), cost(5000))

    def test_randomized_against_python_list(self):
        for seed in range(25):
            rng = random.Random(seed)
            l = DoublyLinkedList()
            model = []  # [(node, value), ...]
            for _ in range(300):
                op = rng.choice(["pf", "pb", "of", "ob", "ia", "del", "find"])
                v = rng.randint(-3, 3)
                if op == "pf":
                    model.insert(0, (l.push_front(v), v))
                elif op == "pb":
                    model.append((l.push_back(v), v))
                elif op == "of":
                    if model:
                        self.assertEqual(l.pop_front(), model.pop(0)[1])
                    else:
                        with self.assertRaises(IndexError):
                            l.pop_front()
                elif op == "ob":
                    if model:
                        self.assertEqual(l.pop_back(), model.pop()[1])
                    else:
                        with self.assertRaises(IndexError):
                            l.pop_back()
                elif op == "ia" and model:
                    i = rng.randrange(len(model))
                    model.insert(i + 1, (l.insert_after(model[i][0], v), v))
                elif op == "del" and model:
                    i = rng.randrange(len(model))
                    self.assertEqual(l.delete(model[i][0]), model[i][1])
                    model.pop(i)
                elif op == "find":
                    found = l.find(v)
                    first = next((n for n, x in model if x == v), None)
                    self.assertIs(found, first)
                self.assertEqual([n for n, _ in model], list(l.forward()))
                self.assertLinks(l, [x for _, x in model])


def assert_links_consistent(test, l):
    """Every next has a matching prev and vice versa, and the ends are correct."""
    forward = list(l.forward())
    backward = list(l.backward())
    test.assertEqual(forward, backward[::-1])
    test.assertEqual(len(forward), len(l))
    if not forward:
        test.assertIsNone(l.head)
        test.assertIsNone(l.tail)
        return
    test.assertIs(l.head, forward[0])
    test.assertIs(l.tail, forward[-1])
    test.assertIsNone(l.head.prev)
    test.assertIsNone(l.tail.next)
    for a, b in zip(forward, forward[1:]):
        test.assertIs(a.next, b)
        test.assertIs(b.prev, a)
    for node in forward:
        test.assertIs(l.node_by_id(node.id), node)


class DoublyRouteTests(unittest.TestCase):
    INITIAL = [1, 2, 3, 4, 5]
    BASE = "/api/linked-list/doubly"

    def setUp(self):
        self.c = client_for(routes.bp)
        self.c.post(self.BASE + "/reset")
        self.c.post("/api/linked-list/reset")

    def post(self, op, payload=None):
        r = self.c.post(self.BASE + "/" + op, json=payload if payload is not None else {})
        return r.status_code, r.get_json()

    def state(self):
        return self.c.get(self.BASE).get_json()["state"]

    def ids(self):
        return [n["id"] for n in self.state()["nodes"]]

    def assertStateLinks(self, state):
        """The JSON state's prev and next must agree in both directions."""
        nodes = state["nodes"]
        self.assertEqual(state["values"], [n["value"] for n in nodes])
        self.assertEqual(state["length"], len(nodes))
        self.assertEqual(state["head"], nodes[0]["id"] if nodes else None)
        self.assertEqual(state["tail"], nodes[-1]["id"] if nodes else None)
        for i, n in enumerate(nodes):
            self.assertEqual(n["prev"], nodes[i - 1]["id"] if i else None)
            self.assertEqual(n["next"], nodes[i + 1]["id"] if i + 1 < len(nodes) else None)

    def test_get_and_shape(self):
        j = self.c.get(self.BASE).get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"]["values"], self.INITIAL)
        self.assertEqual(j["state"]["length"], 5)
        self.assertEqual(set(j["state"]), {"values", "length", "head", "tail", "nodes"})
        self.assertEqual(set(j["state"]["nodes"][0]), {"id", "value", "prev", "next"})
        self.assertStateLinks(j["state"])

    def test_push(self):
        code, j = self.post("push-front", {"value": 0})
        self.assertEqual(code, 200)
        self.assertEqual(j["state"]["values"], [0, 1, 2, 3, 4, 5])
        self.assertEqual(j["result"], {"node": j["state"]["head"]})
        code, j = self.post("push-back", {"value": 6})
        self.assertEqual(code, 200)
        self.assertEqual(j["state"]["values"][-1], 6)
        self.assertEqual(j["result"], {"node": j["state"]["tail"]})
        self.assertStateLinks(j["state"])

    def test_pop(self):
        head, tail = self.state()["head"], self.state()["tail"]
        code, j = self.post("pop-front")
        self.assertEqual(code, 200)
        self.assertEqual(j["result"], {"removed": 1, "node": head})
        code, j = self.post("pop-back")
        self.assertEqual(j["result"], {"removed": 5, "node": tail})
        self.assertEqual(j["state"]["values"], [2, 3, 4])
        self.assertStateLinks(j["state"])

    def test_pop_without_a_body(self):
        r = self.c.post(self.BASE + "/pop-front")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["result"]["removed"], 1)

    def test_insert_after(self):
        ids = self.ids()
        code, j = self.post("insert-after", {"node": ids[1], "value": 9})
        self.assertEqual(code, 200)
        self.assertEqual(j["state"]["values"], [1, 2, 9, 3, 4, 5])
        new = j["state"]["nodes"][2]["id"]
        self.assertEqual(j["result"], {"node": new, "after": ids[1]})
        self.assertStateLinks(j["state"])
        _, j = self.post("insert-after", {"node": ids[-1], "value": 10})
        self.assertEqual(j["state"]["values"][-1], 10)
        self.assertEqual(j["state"]["tail"], j["result"]["node"])
        self.assertStateLinks(j["state"])

    def test_delete_known_node(self):
        ids = self.ids()
        code, j = self.post("delete", {"node": ids[2]})
        self.assertEqual(code, 200)
        self.assertEqual(j["result"], {"removed": 3, "node": ids[2]})
        self.assertEqual(j["state"]["values"], [1, 2, 4, 5])
        self.assertStateLinks(j["state"])
        # Ids of the survivors did not shift: they still name the same nodes.
        self.assertEqual([n["id"] for n in j["state"]["nodes"]], ids[:2] + ids[3:])
        code, j = self.post("delete", {"node": ids[2]})
        self.assertEqual(code, 400)
        self.assertEqual(j["state"]["values"], [1, 2, 4, 5])
        code, j = self.post("insert-after", {"node": ids[2], "value": 1})
        self.assertEqual(code, 400)

    def test_find(self):
        ids = self.ids()
        code, j = self.post("find", {"value": 4})
        self.assertEqual(code, 200)
        self.assertEqual(j["result"], {"found": True, "node": ids[3], "index": 3})
        _, j = self.post("find", {"value": 77})
        self.assertEqual(j["result"], {"found": False, "node": None, "index": None})

    def test_traversal(self):
        ids = self.ids()
        code, j = self.post("traverse-forward")
        self.assertEqual(code, 200)
        self.assertEqual(j["result"], {"direction": "forward", "values": self.INITIAL, "nodes": ids})
        code, j = self.post("traverse-backward")
        self.assertEqual(code, 200)
        self.assertEqual(j["result"], {"direction": "backward", "values": self.INITIAL[::-1], "nodes": ids[::-1]})

    def test_reset_restores_initial_state(self):
        before = self.state()
        self.post("push-back", {"value": 9})
        self.post("delete", {"node": before["nodes"][0]["id"]})
        code, j = self.post("reset")
        self.assertEqual(code, 200)
        self.assertEqual(j["state"], before)
        self.assertIsNone(j["result"])

    def test_state_is_separate_from_singly(self):
        self.post("push-back", {"value": 9})
        self.post("pop-front")
        singly = self.c.get("/api/linked-list").get_json()["state"]
        self.assertEqual(singly, {"values": [1, 2, 3, 4, 5], "length": 5, "cycle_to": None})
        self.c.post("/api/linked-list/push-back", json={"value": 7})
        self.assertEqual(self.state()["values"], [2, 3, 4, 5, 9])
        self.c.post("/api/linked-list/reset")
        self.assertEqual(self.state()["values"], [2, 3, 4, 5, 9])
        self.c.post("/api/linked-list/push-back", json={"value": 7})
        self.post("reset")
        self.assertEqual(self.state()["values"], self.INITIAL)
        self.assertEqual(self.c.get("/api/linked-list").get_json()["state"]["values"], [1, 2, 3, 4, 5, 7])

    def test_empty_list(self):
        for _ in range(5):
            self.post("pop-back")
        self.assertEqual(self.state()["nodes"], [])
        self.assertStateLinks(self.state())
        for op, payload in [("pop-front", {}), ("pop-back", {}), ("delete", {"node": 1}),
                            ("insert-after", {"node": 1, "value": 1})]:
            code, j = self.post(op, payload)
            self.assertEqual(code, 400, op)
            self.assertFalse(j["success"])
            self.assertEqual(j["state"]["nodes"], [])
        self.assertEqual(self.post("traverse-forward")[1]["result"]["values"], [])
        self.assertEqual(self.post("traverse-backward")[1]["result"]["values"], [])
        self.assertFalse(self.post("find", {"value": 1})[1]["result"]["found"])
        code, j = self.post("push-back", {"value": 1})
        self.assertEqual(code, 200)
        self.assertEqual(j["state"]["head"], j["state"]["tail"])
        self.assertStateLinks(j["state"])

    def test_node_limit(self):
        for i in range(routes.MAX_NODES - 5):
            self.assertEqual(self.post("push-back", {"value": i})[0], 200)
        before = self.state()
        self.assertEqual(self.post("push-back", {"value": 1})[0], 400)
        self.assertEqual(self.post("push-front", {"value": 1})[0], 400)
        code, j = self.post("insert-after", {"node": before["head"], "value": 1})
        self.assertEqual(code, 400)
        self.assertIn(str(routes.MAX_NODES), j["error"])
        self.assertEqual(self.state(), before)
        self.assertEqual(self.post("pop-front")[0], 200)
        self.assertEqual(self.post("push-front", {"value": 1})[0], 200)

    def test_bad_input_leaves_state_unchanged(self):
        before = self.state()
        head = before["head"]
        bad_values = [None, True, False, "1", "", "\ud800", 1.5, 1.0, 10 ** 12, -(10 ** 12), 10 ** 30, [], [1], {}, {"a": 1}]
        cases = []
        for v in bad_values:
            cases += [
                ("push-front", {"value": v}), ("push-back", {"value": v}), ("find", {"value": v}),
                ("insert-after", {"node": head, "value": v}),
                ("insert-after", {"node": v, "value": 1}),
                ("delete", {"node": v}),
            ]
        for payload in [{}, {"val": 1}]:
            cases += [(op, payload) for op in ("push-front", "push-back", "find", "insert-after", "delete")]
        cases += [
            ("insert-after", {"node": head}), ("insert-after", {"value": 1}),
            ("insert-after", {"node": 999, "value": 1}), ("insert-after", {"node": -1, "value": 1}),
            ("insert-after", {"node": 0, "value": 1}), ("delete", {"node": 999}), ("delete", {"node": -1}),
            ("delete", {"node": 0}), ("delete", {"index": 0}),
        ]
        for op, payload in cases:
            r = self.c.post(self.BASE + "/" + op, data=json.dumps(payload), content_type="application/json")
            j = r.get_json()
            self.assertEqual(r.status_code, 400, (op, payload))
            self.assertFalse(j["success"])
            self.assertTrue(j["error"])
            self.assertEqual(j["state"], before, (op, payload))
            self.assertEqual(self.state(), before, (op, payload))

    def test_malformed_or_missing_body(self):
        before = self.state()
        for op in ("push-front", "push-back", "find", "insert-after", "delete"):
            for raw in ("", "not json", "{bad", "[1,2]", "null", "5", '"s"', "NaN", "[" * 50000):
                r = self.c.post(self.BASE + "/" + op, data=raw, content_type="application/json")
                self.assertEqual(r.status_code, 400, (op, raw[:10]))
                self.assertEqual(r.get_json()["state"], before)
            r = self.c.post(self.BASE + "/" + op)
            self.assertEqual(r.status_code, 400, op)
            self.assertEqual(r.get_json()["state"], before)

    def test_non_finite_values(self):
        before = self.state()
        for raw in ('{"value": NaN}', '{"value": Infinity}', '{"value": -Infinity}'):
            for op in ("push-back", "find"):
                r = self.c.post(self.BASE + "/" + op, data=raw, content_type="application/json")
                self.assertEqual(r.status_code, 400, raw)
                self.assertEqual(r.get_json()["state"], before)
        r = self.c.post(self.BASE + "/delete", data='{"node": NaN}', content_type="application/json")
        self.assertEqual(r.status_code, 400)

    def test_randomized_routes_against_python_list(self):
        rng = random.Random(1234)
        for _ in range(6):
            self.post("reset")
            state = self.state()
            model = [[n["id"], n["value"]] for n in state["nodes"]]
            for _ in range(150):
                op = rng.choice(["push-front", "push-back", "pop-front", "pop-back", "insert-after", "delete",
                                 "delete-stale", "find", "traverse-forward", "traverse-backward"])
                v = rng.randint(-3, 3)
                full = len(model) >= routes.MAX_NODES
                if op in ("push-front", "push-back"):
                    code, j = self.post(op, {"value": v})
                    self.assertEqual(code, 400 if full else 200)
                    if not full:
                        entry = [j["result"]["node"], v]
                        if op == "push-front":
                            model.insert(0, entry)
                        else:
                            model.append(entry)
                elif op in ("pop-front", "pop-back"):
                    code, j = self.post(op)
                    self.assertEqual(code, 200 if model else 400)
                    if model:
                        gone = model.pop(0 if op == "pop-front" else -1)
                        self.assertEqual(j["result"], {"removed": gone[1], "node": gone[0]})
                elif op == "insert-after" and model:
                    i = rng.randrange(len(model))
                    code, j = self.post(op, {"node": model[i][0], "value": v})
                    self.assertEqual(code, 400 if full else 200)
                    if not full:
                        model.insert(i + 1, [j["result"]["node"], v])
                elif op == "delete" and model:
                    i = rng.randrange(len(model))
                    code, j = self.post(op, {"node": model[i][0]})
                    self.assertEqual(code, 200)
                    self.assertEqual(j["result"]["removed"], model.pop(i)[1])
                elif op == "delete-stale":
                    code, j = self.post("delete", {"node": 10 ** 8})
                    self.assertEqual(code, 400)
                elif op == "find":
                    code, j = self.post(op, {"value": v})
                    index = next((i for i, m in enumerate(model) if m[1] == v), None)
                    self.assertEqual(j["result"]["index"], index)
                    self.assertEqual(j["result"]["node"], None if index is None else model[index][0])
                elif op == "traverse-forward":
                    self.assertEqual(self.post(op)[1]["result"]["values"], [m[1] for m in model])
                elif op == "traverse-backward":
                    self.assertEqual(self.post(op)[1]["result"]["nodes"], [m[0] for m in model][::-1])
                state = self.state()
                self.assertEqual([[n["id"], n["value"]] for n in state["nodes"]], model)
                self.assertStateLinks(state)


if __name__ == "__main__":
    unittest.main()
