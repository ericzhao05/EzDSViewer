"""Balanced search trees: AVL (ds.md section 14, plus delete) and red-black (CLRS insert and delete)."""
import math

RED = "red"
BLACK = "black"

_OTHER = {"left": "right", "right": "left"}

AVL_CASES = {
    "left-left": [30, 20, 10],
    "right-right": [10, 20, 30],
    "left-right": [30, 10, 20],
    "right-left": [10, 30, 20],
}


class _Trace:
    """Records the steps of one operation, each with a picture of the whole tree.

    A step waits in `pending` until settle(): during the AVL recursion a rotated subtree is not
    linked to its parent until the call returns, so a picture taken too early would be wrong.
    Without a snapshot function only the rotation count is kept.
    """

    def __init__(self, snapshot=None):
        self.snapshot = snapshot
        self.steps = []
        self.pending = []
        self.rotations = 0

    def add(self, kind, text, **info):
        if kind == "rotate":
            self.rotations += 1
        if self.snapshot:
            step = {"kind": kind, "text": text, **info}
            self.steps.append(step)
            self.pending.append(step)

    def settle(self):
        if self.pending:
            tree = self.snapshot()
            for step in self.pending:
                step["tree"] = tree
            self.pending = []


_SILENT = _Trace()


class AVLNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
        self.height = 1


def _height(node):
    return node.height if node else 0


def _update_height(node):
    node.height = 1 + max(_height(node.left), _height(node.right))


def _balance(node):
    return _height(node.left) - _height(node.right)


def _rotate_right(y):
    x = y.left
    y.left, x.right = x.right, y
    _update_height(y)
    _update_height(x)
    return x


def _rotate_left(x):
    y = x.right
    x.right, y.left = y.left, x
    _update_height(x)
    _update_height(y)
    return y


def _turn(node, direction, trace):
    new_top = _rotate_right(node) if direction == "right" else _rotate_left(node)
    trace.add(
        "rotate",
        "Rotate %s at %s: %s moves up." % (direction, node.val, new_top.val),
        pivot=node.val,
        direction=direction,
    )
    return new_top


def _restore(node, case, trace):
    """Apply the fix for a named imbalance and return the subtree's new root."""
    trace.add(
        "imbalance",
        "%s has balance %+d: %s case." % (node.val, _balance(node), case),
        pivot=node.val,
        case=case,
    )
    trace.settle()
    if case == "left-right":
        node.left = _turn(node.left, "left", trace)
        trace.settle()
    elif case == "right-left":
        node.right = _turn(node.right, "right", trace)
        trace.settle()
    return _turn(node, "right" if case.startswith("left") else "left", trace)


def avl_insert(node, val, trace=_SILENT):
    if not node:
        return AVLNode(val)
    if val < node.val:
        node.left = avl_insert(node.left, val, trace)
    elif val > node.val:
        node.right = avl_insert(node.right, val, trace)
    else:
        return node

    trace.settle()
    _update_height(node)
    balance = _balance(node)
    if balance > 1:
        return _restore(node, "left-right" if val > node.left.val else "left-left", trace)
    if balance < -1:
        return _restore(node, "right-left" if val < node.right.val else "right-right", trace)
    return node


def avl_delete(node, val, trace=_SILENT):
    if not node:
        return None
    if val < node.val:
        node.left = avl_delete(node.left, val, trace)
    elif val > node.val:
        node.right = avl_delete(node.right, val, trace)
    else:
        if not node.left or not node.right:
            return node.left or node.right
        successor = node.right
        while successor.left:
            successor = successor.left
        node.val = successor.val
        node.right = avl_delete(node.right, successor.val, trace)

    trace.settle()
    _update_height(node)
    balance = _balance(node)
    if balance > 1:
        return _restore(node, "left-right" if _balance(node.left) < 0 else "left-left", trace)
    if balance < -1:
        return _restore(node, "right-left" if _balance(node.right) > 0 else "right-right", trace)
    return node


