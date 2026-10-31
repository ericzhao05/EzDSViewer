class KdNode:
    def __init__(self, point, axis):
        self.point = point
        self.axis = axis
        self.left = None
        self.right = None


class KdTree:
    """k-dimensional tree: level d splits on axis d % k. Smaller coordinates go left,
    greater or equal go right. Duplicate points are ignored."""

    def __init__(self, k=2):
        if not isinstance(k, int) or isinstance(k, bool) or k < 1:
            raise ValueError("k must be a positive integer")
        self.k = k
        self.root = None
        self._size = 0

    def __len__(self):
        return self._size

    def _check(self, point):
        if not isinstance(point, (list, tuple)) or len(point) != self.k:
            raise ValueError(f"point must have exactly {self.k} coordinates")
        return tuple(point)

    def insert(self, point):
        """Insert a point; return False (no change) if it is already present."""
        point = self._check(point)
        if self.root is None:
            self.root = KdNode(point, 0)
            self._size = 1
            return True
        node = self.root
        while True:
            if point == node.point:
                return False
            side = "left" if point[node.axis] < node.point[node.axis] else "right"
            nxt = getattr(node, side)
            if nxt is None:
                setattr(node, side, KdNode(point, (node.axis + 1) % self.k))
                self._size += 1
                return True
            node = nxt

    def contains(self, point):
        point = self._check(point)
        node = self.root
        while node is not None:
            if point == node.point:
                return True
            node = node.left if point[node.axis] < node.point[node.axis] else node.right
        return False

    def nearest(self, query):
        """Return (point, squared_distance, visited) for the closest stored point, pruning
        subtrees the splitting plane proves cannot beat the best so far. Ties keep the
        first point found. Raises ValueError on an empty tree."""
        query = self._check(query)
        if self.root is None:
            raise ValueError("tree is empty")
        best = [None, None]
        visited = []

        def visit(node):
            if node is None:
                return
            visited.append(node.point)
            d = sum((a - b) ** 2 for a, b in zip(node.point, query))
            if best[1] is None or d < best[1]:
                best[0], best[1] = node.point, d
            diff = query[node.axis] - node.point[node.axis]
            near, far = (node.left, node.right) if diff < 0 else (node.right, node.left)
            visit(near)
            if diff * diff < best[1]:
                visit(far)

        visit(self.root)
        return best[0], best[1], visited

    def to_dict(self):
        def conv(node):
            if node is None:
                return None
            return {
                "point": list(node.point),
                "axis": node.axis,
                "left": conv(node.left),
                "right": conv(node.right),
            }

        return {"k": self.k, "size": self._size, "root": conv(self.root)}
