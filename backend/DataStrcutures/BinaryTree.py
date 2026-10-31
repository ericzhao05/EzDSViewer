from collections import deque


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def preorder(root):
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)


def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)


def postorder(root):
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]


def inorder_iterative(root):
    result, stack = [], []
    while root or stack:
        while root:
            stack.append(root)
            root = root.left
        root = stack.pop()
        result.append(root.val)
        root = root.right
    return result


def level_order(root):
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result


def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))


def invert_tree(root):
    if root:
        root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root


def lowest_common_ancestor(root, p, q):
    if not root or root is p or root is q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root
    return left or right


# ---- helpers for the API and view (not part of the ds.md reference) ----

def build_tree(values):
    """Builds a tree from a level-order list where None marks a missing child
    (the LeetCode format). Returns the root, or None for an empty list."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, i = deque([root]), 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def to_nested(root):
    if not root:
        return None
    return {"val": root.val, "left": to_nested(root.left), "right": to_nested(root.right)}


def find(root, val):
    """First node (preorder) holding val, or None."""
    if not root:
        return None
    if root.val == val:
        return root
    return find(root.left, val) or find(root.right, val)


def count_nodes(root):
    return 0 if not root else 1 + count_nodes(root.left) + count_nodes(root.right)


def height(root):
    """Height in edges; an empty tree is -1, a single node 0."""
    return max_depth(root) - 1


def is_full(root):
    if not root:
        return True
    if (root.left is None) != (root.right is None):
        return False
    return is_full(root.left) and is_full(root.right)


def is_perfect(root):
    n = count_nodes(root)
    return n == 0 or n == 2 ** max_depth(root) - 1


def is_complete(root):
    if not root:
        return True
    queue, seen_gap = deque([root]), False
    while queue:
        node = queue.popleft()
        for child in (node.left, node.right):
            if child is None:
                seen_gap = True
            else:
                if seen_gap:
                    return False
                queue.append(child)
    return True


def is_balanced(root):
    """Heights of left and right subtrees differ by at most 1 at every node."""
    def check(node):
        if not node:
            return 0
        a = check(node.left)
        if a < 0:
            return -1
        b = check(node.right)
        if b < 0 or abs(a - b) > 1:
            return -1
        return 1 + max(a, b)
    return check(root) >= 0


def depths(root):
    """Map of node value to depth in edges (values are unique in the API)."""
    out, queue = {}, deque([(root, 0)] if root else [])
    while queue:
        node, d = queue.popleft()
        out[node.val] = d
        for c in (node.left, node.right):
            if c:
                queue.append((c, d + 1))
    return out
