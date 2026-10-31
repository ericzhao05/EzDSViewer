import math

from flask import Blueprint

from DataStrcutures import BalancedTrees as t
from api.routes._common import body, fail, ok

bp = Blueprint("balanced_trees", __name__, url_prefix="/balanced-trees")

MAX_NODES = 31
MAX_COMPARE = 1000
MAX_ABS = 10 ** 9
DEFAULT = [10, 20, 30, 40, 50, 25]

TREE_CLASSES = {"avl": t.AVLTree, "rb": t.RedBlackTree}

trees = {}


def _reset():
    for kind, cls in TREE_CLASSES.items():
        trees[kind] = cls(DEFAULT)


_reset()


def _tree_state(kind):
    tree = trees[kind]
    state = {
        "tree": tree.to_dict(),
        "count": tree.size,
        "height": tree.height(),
        "height_bound": tree.height_bound(),
        "inorder": tree.inorder(),
        "rotations": tree.rotations,
    }
    if kind == "rb":
        state["black_height"] = tree.black_height()
    return state


def _state():
    return {
        "avl": _tree_state("avl"),
        "rb": _tree_state("rb"),
        "limits": {"max_nodes": MAX_NODES, "max_compare": MAX_COMPARE},
    }


def _bad(msg):
    return fail(msg, _state())


def _int(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, float) and math.isfinite(v) and v == int(v):
        v = int(v)
    if isinstance(v, int) and abs(v) <= MAX_ABS:
        return v
    return None


def _int_list(v, limit):
    if not isinstance(v, list) or len(v) > limit:
        return None
    out = [_int(x) for x in v]
    return None if any(x is None for x in out) else out


def _value():
    return _int(body().get("value"))


BAD_VALUE = "value must be a whole number (absolute value up to 1000000000)"


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/<any(avl, rb):kind>-insert", methods=["POST"])
def insert(kind):
    v = _value()
    if v is None:
        return _bad(BAD_VALUE)
    tree = trees[kind]
    if tree.contains(v):
        return _bad("%d is already in the tree; duplicates are ignored" % v)
    if tree.size >= MAX_NODES:
        return _bad("tree is full (at most %d nodes)" % MAX_NODES)
    outcome = tree.insert(v)
    return ok(_state(), {"value": v, "steps": outcome["steps"], "rotations": outcome["rotations"]})


@bp.route("/<any(avl, rb):kind>-delete", methods=["POST"])
def delete(kind):
    v = _value()
    if v is None:
        return _bad(BAD_VALUE)
    tree = trees[kind]
    if not tree.contains(v):
        return _bad("%d is not in the tree" % v)
    outcome = tree.delete(v)
    return ok(_state(), {"value": v, "steps": outcome["steps"], "rotations": outcome["rotations"]})


@bp.route("/<any(avl, rb):kind>-search", methods=["POST"])
def search(kind):
    v = _value()
    if v is None:
        return _bad(BAD_VALUE)
    return ok(_state(), {"value": v, **trees[kind].search(v)})


@bp.route("/<any(avl, rb):kind>-build", methods=["POST"])
def build(kind):
    values = _int_list(body().get("values"), MAX_NODES)
    if values is None:
        return _bad("values must be a list of up to %d whole numbers" % MAX_NODES)
    trees[kind] = TREE_CLASSES[kind](values)
    return ok(_state(), {"count": trees[kind].size, "rotations": trees[kind].rotations})


@bp.route("/avl-case", methods=["POST"])
def avl_case():
    name = body().get("case")
    if not isinstance(name, str) or name not in t.AVL_CASES:
        return _bad("case must be one of: " + ", ".join(t.AVL_CASES))
    tree, outcome = t.avl_case(name)
    trees["avl"] = tree
    return ok(_state(), {"case": name, "steps": outcome["steps"], "rotations": outcome["rotations"]})


@bp.route("/rotate", methods=["POST"])
def rotate():
    direction = body().get("direction")
    if direction not in ("left", "right"):
        return _bad("direction must be left or right")
    return ok(_state(), t.rotation_demo(direction))


@bp.route("/compare", methods=["POST"])
def compare():
    values = _int_list(body().get("values"), MAX_COMPARE)
    if not values:
        return _bad("values must be a non-empty list of up to %d whole numbers" % MAX_COMPARE)
    return ok(_state(), t.compare(values))
