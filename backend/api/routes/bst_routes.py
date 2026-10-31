import math

from flask import Blueprint

from DataStrcutures import BinarySearchTree as b
from api.routes._common import body, fail, ok

bp = Blueprint("bst", __name__, url_prefix="/bst")

MAX_NODES = 31
MAX_ABS = 10 ** 9
DEFAULT = [50, 30, 70, 20, 40, 60, 80]

root = None


def _fresh():
    r = None
    for v in DEFAULT:
        r = b.bst_insert(r, v)
    return r


root = _fresh()


def _state():
    return {
        "tree": b.to_nested(root),
        "count": b.count_nodes(root),
        "height": b.height(root),
        "inorder": b.inorder(root),
        "limits": {"max_nodes": MAX_NODES},
    }


def _bad(msg):
    return fail(msg, _state())


def _is_int(v):
    return (isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_ABS) or (
        isinstance(v, float) and math.isfinite(v) and v == int(v) and abs(v) <= MAX_ABS
    )


def _val(data, key="value"):
    v = data.get(key)
    return int(v) if _is_int(v) else None


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global root
    root = _fresh()
    return ok(_state())


@bp.route("/clear", methods=["POST"])
def clear():
    global root
    root = None
    return ok(_state())


@bp.route("/insert", methods=["POST"])
def insert():
    global root
    v = _val(body())
    if v is None:
        return _bad("value must be a whole number")
    if b.bst_search(root, v):
        return _bad("%d is already in the tree; duplicates are ignored" % v)
    if b.count_nodes(root) >= MAX_NODES:
        return _bad("tree is full (at most %d nodes)" % MAX_NODES)
    path = b.search_path(root, v)
    root = b.bst_insert(root, v)
    return ok(_state(), {"inserted": v, "path": path})


@bp.route("/search", methods=["POST"])
def search():
    v = _val(body())
    if v is None:
        return _bad("value must be a whole number")
    return ok(_state(), {"found": b.bst_search(root, v) is not None, "path": b.search_path(root, v)})


@bp.route("/delete", methods=["POST"])
def delete():
    global root
    v = _val(body())
    if v is None:
        return _bad("value must be a whole number")
    case = b.delete_case(root, v)
    if case is None:
        return _bad("%d is not in the tree" % v)
    successor = b.inorder_successor(root, v)
    path = b.search_path(root, v)
    root = b.bst_delete(root, v)
    return ok(_state(), {"deleted": v, "case": case, "successor": successor, "path": path})


@bp.route("/kth-smallest", methods=["POST"])
def kth():
    k = _val(body(), "k")
    n = b.count_nodes(root)
    if k is None or k < 1 or k > n:
        return _bad("k must be a whole number from 1 to %d" % n)
    return ok(_state(), {"k": k, "value": b.kth_smallest(root, k)})


@bp.route("/inorder", methods=["POST"])
def inorder():
    return ok(_state(), b.inorder(root))


@bp.route("/lca", methods=["POST"])
def lca():
    data = body()
    p, q = _val(data, "p"), _val(data, "q")
    if p is None or q is None:
        return _bad("p and q must be whole numbers")
    if not b.bst_search(root, p) or not b.bst_search(root, q):
        return _bad("both p and q must be values in the tree")
    return ok(_state(), b.lowest_common_ancestor(root, p, q))


@bp.route("/build", methods=["POST"])
def build():
    global root
    values = body().get("values")
    if not isinstance(values, list) or len(values) > MAX_NODES:
        return _bad("values must be a list of at most %d numbers" % MAX_NODES)
    ints = []
    for v in values:
        if not _is_int(v):
            return _bad("each value must be a whole number")
        ints.append(int(v))
    r = None
    for v in ints:
        r = b.bst_insert(r, v)  # duplicates are ignored
    root = r
    return ok(_state(), b.count_nodes(root))


@bp.route("/is-valid", methods=["POST"])
def is_valid():
    """Validate the live tree, or a raw level-order list (null holes allowed) if 'values' is given."""
    data = body()
    if "values" not in data:
        return ok(_state(), {"valid": b.is_valid_bst(root), "checked": "current tree"})
    values = data["values"]
    if not isinstance(values, list) or len(values) > MAX_NODES:
        return _bad("values must be a list of at most %d entries" % MAX_NODES)
    for v in values:
        if v is not None and not _is_int(v):
            return _bad("each entry must be a whole number or null")
    if values and values[0] is None:
        return _bad("the root (first entry) cannot be null")
    raw = b.from_level_order([None if v is None else int(v) for v in values])
    return ok(_state(), {"valid": b.is_valid_bst(raw), "checked": "level-order list"})
