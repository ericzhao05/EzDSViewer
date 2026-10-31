import math
import random

from flask import Blueprint

from DataStrcutures.Quadtree import Quadtree
from api.routes._common import body, fail, ok

bp = Blueprint("quadtree", __name__, url_prefix="/quadtree")

SIZE = 100
DEFAULT_CAPACITY = 2
MAX_CAPACITY = 8
MAX_DEPTH = 6
MAX_POINTS = 300
MAX_RANDOM = 100

tree = Quadtree(0, 0, SIZE, SIZE, DEFAULT_CAPACITY, MAX_DEPTH)


def _reset(capacity=DEFAULT_CAPACITY):
    global tree
    tree = Quadtree(0, 0, SIZE, SIZE, capacity, MAX_DEPTH)


def _state():
    return {
        "size": SIZE,
        "capacity": tree.capacity,
        "max_depth": MAX_DEPTH,
        "count": tree.count(),
        "depth": tree.height_of_tree(),
        "node_count": tree.node_count(),
        "tree": tree.to_dict(),
        "limits": {"max_points": MAX_POINTS, "max_capacity": MAX_CAPACITY, "max_random": MAX_RANDOM},
    }


def _bad(msg):
    return fail(msg, _state())


def _num(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
        return v
    return None


def _coords(data, *names):
    vals = [_num(data.get(n)) for n in names]
    return None if any(v is None for v in vals) else vals


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/configure", methods=["POST"])
def configure():
    v = body().get("capacity")
    if not isinstance(v, int) or isinstance(v, bool) or not 1 <= v <= MAX_CAPACITY:
        return _bad(f"capacity must be a whole number from 1 to {MAX_CAPACITY}")
    _reset(v)
    return ok(_state())


@bp.route("/insert", methods=["POST"])
def insert():
    c = _coords(body(), "x", "y")
    if c is None:
        return _bad("x and y must be finite numbers")
    x, y = c
    if not tree.contains(x, y):
        return _bad(f"point must lie within 0 to {SIZE} on both axes")
    if tree.count() >= MAX_POINTS:
        return _bad(f"at most {MAX_POINTS} points allowed; reset to continue")
    tree.insert(x, y)
    return ok(_state(), {"point": [x, y]})


@bp.route("/random", methods=["POST"])
def random_points():
    data = body()
    n = data.get("n")
    if not isinstance(n, int) or isinstance(n, bool) or not 1 <= n <= MAX_RANDOM:
        return _bad(f"n must be a whole number from 1 to {MAX_RANDOM}")
    seed = data.get("seed")
    if seed is not None and (not isinstance(seed, int) or isinstance(seed, bool) or abs(seed) > 10**9):
        return _bad("seed must be a whole number")
    if tree.count() + n > MAX_POINTS:
        return _bad(f"at most {MAX_POINTS} points allowed; reset to continue")
    rng = random.Random(seed)
    pts = [[rng.randint(0, SIZE), rng.randint(0, SIZE)] for _ in range(n)]
    for x, y in pts:
        tree.insert(x, y)
    return ok(_state(), {"added": pts})


@bp.route("/query", methods=["POST"])
def query():
    c = _coords(body(), "x0", "y0", "x1", "y1")
    if c is None:
        return _bad("x0, y0, x1 and y1 must be finite numbers")
    x0, y0, x1, y1 = c
    found, visited = tree.query_range_stats(x0, y0, x1, y1)
    rect = [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]
    return ok(_state(), {
        "rect": rect,
        "points": [list(p) for p in found],
        "nodes_visited": len(visited),
        "total_nodes": tree.node_count(),
        "visited": [[n.x, n.y, n.width, n.height] for n in visited],
    })