def _avl_snapshot(node):
    """Nested dict of the subtree. Heights come from the structure, since stored ones can lag mid-fix."""
    if not node:
        return None
    left = _avl_snapshot(node.left)
    right = _avl_snapshot(node.right)
    lh = left["height"] if left else 0
    rh = right["height"] if right else 0
    return {
        "val": node.val,
        "height": 1 + max(lh, rh),
        "balance": lh - rh,
        "left": left,
        "right": right,
    }


class _SearchTree:
    """What AVLTree and RedBlackTree share. `nil` marks an absent child; height counts levels."""

    nil = None

    def __init__(self):
        self.root = self.nil
        self.size = 0
        self.rotations = 0

    def search(self, val):
        path = []
        node = self.root
        while node is not self.nil:
            path.append(node.val)
            if val == node.val:
                return {"found": True, "path": path}
            node = node.left if val < node.val else node.right
        return {"found": False, "path": path}

    def contains(self, val):
        return self.search(val)["found"]

    def inorder(self):
        out = []

        def walk(node):
            if node is not self.nil:
                walk(node.left)
                out.append(node.val)
                walk(node.right)

        walk(self.root)
        return out

    def height(self):
        def walk(node):
            return 0 if node is self.nil else 1 + max(walk(node.left), walk(node.right))

        return walk(self.root)

    def _new_trace(self, record):
        return _Trace(self.to_dict if record else None)

    def _finish(self, trace, size_change):
        trace.settle()
        self.size += size_change
        self.rotations += trace.rotations
        return {"changed": True, "steps": trace.steps, "rotations": trace.rotations}


_UNCHANGED = {"changed": False, "rotations": 0}


class AVLTree(_SearchTree):
    def __init__(self, values=()):
        super().__init__()
        for v in values:
            self.insert(v, record=False)

    def to_dict(self):
        return _avl_snapshot(self.root)

    def insert(self, val, record=True):
        if self.contains(val):
            return {**_UNCHANGED, "steps": []}
        trace = self._new_trace(record)
        trace.add("start", "Before inserting %s." % val)
        trace.settle()
        trace.add("place", "Place %s as a leaf, as in a plain BST." % val, pivot=val)
        self.root = avl_insert(self.root, val, trace)
        return self._finish(trace, 1)

    def delete(self, val, record=True):
        if not self.contains(val):
            return {**_UNCHANGED, "steps": []}
        trace = self._new_trace(record)
        trace.add("start", "Before deleting %s." % val)
        trace.settle()
        trace.add("remove", "Remove %s, as in a plain BST." % val)
        self.root = avl_delete(self.root, val, trace)
        return self._finish(trace, -1)

    def height_bound(self):
        """About 1.44 log2 n, rounded for display; None for an empty tree."""
        return round(1.44 * math.log2(self.size), 2) if self.size else None


class RBNode:
    def __init__(self, val, color, nil):
        self.val = val
        self.color = color
        self.left = nil
        self.right = nil
        self.parent = nil


