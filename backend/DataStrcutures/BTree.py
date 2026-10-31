from bisect import bisect_left, bisect_right


def _check_order(order):
    if not isinstance(order, int) or isinstance(order, bool) or order < 3:
        raise ValueError("order must be a whole number of at least 3")


class _Node:
    """A node with sorted keys and, unless it is a leaf, len(keys) + 1 children."""

    is_leaf = False

    def __init__(self, keys=None, children=None):
        self.keys = keys if keys is not None else []
        self.children = children if children is not None else []


def _split_moving_median(parent, i):
    """Split an overfull parent.children[i]; the median leaves the node and moves up."""
    child = parent.children[i]
    mid = len(child.keys) // 2
    median = child.keys[mid]
    right = _Node(child.keys[mid + 1:], child.children[mid + 1:])
    del child.keys[mid:]
    del child.children[mid + 1:]
    parent.keys.insert(i, median)
    parent.children.insert(i + 1, right)
    return median


def _borrow_through_parent_from_left(parent, i):
    node, left = parent.children[i], parent.children[i - 1]
    node.keys.insert(0, parent.keys[i - 1])
    parent.keys[i - 1] = left.keys.pop()
    if left.children:
        node.children.insert(0, left.children.pop())


def _borrow_through_parent_from_right(parent, i):
    node, right = parent.children[i], parent.children[i + 1]
    node.keys.append(parent.keys[i])
    parent.keys[i] = right.keys.pop(0)
    if right.children:
        node.children.append(right.children.pop(0))


def _merge_pulling_separator(parent, i):
    """Merge children i and i + 1 around the separator between them."""
    left, right = parent.children[i], parent.children[i + 1]
    left.keys.append(parent.keys.pop(i))
    left.keys.extend(right.keys)
    left.children.extend(right.children)
    parent.children.pop(i + 1)


class BTree:
    """B-tree of order m: at most m children per node, at least ceil(m/2) for internal
    nodes other than the root, all leaves at the same depth. Keys are unique."""

    def __init__(self, order=4):
        _check_order(order)
        self.order = order
        self.max_keys = order - 1
        self.min_keys = (order + 1) // 2 - 1
        self.root = _Node()
        self.size = 0
        self.events = []  # what the last insert or delete did, in plain words

    def __len__(self):
        return self.size

    def __contains__(self, key):
        return self.search(key)

    def height(self):
        if self.size == 0:
            return 0
        levels, node = 1, self.root
        while node.children:
            levels, node = levels + 1, node.children[0]
        return levels

    def keys(self):
        out = []

        def walk(node):
            for i, key in enumerate(node.keys):
                if node.children:
                    walk(node.children[i])
                out.append(key)
            if node.children:
                walk(node.children[-1])

        walk(self.root)
        return out

    def search(self, key):
        return self.search_path(key)[0]

    def search_path(self, key):
        """(found, ids of the nodes read, one per level). Ids match to_dict()."""
        if self.size == 0:
            return False, []
        node, node_id, path = self.root, "r", []
        while True:
            path.append(node_id)
            i = bisect_left(node.keys, key)
            if i < len(node.keys) and node.keys[i] == key:
                return True, path
            if not node.children:
                return False, path
            node, node_id = node.children[i], "%s.%d" % (node_id, i)

    def insert(self, key):
        """Add key. Returns False, changing nothing, if it is already present."""
        self.events = []
        if not self._insert(self.root, key):
            return False
        self.size += 1
        if len(self.root.keys) > self.max_keys:
            old_root = self.root
            self.root = _Node([], [old_root])
            self._split_child(self.root, 0)
            self.events.append("new root: the tree grows one level")
        return True

    def _insert(self, node, key):
        i = bisect_left(node.keys, key)
        if i < len(node.keys) and node.keys[i] == key:
            return False
        if not node.children:
            node.keys.insert(i, key)
            return True
        if not self._insert(node.children[i], key):
            return False
        if len(node.children[i].keys) > self.max_keys:
            self._split_child(node, i)
        return True

    def _split_child(self, parent, i):
        full = list(parent.children[i].keys)
        median = _split_moving_median(parent, i)
        self.events.append("split %s: median %s moves up" % (full, median))

    def delete(self, key):
        """Remove key. Raises KeyError if it is absent."""
        if key not in self:
            raise KeyError(key)
        self.events = []
        self._delete(self.root, key)
        self.size -= 1
        if not self.root.keys and self.root.children:
            self.root = self.root.children[0]
            self.events.append("root emptied: the tree shrinks one level")

    def _delete(self, node, key):
        i = bisect_left(node.keys, key)
        found = i < len(node.keys) and node.keys[i] == key
        if not node.children:
            node.keys.pop(i)
            return
        if found:
            pred = node.children[i]
            while pred.children:
                pred = pred.children[-1]
            pred_key = pred.keys[-1]
            node.keys[i] = pred_key
            self.events.append("replace %s with its predecessor %s" % (key, pred_key))
            key = pred_key
        self._delete(node.children[i], key)
        if len(node.children[i].keys) < self.min_keys:
            self._rebalance(node, i)

    def _rebalance(self, parent, i):
        kids = parent.children
        if i > 0 and len(kids[i - 1].keys) > self.min_keys:
            _borrow_through_parent_from_left(parent, i)
            self.events.append("borrow from left sibling, through the parent")
        elif i < len(kids) - 1 and len(kids[i + 1].keys) > self.min_keys:
            _borrow_through_parent_from_right(parent, i)
            self.events.append("borrow from right sibling, through the parent")
        else:
            at = i - 1 if i > 0 else i
            separator = parent.keys[at]
            _merge_pulling_separator(parent, at)
            self.events.append("merge with a sibling: separator %s moves down" % (separator,))

    def to_dict(self):
        def export(node, node_id):
            return {
                "id": node_id,
                "keys": list(node.keys),
                "leaf": not node.children,
                "children": [export(c, "%s.%d" % (node_id, i)) for i, c in enumerate(node.children)],
            }

        return {
            "order": self.order,
            "size": self.size,
            "height": self.height(),
            "min_keys": self.min_keys,
            "max_keys": self.max_keys,
            "root": export(self.root, "r"),
        }


