from collections import deque


class CircularQueue:
    """Fixed-capacity queue: indices wrap around instead of shifting elements."""

    def __init__(self, capacity):
        self._data = [None] * capacity
        self._head = 0
        self._size = 0

    def __len__(self):
        return self._size

    def is_full(self):
        return self._size == len(self._data)

    def enqueue(self, value):
        if self.is_full():
            raise OverflowError("queue is full")
        tail = (self._head + self._size) % len(self._data)
        self._data[tail] = value
        self._size += 1

    def dequeue(self):
        if self._size == 0:
            raise IndexError("dequeue from empty queue")
        value = self._data[self._head]
        self._data[self._head] = None
        self._head = (self._head + 1) % len(self._data)
        self._size -= 1
        return value

    def to_dict(self):
        return {
            "capacity": len(self._data),
            "head": self._head,
            "size": self._size,
            "slots": list(self._data),
        }


class QueueWithStacks:
    """Amortized O(1): each item moves between the stacks at most once."""

    def __init__(self):
        self._incoming = []
        self._outgoing = []

    def __len__(self):
        return len(self._incoming) + len(self._outgoing)

    def enqueue(self, value):
        self._incoming.append(value)

    def dequeue(self):
        if not self._outgoing:
            while self._incoming:
                self._outgoing.append(self._incoming.pop())
        return self._outgoing.pop()

    def to_dict(self):
        return {"incoming": list(self._incoming), "outgoing": list(self._outgoing)}


class Deque:
    """Double-ended queue: O(1) insertion and removal at both ends."""

    def __init__(self):
        self._items = deque()

    def __len__(self):
        return len(self._items)

    def push_front(self, value):
        self._items.appendleft(value)

    def push_back(self, value):
        self._items.append(value)

    def pop_front(self):
        if not self._items:
            raise IndexError("pop from empty deque")
        return self._items.popleft()

    def pop_back(self):
        if not self._items:
            raise IndexError("pop from empty deque")
        return self._items.pop()

    def to_list(self):
        return list(self._items)


def sliding_window_max(nums, k):
    window = deque()
    result = []
    for i, num in enumerate(nums):
        while window and nums[window[-1]] <= num:
            window.pop()
        window.append(i)
        if window[0] <= i - k:
            window.popleft()
        if i >= k - 1:
            result.append(nums[window[0]])
    return result


def sliding_window_trace(nums, k):
    """Same algorithm as sliding_window_max, recording the deque after each step."""
    window = deque()
    steps = []
    for i, num in enumerate(nums):
        while window and nums[window[-1]] <= num:
            window.pop()
        window.append(i)
        if window[0] <= i - k:
            window.popleft()
        steps.append({
            "index": i,
            "deque": list(window),
            "max": nums[window[0]] if i >= k - 1 else None,
        })
    return steps
