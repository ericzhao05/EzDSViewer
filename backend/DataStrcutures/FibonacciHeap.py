import itertools

_default_ids = itertools.count(1)


class FibonacciNode:
    """A heap entry and the handle decrease_key takes. Siblings form a circular doubly linked list."""

    __slots__ = ("id", "key", "parent", "child", "left", "right", "degree", "mark", "owner")

    def __init__(self, node_id, key, owner):
        self.id = node_id
        self.key = key
        self.parent = None
        self.child = None  # any one child; the rest are reachable through its ring
        self.left = self
        self.right = self
        self.degree = 0
        self.mark = False  # True once this non-root node has lost a child
        self.owner = owner


class _Owner:
    """Identifies a heap. A merge forwards one owner to another, so merge never touches each node."""

    __slots__ = ("forward",)

    def __init__(self):
        self.forward = None

    def find(self):
        root = self
        while root.forward is not None:
            root = root.forward
        cur = self
        while cur.forward is not None:
            cur.forward, cur = root, cur.forward
        return root


def _ring(node):
    """The members of a circular sibling list as a Python list. Empty for None."""
    out = []
    if node is None:
        return out
    cur = node
    while True:
        out.append(cur)
        cur = cur.right
        if cur is node:
            return out


def _splice(a, b):
    """Join two circular lists into one, in O(1)."""
    a_right, b_left = a.right, b.left
    a.right = b
    b.left = a
    b_left.right = a_right
    a_right.left = b_left


def _unlink(node):
    node.left.right = node.right
    node.right.left = node.left
    node.left = node
    node.right = node


class FibonacciHeap:
    """A min-priority queue that does its work lazily.

    insert and merge only splice into the root list. extract_min pays for that by consolidating
    the roots until no two share a degree. decrease_key cuts a node out when it would break heap
    order, and a parent that loses a second child is cut too (the mark bit records the first
    loss), which keeps tree sizes exponential in their degree.
    """

    def __init__(self, ids=None):
        self._ids = ids if ids is not None else _default_ids
        self._owner = _Owner()
        self._size = 0
        self.min = None
        self.last_links = []  # what the last extract_min's consolidation did
        self.last_cuts = []  # what the last decrease_key cut
        self.last_marked = None  # key of the node the last decrease_key marked

    def __len__(self):
        return self._size

    def insert(self, key):
        """Add key as a new one-node tree. Returns the node, the handle for decrease_key."""
        node = FibonacciNode(next(self._ids), key, self._owner)
        if self.min is None:
            self.min = node
        else:
            _splice(self.min, node)
            if key < self.min.key:
                self.min = node
        self._size += 1
        return node

    def find_min(self):
        if self.min is None:
            raise IndexError("find_min from empty heap")
        return self.min.key

    def extract_min(self):
        """Remove and return the smallest key, then consolidate the root list."""
        removed = self.min
        if removed is None:
            raise IndexError("extract_min from empty heap")
        roots = [root for root in _ring(removed) if root is not removed]
        for child in _ring(removed.child):
            child.parent = None
            child.mark = False
            roots.append(child)
        removed.child = None
        removed.left = removed
        removed.right = removed
        removed.degree = 0
        removed.owner = None
        self._size -= 1
        self.last_links = []
        self._consolidate(roots)
        return removed.key

    def decrease_key(self, node, new_key):
        """Lower node's key, cutting it from its parent if that would break heap order."""
        self._check_owned(node)
        if new_key > node.key:
            raise ValueError("new key is larger than the current key")
        self.last_cuts = []
        self.last_marked = None
        old_key = node.key
        node.key = new_key
        parent = node.parent
        if parent is not None and new_key < parent.key:
            self._cut(node, parent, old_key, False)
            self._cascading_cut(parent)
        if new_key < self.min.key:
            self.min = node

    def merge(self, other):
        """Move every node of other into this heap in O(1). other is left empty and reusable."""
        if not isinstance(other, FibonacciHeap):
            raise TypeError("can only merge another FibonacciHeap")
        if other is self:
            raise ValueError("cannot merge a heap with itself")
        if other.min is None:
            return
        if self.min is None:
            self.min = other.min
        else:
            _splice(self.min, other.min)
            if other.min.key < self.min.key:
                self.min = other.min
        self._size += other._size
        other._owner.forward = self._owner
        other._owner = _Owner()
        other.min = None
        other._size = 0

    def nodes(self):
        """Every node, in no particular order."""
        out = []
        stack = _ring(self.min)
        while stack:
            node = stack.pop()
            out.append(node)
            stack.extend(_ring(node.child))
        return out

    def to_dict(self):
        """The root list, walked from the min pointer, with each tree nested inside it."""
        roots = _ring(self.min)
        marked = sum(1 for node in self.nodes() if node.mark)
        return {
            "size": self._size,
            "min_id": self.min.id if self.min else None,
            "min_key": self.min.key if self.min else None,
            "trees": len(roots),
            "marked": marked,
            "potential": len(roots) + 2 * marked,
            "roots": [self._node_dict(root) for root in roots],
        }

    def _node_dict(self, node):
        return {
            "id": node.id,
            "key": node.key,
            "degree": node.degree,
            "mark": node.mark,
            "children": [self._node_dict(child) for child in _ring(node.child)],
        }

    def _check_owned(self, node):
        if node.owner is None or node.owner.find() is not self._owner:
            raise ValueError("node is not in this heap")

    def _consolidate(self, roots):
        by_degree = {}
        for x in roots:
            x.left = x
            x.right = x
            while x.degree in by_degree:
                y = by_degree.pop(x.degree)
                if y.key < x.key:
                    x, y = y, x
                self._link(y, x)
            by_degree[x.degree] = x
        self.min = None
        for degree in sorted(by_degree):
            root = by_degree[degree]
            if self.min is None:
                self.min = root
            else:
                _splice(self.min.left, root)
                if root.key < self.min.key:
                    self.min = root

    def _link(self, child, parent):
        self.last_links.append({"child_key": child.key, "parent_key": parent.key, "degree": parent.degree})
        child.parent = parent
        child.mark = False
        if parent.child is None:
            parent.child = child
        else:
            _splice(parent.child, child)
        parent.degree += 1

    def _cut(self, node, parent, old_key, cascading):
        self.last_cuts.append(
            {"key": node.key, "old_key": old_key, "parent_key": parent.key, "cascading": cascading}
        )
        if parent.child is node:
            parent.child = node.right if node.right is not node else None
        _unlink(node)
        parent.degree -= 1
        node.parent = None
        node.mark = False
        _splice(self.min, node)

    def _cascading_cut(self, node):
        while node.parent is not None:
            if not node.mark:
                node.mark = True
                self.last_marked = node.key
                return
            parent = node.parent
            self._cut(node, parent, node.key, True)
            node = parent