class RedBlackTree(_SearchTree):
    """Rules: the root is black, no red node has a red child, and all root-to-leaf paths have the
    same number of black nodes."""

    def __init__(self, values=()):
        self.nil = RBNode(None, BLACK, None)
        self.nil.left = self.nil.right = self.nil.parent = self.nil
        super().__init__()
        for v in values:
            self.insert(v, record=False)

    def to_dict(self):
        def walk(node):
            if node is self.nil:
                return None
            return {"val": node.val, "color": node.color, "left": walk(node.left), "right": walk(node.right)}

        return walk(self.root)

    def black_height(self):
        """Black nodes on any path from the root down, not counting the empty leaves."""
        count = 0
        node = self.root
        while node is not self.nil:
            if node.color == BLACK:
                count += 1
            node = node.left
        return count

    def height_bound(self):
        """At most 2 log2(n + 1), rounded for display; None for an empty tree."""
        return round(2 * math.log2(self.size + 1), 2) if self.size else None

    def _rotate(self, x, side, trace):
        """Rotate toward `side`: x's child on the other side moves up."""
        other = _OTHER[side]
        y = getattr(x, other)
        inner = getattr(y, side)
        setattr(x, other, inner)
        if inner is not self.nil:
            inner.parent = x
        y.parent = x.parent
        if x.parent is self.nil:
            self.root = y
        elif x is x.parent.left:
            x.parent.left = y
        else:
            x.parent.right = y
        setattr(y, side, x)
        x.parent = y
        trace.add(
            "rotate",
            "Rotate %s at %s: %s moves up." % (side, x.val, y.val),
            pivot=x.val,
            direction=side,
        )
        trace.settle()

    def insert(self, val, record=True):
        if self.contains(val):
            return {**_UNCHANGED, "steps": []}
        trace = self._new_trace(record)
        trace.add("start", "Before inserting %s." % val)
        trace.settle()

        z = RBNode(val, RED, self.nil)
        parent = self.nil
        node = self.root
        while node is not self.nil:
            parent = node
            node = node.left if val < node.val else node.right
        z.parent = parent
        if parent is self.nil:
            self.root = z
        elif val < parent.val:
            parent.left = z
        else:
            parent.right = z
        trace.add("place", "Place %s as a red leaf." % val, pivot=val)
        trace.settle()

        self._insert_fixup(z, trace)
        return self._finish(trace, 1)

    def _insert_fixup(self, z, trace):
        while z.parent.color == RED:
            parent = z.parent
            grand = parent.parent
            side = "left" if parent is grand.left else "right"
            other = _OTHER[side]
            uncle = getattr(grand, other)
            if uncle.color == RED:
                parent.color = uncle.color = BLACK
                grand.color = RED
                trace.add(
                    "recolor",
                    "%s and its parent %s are both red, and uncle %s is red: "
                    "make parent and uncle black, grandparent %s red." % (z.val, parent.val, uncle.val, grand.val),
                    pivot=grand.val,
                )
                trace.settle()
                z = grand
                continue
            if z is getattr(parent, other):
                # Triangle: rotate it into a line, then the old parent is the lower red node.
                z = parent
                self._rotate(z, side, trace)
                parent = z.parent
            parent.color = BLACK
            grand.color = RED
            trace.add(
                "recolor",
                "Red-red with a black uncle: make %s black and grandparent %s red." % (parent.val, grand.val),
                pivot=parent.val,
            )
            trace.settle()
            self._rotate(grand, other, trace)
        if self.root.color == RED:
            self.root.color = BLACK
            trace.add("recolor", "The root must be black: color %s black." % self.root.val, pivot=self.root.val)
            trace.settle()

    def _transplant(self, u, v):
        if u.parent is self.nil:
            self.root = v
        elif u is u.parent.left:
            u.parent.left = v
        else:
            u.parent.right = v
        v.parent = u.parent

    def delete(self, val, record=True):
        z = self.root
        while z is not self.nil and z.val != val:
            z = z.left if val < z.val else z.right
        if z is self.nil:
            return {**_UNCHANGED, "steps": []}

        trace = self._new_trace(record)
        trace.add("start", "Before deleting %s." % val)
        trace.settle()

        removed_color = z.color
        if z.left is self.nil:
            x = z.right
            self._transplant(z, x)
        elif z.right is self.nil:
            x = z.left
            self._transplant(z, x)
        else:
            y = z.right
            while y.left is not self.nil:
                y = y.left
            removed_color = y.color
            x = y.right
            if y.parent is z:
                x.parent = y
            else:
                self._transplant(y, x)
                y.right = z.right
                y.right.parent = y
            self._transplant(z, y)
            y.left = z.left
            y.left.parent = y
            y.color = z.color

        if removed_color == BLACK:
            trace.add("remove", "Remove %s. A black node left its path, so that path is one black short." % val)
            trace.settle()
            self._delete_fixup(x, trace)
        else:
            trace.add("remove", "Remove %s. Only a red node left its path, so the rules still hold." % val)
            trace.settle()
        return self._finish(trace, -1)

    def _delete_fixup(self, x, trace):
        while x is not self.root and x.color == BLACK:
            parent = x.parent
            side = "left" if x is parent.left else "right"
            other = _OTHER[side]
            sibling = getattr(parent, other)
            if sibling.color == RED:
                sibling.color = BLACK
                parent.color = RED
                trace.add(
                    "recolor",
                    "Sibling %s is red: make it black and parent %s red." % (sibling.val, parent.val),
                    pivot=sibling.val,
                )
                trace.settle()
                self._rotate(parent, side, trace)
                sibling = getattr(parent, other)
            if getattr(sibling, side).color == BLACK and getattr(sibling, other).color == BLACK:
                sibling.color = RED
                trace.add(
                    "recolor",
                    "Sibling %s has two black children: make it red and pass the shortage up to %s."
                    % (sibling.val, parent.val),
                    pivot=sibling.val,
                )
                trace.settle()
                x = parent
                continue
            if getattr(sibling, other).color == BLACK:
                near = getattr(sibling, side)
                near.color = BLACK
                sibling.color = RED
                trace.add(
                    "recolor",
                    "Sibling %s has a red child on the near side: swap colors with %s." % (sibling.val, near.val),
                    pivot=near.val,
                )
                trace.settle()
                self._rotate(sibling, other, trace)
                sibling = getattr(parent, other)
            far = getattr(sibling, other)
            sibling.color = parent.color
            parent.color = BLACK
            far.color = BLACK
            trace.add(
                "recolor",
                "Sibling %s has a red child on the far side: %s takes parent %s's color; parent and %s turn black."
                % (sibling.val, sibling.val, parent.val, far.val),
                pivot=sibling.val,
            )
            trace.settle()
            self._rotate(parent, side, trace)
            x = self.root
        if x.color == RED:
            x.color = BLACK
            trace.add("recolor", "Color %s black to restore the missing black." % x.val, pivot=x.val)
            trace.settle()


