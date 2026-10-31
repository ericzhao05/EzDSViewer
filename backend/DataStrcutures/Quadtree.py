class Quadtree:
    """Point quadtree: a leaf holds up to `capacity` points, then splits into four equal quadrants.

    Children are ordered NW, NE, SW, SE (y grows downward, so "north" is the smaller y).
    A point on a dividing line goes to the quadrant with the larger coordinate, so each
    point belongs to exactly one child. A leaf at `max_depth` never splits; it just keeps
    every point, which stops duplicate points from subdividing forever.
    """

    def __init__(self, x=0, y=0, width=100, height=100, capacity=4, max_depth=8, _depth=0):
        if width <= 0 or height <= 0:
            raise ValueError("width and height must be positive")
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        if max_depth < 0:
            raise ValueError("max_depth must not be negative")
        self.x, self.y, self.width, self.height = x, y, width, height
        self.capacity = capacity
        self.max_depth = max_depth
        self.depth = _depth
        self.points = []
        self.children = None  # [NW, NE, SW, SE] once subdivided

    def contains(self, px, py):
        return self.x <= px <= self.x + self.width and self.y <= py <= self.y + self.height

    def _subdivide(self):
        hw, hh = self.width / 2, self.height / 2
        self.children = [
            Quadtree(self.x + dx * hw, self.y + dy * hh, hw, hh,
                     self.capacity, self.max_depth, self.depth + 1)
            for dy in (0, 1) for dx in (0, 1)
        ]
        old, self.points = self.points, []
        for p in old:
            self._child_for(*p).insert(*p)

    def _child_for(self, px, py):
        east = px >= self.x + self.width / 2
        south = py >= self.y + self.height / 2
        return self.children[(2 if south else 0) + (1 if east else 0)]

    def insert(self, px, py):
        """Add a point. Returns False (and stores nothing) if it lies outside the bounds."""
        if not self.contains(px, py):
            return False
        if self.children is not None:
            return self._child_for(px, py).insert(px, py)
        if len(self.points) < self.capacity or self.depth >= self.max_depth:
            self.points.append((px, py))
            return True
        self._subdivide()
        return self._child_for(px, py).insert(px, py)

    def _intersects(self, x0, y0, x1, y1):
        return not (x1 < self.x or x0 > self.x + self.width or
                    y1 < self.y or y0 > self.y + self.height)

    def query_range(self, x0, y0, x1, y1):
        """Points inside the closed rectangle [x0, x1] x [y0, y1]."""
        return self.query_range_stats(x0, y0, x1, y1)[0]

    def query_range_stats(self, x0, y0, x1, y1):
        """(points in the rectangle, number of nodes visited). Quadrants missing the rectangle are pruned."""
        if x0 > x1:
            x0, x1 = x1, x0
        if y0 > y1:
            y0, y1 = y1, y0
        found, visited = [], []
        self._query(x0, y0, x1, y1, found, visited)
        return found, visited

    def _query(self, x0, y0, x1, y1, found, visited):
        if not self._intersects(x0, y0, x1, y1):
            return
        visited.append(self)
        for px, py in self.points:
            if x0 <= px <= x1 and y0 <= py <= y1:
                found.append((px, py))
        if self.children is not None:
            for c in self.children:
                c._query(x0, y0, x1, y1, found, visited)

    def count(self):
        n = len(self.points)
        if self.children is not None:
            n += sum(c.count() for c in self.children)
        return n

    def height_of_tree(self):
        """Depth of the deepest node below this one (a lone leaf is 0)."""
        if self.children is None:
            return 0
        return 1 + max(c.height_of_tree() for c in self.children)

    def node_count(self):
        if self.children is None:
            return 1
        return 1 + sum(c.node_count() for c in self.children)

    def to_dict(self):
        return {
            "x": self.x, "y": self.y, "w": self.width, "h": self.height,
            "depth": self.depth,
            "points": [list(p) for p in self.points],
            "children": None if self.children is None else [c.to_dict() for c in self.children],
        }
