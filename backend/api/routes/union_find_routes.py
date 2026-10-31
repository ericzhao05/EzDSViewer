import math

from flask import Blueprint

from DataStrcutures.UnionFind import UnionFind
from api.routes._common import body, fail, ok

bp = Blueprint("union_find", __name__, url_prefix="/union-find")

MAX_SIZE = 20
DEFAULT_SIZE = 8

uf = UnionFind(DEFAULT_SIZE)


def _state():
    d = uf.to_dict()
    d["limits"] = {"max_size": MAX_SIZE}
    return d


def _bad(msg):
    return fail(msg, _state())


def _int(v):
    if isinstance(v, float) and math.isfinite(v) and v == int(v):
        v = int(v)
    if not isinstance(v, int) or isinstance(v, bool):
        return None
    return v


def _element(data, key):
    v = _int(data.get(key))
    if v is None or not 0 <= v < len(uf.parent):
        raise ValueError(f"'{key}' must be an element from 0 to {len(uf.parent) - 1}")
    return v


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global uf
    uf = UnionFind(DEFAULT_SIZE)
    return ok(_state())


@bp.route("/init", methods=["POST"])
def init():
    global uf
    size = _int(body().get("size"))
    if size is None or not 1 <= size <= MAX_SIZE:
        return _bad(f"'size' must be a whole number from 1 to {MAX_SIZE}")
    uf = UnionFind(size)
    return ok(_state())


@bp.route("/find", methods=["POST"])
def find():
    try:
        x = _element(body(), "x")
    except ValueError as e:
        return _bad(str(e))
    path = [x]
    while uf.parent[path[-1]] != path[-1]:
        path.append(uf.parent[path[-1]])
    root = uf.find(x)
    return ok(_state(), {"root": root, "path": path})


@bp.route("/union", methods=["POST"])
def union():
    data = body()
    try:
        a = _element(data, "a")
        b = _element(data, "b")
    except ValueError as e:
        return _bad(str(e))
    merged = uf.union(a, b)
    return ok(_state(), {"merged": merged})


@bp.route("/connected", methods=["POST"])
def connected():
    data = body()
    try:
        a = _element(data, "a")
        b = _element(data, "b")
    except ValueError as e:
        return _bad(str(e))
    linked = uf.connected(a, b)
    return ok(_state(), {"connected": linked})
