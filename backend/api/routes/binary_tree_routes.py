from flask import Blueprint

from DataStrcutures import BinaryTree as bt
from api.routes._common import body, fail, ok

bp = Blueprint("binary_tree", __name__, url_prefix="/binary-tree")

MAX_NODES = 63
MAX_INT = 10 ** 9
DEFAULT = [1, 2, 3, 4, 5, None, 6]

root = bt.build_tree(DEFAULT)


def _state():
    return {
        "tree": bt.to_nested(root),
        "count": bt.count_nodes(root),
        "height": bt.height(root),
        "properties": {
            "full": bt.is_full(root),
            "complete": bt.is_complete(root),
            "perfect": bt.is_perfect(root),
            "balanced": bt.is_balanced(root),
        },
        "depths": bt.depths(root),
        "limits": {"max_nodes": MAX_NODES},
    }


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _bad(msg):
    return fail(msg, _state())


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global root
    root = bt.build_tree(DEFAULT)
    return ok(_state())


@bp.route("/build", methods=["POST"])
def build():
    global root
    values = body().get("values")
    if not isinstance(values, list) or len(values) > MAX_NODES:
        return _bad("values must be a list of at most %d entries" % MAX_NODES)
    for v in values:
        if v is not None and not _is_int(v):
            return _bad("each entry must be a whole number or null")
    real = [v for v in values if v is not None]
    if len(set(real)) != len(real):
        return _bad("values must be unique")
    if values and values[0] is None:
        return _bad("the root (first entry) cannot be null")
    new_root = bt.build_tree(values)
    if len(real) != bt.count_nodes(new_root):
        return _bad("entries after a missing parent have no parent; fix the nulls")
    root = new_root
    return ok(_state(), len(real))


def _traversal(name, fn):
    def view():
        return ok(_state(), fn(root))
    view.__name__ = "op_" + name.replace("-", "_")
    bp.add_url_rule("/" + name, view_func=view, methods=["POST"])


_traversal("preorder", bt.preorder)
_traversal("inorder", bt.inorder)
_traversal("postorder", bt.postorder)
_traversal("inorder-iterative", bt.inorder_iterative)
_traversal("level-order", bt.level_order)
_traversal("max-depth", bt.max_depth)


@bp.route("/invert", methods=["POST"])
def invert():
    global root
    root = bt.invert_tree(root)
    return ok(_state(), bt.level_order(root))


@bp.route("/lca", methods=["POST"])
def lca():
    data = body()
    p, q = data.get("p"), data.get("q")
    if not _is_int(p) or not _is_int(q):
        return _bad("p and q must be whole numbers")
    pn, qn = bt.find(root, p), bt.find(root, q)
    if pn is None or qn is None:
        return _bad("both p and q must be values in the tree")
    return ok(_state(), bt.lowest_common_ancestor(root, pn, qn).val)