def rotation_demo(direction):
    """The section's rotation diagram with A, x, B, y, C as 1 to 5. Direction is left or right."""
    a, x, b, y, c = (AVLNode(v) for v in (1, 2, 3, 4, 5))
    if direction == "right":
        y.left, y.right = x, c
        x.left, x.right = a, b
        lower, top = x, y
    else:
        x.left, x.right = a, y
        y.left, y.right = b, c
        lower, top = y, x
    _update_height(lower)
    _update_height(top)
    before = _avl_snapshot(top)
    after = _avl_snapshot(_rotate_right(top) if direction == "right" else _rotate_left(top))
    return {"direction": direction, "before": before, "after": after, "inorder": [1, 2, 3, 4, 5]}


def avl_case(name):
    """Build the three-node tree for a named imbalance; return it and the last insert's outcome."""
    first, second, last = AVL_CASES[name]
    tree = AVLTree([first, second])
    return tree, tree.insert(last)


def compare(values):
    """Insert the values into a fresh AVL and red-black tree, then delete them in the same order."""
    count = len(set(values))
    out = {"count": count}
    for name, tree in (("avl", AVLTree()), ("rb", RedBlackTree())):
        for v in values:
            tree.insert(v, record=False)
        height = tree.height()
        bound = tree.height_bound()
        inserted = tree.rotations
        for v in values:
            tree.delete(v, record=False)
        out[name] = {
            "height": height,
            "height_bound": bound,
            "insert_rotations": inserted,
            "delete_rotations": tree.rotations - inserted,
        }
    return out
