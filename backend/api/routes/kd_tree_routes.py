import math

from flask import Blueprint

from DataStrcutures.KdTree import KdTree
from api.routes._common import body, fail, ok

bp = Blueprint("kd_tree", __name__, url_prefix="/kd-tree")

MAX_POINTS = 63
MAX_ABS = 100
DEFAULT = [[7, 2], [5, 4], [9, 6], [2, 3], [4, 7], [8, 1]]
MSG = f"point must be a list of 2 numbers with absolute value up to {MAX_ABS}"


def _fresh():
    t = KdTree(2)
    for p in DEFAULT:
        t.insert(p)
    return t


tree = _fresh()


def _reset():
    global tree
    tree = _fresh()


def _state():
    return {**tree.to_dict(), "limits": {"max_points": MAX_POINTS, "max_abs": MAX_ABS}}


def _bad(msg):
    return fail(msg, _state())


def _num(v):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    if not math.isfinite(v) or abs(v) > MAX_ABS:
        return None
    return int(v) if v == int(v) else v


def _point(v):
    if not isinstance(v, list) or len(v) != 2:
        return None
    out = [_num(x) for x in v]
    return None if any(x is None for x in out) else out


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/clear", methods=["POST"])
def clear():
    global tree
    tree = KdTree(2)
    return ok(_state())


@bp.route("/insert", methods=["POST"])
def insert():
    p = _point(body().get("point"))
    if p is None:
        return _bad(MSG)
    if len(tree) >= MAX_POINTS and not tree.contains(p):
        return _bad(f"tree is limited to {MAX_POINTS} points")
    inserted = tree.insert(p)
    return ok(_state(), {"inserted": inserted, "point": p})


@bp.route("/search", methods=["POST"])
def search():
    p = _point(body().get("point"))
    if p is None:
        return _bad(MSG)
    return ok(_state(), {"found": tree.contains(p), "point": p})


@bp.route("/nearest", methods=["POST"])
def nearest():
    p = _point(body().get("point"))
    if p is None:
        return _bad(MSG)
    if len(tree) == 0:
        return _bad("tree is empty")
    best, d2, visited = tree.nearest(p)
    return ok(
        _state(),
        {"query": p, "point": list(best), "distance_squared": d2,
         "visited": [list(v) for v in visited]},
    )
