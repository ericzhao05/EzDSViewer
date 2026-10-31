class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def bst_search(root, target):
    while root and root.val != target:
        root = root.left if target < root.val else root.right
    return root


def bst_insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = bst_insert(root.left, val)
    elif val > root.val:
        root.right = bst_insert(root.right, val)
    return root


def bst_delete(root, val):
    if not root:
        return None
    if val < root.val:
        root.left = bst_delete(root.left, val)
    elif val > root.val:
        root.right = bst_delete(root.right, val)
    else:
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        successor = root.right
        while successor.left:
            successor = successor.left
        root.val = successor.val
        root.right = bst_delete(root.right, successor.val)
    return root


def is_valid_bst(root, low=float("-inf"), high=float("inf")):
    if not root:
        return True
    if not low < root.val < high:
        return False
    return is_valid_bst(root.left, low, root.val) and is_valid_bst(root.right, root.val, high)


def kth_smallest(root, k):
    stack = []
    while True:
        while root:
            stack.append(root)
            root = root.left
        root = stack.pop()
        k -= 1
        if k == 0:
            return root.val
        root = root.right


# ---- helpers used by the API and view ----

def search_path(root, target):
    """Values visited while searching for target."""
    path = []
    while root:
        path.append(root.val)
        if root.val == target:
            break
        root = root.left if target < root.val else root.right
    return path


def delete_case(root, val):
    """Which deletion case applies: 'leaf', 'one-child', 'two-children' or None if absent."""
    node = bst_search(root, val)
    if node is None:
        return None
    if node.left and node.right:
        return "two-children"
    if node.left or node.right:
        return "one-child"
    return "leaf"


def inorder_successor(root, val):
    node = bst_search(root, val)
    if node is None or not (node.left and node.right):
        return None
    node = node.right
    while node.left:
        node = node.left
    return node.val


def inorder(root):
    out, stack = [], []
    while root or stack:
        while root:
            stack.append(root)
            root = root.left
        root = stack.pop()
        out.append(root.val)
        root = root.right
    return out


def count_nodes(root):
    return len(inorder(root))


def height(root):
    """Height in edges; an empty tree is -1."""
    if not root:
        return -1
    level, nodes = -1, [root]
    while nodes:
        level += 1
        nodes = [c for n in nodes for c in (n.left, n.right) if c]
    return level


def lowest_common_ancestor(root, p, q):
    """LCA of two values in a BST, or None if the walk falls off the tree."""
    lo, hi = min(p, q), max(p, q)
    while root:
        if hi < root.val:
            root = root.left
        elif lo > root.val:
            root = root.right
        else:
            return root.val
    return None


def to_nested(root):
    if not root:
        return None
    return {"val": root.val, "left": to_nested(root.left), "right": to_nested(root.right)}


def from_level_order(values):
    """Raw (not BST-ordered) tree from a level-order list with None holes."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, i = [root], 1
    while queue and i < len(values):
        node = queue.pop(0)
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root
