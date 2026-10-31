class FenwickTree:
    def __init__(self, size):
        self._tree = [0] * (size + 1)

    def add(self, i, delta):
        i += 1
        while i < len(self._tree):
            self._tree[i] += delta
            i += i & -i

    def prefix_sum(self, i):
        """Sum of the first i elements."""
        total = 0
        while i > 0:
            total += self._tree[i]
            i -= i & -i
        return total

    def range_sum(self, left, right):
        """Sum of elements left through right, inclusive."""
        return self.prefix_sum(right + 1) - self.prefix_sum(left)

    def to_list(self):
        """The tree cells for positions 1..n (position 0 is unused)."""
        return self._tree[1:]

    def add_path(self, i):
        """Tree positions (1-based) that add(i, ...) touches."""
        path = []
        i += 1
        while i < len(self._tree):
            path.append(i)
            i += i & -i
        return path

    def prefix_path(self, i):
        """Tree positions (1-based) that prefix_sum(i) reads."""
        path = []
        while i > 0:
            path.append(i)
            i -= i & -i
        return path


class SegmentTree:
    """Range minimum over a fixed-size array."""

    def __init__(self, nums):
        self._n = len(nums)
        self._tree = [0] * self._n + list(nums)
        for i in range(self._n - 1, 0, -1):
            self._tree[i] = min(self._tree[2 * i], self._tree[2 * i + 1])

    def update(self, i, value):
        i += self._n
        self._tree[i] = value
        while i > 1:
            i //= 2
            self._tree[i] = min(self._tree[2 * i], self._tree[2 * i + 1])

    def query(self, left, right):
        """Minimum of elements left through right, inclusive."""
        result = float("inf")
        left += self._n
        right += self._n + 1
        while left < right:
            if left % 2:
                result = min(result, self._tree[left])
                left += 1
            if right % 2:
                right -= 1
                result = min(result, self._tree[right])
            left //= 2
            right //= 2
        return result

    def to_list(self):
        """All cells; index 0 is unused, 1 is the root, n..2n-1 are the leaves."""
        return list(self._tree)

    def update_path(self, i):
        """Node indices that update(i, ...) rewrites, leaf first."""
        path = []
        i += self._n
        path.append(i)
        while i > 1:
            i //= 2
            path.append(i)
        return path

    def query_nodes(self, left, right):
        """Node indices whose values query(left, right) combines."""
        nodes = []
        left += self._n
        right += self._n + 1
        while left < right:
            if left % 2:
                nodes.append(left)
                left += 1
            if right % 2:
                right -= 1
                nodes.append(right)
            left //= 2
            right //= 2
        return nodes