class _Leaf:
    """A B+ tree leaf: the only kind of node that holds values."""

    is_leaf = True

    def __init__(self, keys=None, values=None, next_leaf=None):
        self.keys = keys if keys is not None else []
        self.values = values if values is not None else []
        self.children = []
        self.next = next_leaf


class BPlusTree:
    """B+ tree of order m. All values sit in linked leaves. Internal keys only route:
    keys in children[i] are < keys[i], and keys in children[i + 1] are >= keys[i]. Deleting
    a key can leave it behind as a separator, where it still routes correctly."""

    def __init__(self, order=4):
        _check_order(order)
        self.order = order
        self.max_keys = order - 1
        self.min_keys = (order + 1) // 2 - 1
        self.min_leaf_keys = order // 2
        self.root = _Leaf()
        self.size = 0
        self.events = []

    def __len__(self):
        return self.size

    def __contains__(self, key):
        return self.search_path(key)[0]

    def height(self):
        if self.size == 0:
            return 0
        levels, node = 1, self.root
        while not node.is_leaf:
            levels, node = levels + 1, node.children[0]
        return levels

    def _first_leaf(self):
        node = self.root
        while not node.is_leaf:
            node = node.children[0]
        return node

    def _descend(self, key):
        """The leaf where key belongs and the ids of the nodes read to reach it."""
        node, node_id, path = self.root, "r", []
        while True:
            path.append(node_id)
            if node.is_leaf:
                return node, path
            i = bisect_right(node.keys, key)
            node, node_id = node.children[i], "%s.%d" % (node_id, i)

    def search(self, key):
        return self.get(key)

    def get(self, key, default=None):
        leaf, _ = self._descend(key)
        i = bisect_left(leaf.keys, key)
        if i < len(leaf.keys) and leaf.keys[i] == key:
            return leaf.values[i]
        return default

    def search_path(self, key):
        """(found, ids of the nodes read). A search always ends in a leaf."""
        if self.size == 0:
            return False, []
        leaf, path = self._descend(key)
        i = bisect_left(leaf.keys, key)
        return i < len(leaf.keys) and leaf.keys[i] == key, path

    def items(self):
        out = []
        leaf = self._first_leaf()
        while leaf:
            out.extend(zip(leaf.keys, leaf.values))
            leaf = leaf.next
        return out

    def keys(self):
        return [k for k, _ in self.items()]

    def range_scan(self, low, high):
        """All (key, value) pairs with low <= key <= high, in key order."""
        return self.range_trace(low, high)["items"]

    def range_trace(self, low, high):
        """range_scan plus how it got there: the descent, then the leaves walked."""
        if low > high:
            raise ValueError("low must not exceed high")
        if self.size == 0:
            return {"items": [], "path": [], "leaves": []}
        ids = self._leaf_ids()
        leaf, path = self._descend(low)
        items, leaves = [], []
        while leaf:
            leaves.append(ids[id(leaf)])
            start = bisect_left(leaf.keys, low)
            stop = bisect_right(leaf.keys, high)
            items.extend(zip(leaf.keys[start:stop], leaf.values[start:stop]))
            if leaf.keys[-1] >= high:
                break
            leaf = leaf.next
        return {"items": items, "path": path, "leaves": leaves}

    def insert(self, key, value=None):
        """Add key, or overwrite its value. Returns True if the key is new."""
        self.events = []
        added = self._insert(self.root, key, value)
        if added:
            self.size += 1
        if len(self.root.keys) > self.max_keys:
            self.root = _Node([], [self.root])
            self._split_child(self.root, 0)
            self.events.append("new root: the tree grows one level")
        return added

    def _insert(self, node, key, value):
        if node.is_leaf:
            i = bisect_left(node.keys, key)
            if i < len(node.keys) and node.keys[i] == key:
                node.values[i] = value
                return False
            node.keys.insert(i, key)
            node.values.insert(i, value)
            return True
        i = bisect_right(node.keys, key)
        added = self._insert(node.children[i], key, value)
        if len(node.children[i].keys) > self.max_keys:
            self._split_child(node, i)
        return added

    def _split_child(self, parent, i):
        child = parent.children[i]
        full = list(child.keys)
        if not child.is_leaf:
            median = _split_moving_median(parent, i)
            self.events.append("split internal node %s: median %s moves up" % (full, median))
            return
        mid = len(child.keys) // 2
        right = _Leaf(child.keys[mid:], child.values[mid:], child.next)
        del child.keys[mid:]
        del child.values[mid:]
        child.next = right
        parent.keys.insert(i, right.keys[0])
        parent.children.insert(i + 1, right)
        self.events.append("split leaf %s: copy %s up as a separator" % (full, right.keys[0]))

    def delete(self, key):
        """Remove key and return its value. Raises KeyError if it is absent."""
        if key not in self:
            raise KeyError(key)
        self.events = []
        value = self._delete(self.root, key)
        self.size -= 1
        if not self.root.is_leaf and not self.root.keys:
            self.root = self.root.children[0]
            self.events.append("root emptied: the tree shrinks one level")
        return value

    def _delete(self, node, key):
        if node.is_leaf:
            i = bisect_left(node.keys, key)
            node.keys.pop(i)
            return node.values.pop(i)
        i = bisect_right(node.keys, key)
        value = self._delete(node.children[i], key)
        child = node.children[i]
        if len(child.keys) < self._minimum(child):
            self._rebalance(node, i)
        return value

    def _minimum(self, node):
        return self.min_leaf_keys if node.is_leaf else self.min_keys

    def _rebalance(self, parent, i):
        kids = parent.children
        if i > 0 and len(kids[i - 1].keys) > self._minimum(kids[i - 1]):
            self._borrow_left(parent, i)
            self.events.append("borrow from left sibling")
        elif i < len(kids) - 1 and len(kids[i + 1].keys) > self._minimum(kids[i + 1]):
            self._borrow_right(parent, i)
            self.events.append("borrow from right sibling")
        else:
            self._merge(parent, i - 1 if i > 0 else i)

    def _borrow_left(self, parent, i):
        node, left = parent.children[i], parent.children[i - 1]
        if not node.is_leaf:
            _borrow_through_parent_from_left(parent, i)
            return
        node.keys.insert(0, left.keys.pop())
        node.values.insert(0, left.values.pop())
        parent.keys[i - 1] = node.keys[0]

    def _borrow_right(self, parent, i):
        node, right = parent.children[i], parent.children[i + 1]
        if not node.is_leaf:
            _borrow_through_parent_from_right(parent, i)
            return
        node.keys.append(right.keys.pop(0))
        node.values.append(right.values.pop(0))
        parent.keys[i] = right.keys[0]

    def _merge(self, parent, i):
        left, right = parent.children[i], parent.children[i + 1]
        if not left.is_leaf:
            separator = parent.keys[i]
            _merge_pulling_separator(parent, i)
            self.events.append("merge internal nodes: separator %s moves down" % (separator,))
            return
        left.keys.extend(right.keys)
        left.values.extend(right.values)
        left.next = right.next
        separator = parent.keys.pop(i)
        parent.children.pop(i + 1)
        self.events.append("merge leaves: separator %s is dropped, the chain is relinked" % (separator,))

    def _leaf_ids(self):
        ids = {}

        def walk(node, node_id):
            if node.is_leaf:
                ids[id(node)] = node_id
            for i, child in enumerate(node.children):
                walk(child, "%s.%d" % (node_id, i))

        walk(self.root, "r")
        return ids

    def to_dict(self):
        ids = self._leaf_ids()

        def export(node, node_id):
            out = {"id": node_id, "keys": list(node.keys), "leaf": node.is_leaf}
            if node.is_leaf:
                out["values"] = list(node.values)
                out["next"] = ids[id(node.next)] if node.next else None
            out["children"] = [export(c, "%s.%d" % (node_id, i)) for i, c in enumerate(node.children)]
            return out

        leaves = []
        leaf = self._first_leaf()
        while leaf:
            leaves.append({"id": ids[id(leaf)], "keys": list(leaf.keys)})
            leaf = leaf.next
        return {
            "order": self.order,
            "size": self.size,
            "height": self.height(),
            "min_keys": self.min_keys,
            "min_leaf_keys": self.min_leaf_keys,
            "max_keys": self.max_keys,
            "root": export(self.root, "r"),
            "leaves": leaves,
        }
