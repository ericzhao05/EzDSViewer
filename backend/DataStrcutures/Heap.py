import heapq
from collections import Counter


class MinHeap:
    def __init__(self, items=None):
        self._items = list(items or [])
        for i in range(len(self._items) // 2 - 1, -1, -1):
            self._sift_down(i)

    def __len__(self):
        return len(self._items)

    def peek(self):
        return self._items[0]

    def push(self, value):
        self._items.append(value)
        self._sift_up(len(self._items) - 1)

    def pop(self):
        items = self._items
        items[0], items[-1] = items[-1], items[0]
        value = items.pop()
        if items:
            self._sift_down(0)
        return value

    def to_list(self):
        """The backing array, in heap order (not sorted)."""
        return list(self._items)

    def _sift_up(self, i):
        items = self._items
        while i > 0:
            parent = (i - 1) // 2
            if items[i] >= items[parent]:
                break
            items[i], items[parent] = items[parent], items[i]
            i = parent

    def _sift_down(self, i):
        items = self._items
        while True:
            smallest = i
            for child in (2 * i + 1, 2 * i + 2):
                if child < len(items) and items[child] < items[smallest]:
                    smallest = child
            if smallest == i:
                break
            items[i], items[smallest] = items[smallest], items[i]
            i = smallest


def kth_largest(nums, k):
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]


def top_k_frequent(nums, k):
    counts = Counter(nums)
    return heapq.nlargest(k, counts, key=counts.get)


class MedianFinder:
    """Two heaps: a max-heap for the lower half, a min-heap for the upper half."""

    def __init__(self):
        self._low = []
        self._high = []

    def add(self, num):
        heapq.heappush(self._high, -heapq.heappushpop(self._low, -num))
        if len(self._high) > len(self._low):
            heapq.heappush(self._low, -heapq.heappop(self._high))

    def median(self):
        if len(self._low) > len(self._high):
            return -self._low[0]
        return (-self._low[0] + self._high[0]) / 2

    def to_dict(self):
        """low is shown as real values (negated back), high as stored."""
        return {"low": [-x for x in self._low], "high": list(self._high)}
