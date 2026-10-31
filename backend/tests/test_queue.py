import unittest

from api.routes import queue_routes as routes
from DataStrcutures.ArrayQueue import ArrayQueue
from DataStrcutures.Queue import (
    CircularQueue,
    Deque,
    QueueWithStacks,
    sliding_window_max,
)
from DataStrcutures.StaticArrayQueue import StaticArrayQueue
from tests.helpers import client_for


class CircularQueueTests(unittest.TestCase):
    def test_fifo_and_wraparound(self):
        q = CircularQueue(3)
        for v in (1, 2, 3):
            q.enqueue(v)
        self.assertTrue(q.is_full())
        self.assertEqual(q.dequeue(), 1)
        q.enqueue(4)
        self.assertEqual(q.to_dict()["slots"], [4, 2, 3])
        self.assertEqual([q.dequeue() for _ in range(3)], [2, 3, 4])
        self.assertEqual(len(q), 0)

    def test_overflow_and_underflow(self):
        q = CircularQueue(1)
        with self.assertRaises(IndexError):
            q.dequeue()
        q.enqueue(1)
        with self.assertRaises(OverflowError):
            q.enqueue(2)


class QueueWithStacksTests(unittest.TestCase):
    def test_fifo_and_transfer(self):
        q = QueueWithStacks()
        for v in (1, 2, 3):
            q.enqueue(v)
        self.assertEqual(q.dequeue(), 1)
        self.assertEqual(q.to_dict(), {"incoming": [], "outgoing": [3, 2]})
        q.enqueue(4)
        self.assertEqual([q.dequeue() for _ in range(3)], [2, 3, 4])

    def test_empty(self):
        with self.assertRaises(IndexError):
            QueueWithStacks().dequeue()


class DequeTests(unittest.TestCase):
    def test_both_ends(self):
        d = Deque()
        d.push_back(2)
        d.push_front(1)
        d.push_back(3)
        self.assertEqual(d.to_list(), [1, 2, 3])
        self.assertEqual(d.pop_front(), 1)
        self.assertEqual(d.pop_back(), 3)
        d.pop_back()
        with self.assertRaises(IndexError):
            d.pop_front()
        with self.assertRaises(IndexError):
            d.pop_back()


class SlidingWindowTests(unittest.TestCase):
    def test_classic(self):
        self.assertEqual(
            sliding_window_max([1, 3, -1, -3, 5, 3, 6, 7], 3), [3, 3, 5, 5, 6, 7]
        )

    def test_edges(self):
        self.assertEqual(sliding_window_max([], 3), [])
        self.assertEqual(sliding_window_max([4], 1), [4])
        self.assertEqual(sliding_window_max([2, 2, 2], 2), [2, 2])
        self.assertEqual(sliding_window_max([1, 2, 3], 3), [3])


class ArrayQueueTests(unittest.TestCase):
    def test_dynamic_grows_shrinks_and_wraps(self):
        q = ArrayQueue()
        for i in range(20):
            q.enqueue(i)
        self.assertEqual(q.capacity, 32)
        self.assertEqual(q.to_list(), list(range(20)))
        for i in range(18):
            self.assertEqual(q.dequeue(), i)
        self.assertEqual(q.capacity, 8)
        self.assertEqual(q.first(), 18)
        self.assertEqual(q.to_list(), [18, 19])
        q.dequeue()
        q.dequeue()
        self.assertTrue(q.is_empty())
        with self.assertRaises(Exception):
            q.dequeue()
        with self.assertRaises(Exception):
            q.first()

    def test_static(self):
        q = StaticArrayQueue(3)
        self.assertEqual(q.to_list(), [])
        for v in (1, 2, 3):
            q.enqueue(v)
        self.assertTrue(q.is_full())
        with self.assertRaises(Exception):
            q.enqueue(4)
        q.dequeue()
        q.enqueue(4)
        self.assertEqual(q.to_list(), [2, 3, 4])
        self.assertEqual(q.first(), 2)


class QueueRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = client_for(routes.bp)
        self.client.post("/api/queue/reset")

    def post(self, op, payload=None):
        return self.client.post("/api/queue/" + op, json=payload)

    def test_get_state(self):
        data = self.client.get("/api/queue").get_json()
        self.assertTrue(data["success"])
        self.assertIsNone(data["result"])
        self.assertEqual(data["state"]["circular"]["size"], 0)
        self.assertEqual(data["state"]["deque"], [])

    def test_circular(self):
        for v in range(6):
            self.assertEqual(self.post("circular-enqueue", {"value": v}).status_code, 200)
        r = self.post("circular-enqueue", {"value": 9})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.get_json()["state"]["circular"]["size"], 6)
        r = self.post("circular-dequeue").get_json()
        self.assertEqual(r["result"], 0)
        self.assertEqual(r["state"]["circular"]["head"], 1)

    def test_circular_empty(self):
        r = self.post("circular-dequeue")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.get_json()["success"])

    def test_stacks(self):
        for v in (1, 2, 3):
            self.post("stacks-enqueue", {"value": v})
        r = self.post("stacks-dequeue").get_json()
        self.assertEqual(r["result"], 1)
        self.assertEqual(r["state"]["stacks"], {"incoming": [], "outgoing": [3, 2]})

    def test_stacks_empty_and_limit(self):
        self.assertEqual(self.post("stacks-dequeue").status_code, 400)
        for v in range(routes.MAX_ITEMS):
            self.post("stacks-enqueue", {"value": v})
        self.assertEqual(self.post("stacks-enqueue", {"value": 1}).status_code, 400)

    def test_deque(self):
        self.post("deque-push-back", {"value": "b"})
        self.post("deque-push-front", {"value": "a"})
        r = self.post("deque-push-back", {"value": 3}).get_json()
        self.assertEqual(r["state"]["deque"], ["a", "b", 3])
        self.assertEqual(self.post("deque-pop-front").get_json()["result"], "a")
        self.assertEqual(self.post("deque-pop-back").get_json()["result"], 3)

    def test_deque_empty_and_limit(self):
        self.assertEqual(self.post("deque-pop-front").status_code, 400)
        self.assertEqual(self.post("deque-pop-back").status_code, 400)
        for v in range(routes.MAX_ITEMS):
            self.post("deque-push-back", {"value": v})
        self.assertEqual(self.post("deque-push-front", {"value": 1}).status_code, 400)

    def test_sliding_window(self):
        r = self.post("sliding-window-max", {"nums": [1, 3, -1, -3, 5, 3, 6, 7], "k": 3}).get_json()
        self.assertEqual(r["result"]["maxes"], [3, 3, 5, 5, 6, 7])
        steps = r["result"]["steps"]
        self.assertEqual(len(steps), 8)
        self.assertIsNone(steps[0]["max"])
        self.assertEqual(steps[2]["deque"], [1, 2])
        self.assertEqual(steps[2]["max"], 3)

    def test_bad_input(self):
        for op in ("circular-enqueue", "stacks-enqueue", "deque-push-front", "deque-push-back"):
            for bad in (None, {}, {"value": None}, {"value": True}, {"value": ""},
                        {"value": "x" * 21}, {"value": 1.5}, {"value": [1]},
                        {"value": 10 ** 12}, [1, 2]):
                self.assertEqual(self.post(op, bad).status_code, 400, (op, bad))
        for bad in (None, {}, {"nums": [1], "k": 0}, {"nums": [1], "k": 2},
                    {"nums": [], "k": 1}, {"nums": "abc", "k": 1}, {"nums": [1.5], "k": 1},
                    {"nums": [True], "k": 1}, {"nums": [1], "k": True},
                    {"nums": list(range(51)), "k": 1}, [1]):
            self.assertEqual(self.post("sliding-window-max", bad).status_code, 400, bad)
        raw = self.client.post("/api/queue/circular-enqueue", data="{oops",
                               content_type="application/json")
        self.assertEqual(raw.status_code, 400)
        self.assertEqual(self.client.get("/api/queue").get_json()["state"]["circular"]["size"], 0)

    def test_reset(self):
        self.post("circular-enqueue", {"value": 1})
        self.post("deque-push-back", {"value": 1})
        state = self.post("reset").get_json()["state"]
        self.assertEqual(state["circular"]["size"], 0)
        self.assertEqual(state["deque"], [])


if __name__ == "__main__":
    unittest.main()
