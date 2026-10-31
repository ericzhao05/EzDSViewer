import itertools
import math

from flask import Blueprint

from DataStrcutures.FibonacciHeap import FibonacciHeap
from api.routes._common import body, fail, ok

bp = Blueprint("fibonacci_heap", __name__, url_prefix="/fibonacci-heap")

MAX_ITEMS = 63
MAX_ABS = 99999  # keys are drawn inside the tree nodes
DEFAULT_KEYS = [1, 3, 7, 17, 18, 21, 23, 24, 26, 30, 35, 39, 41, 46, 52, 57, 60]
DEFAULT_OTHER = [5, 12, 20]


def _build():
    """Heap A opens with real trees and one marked node, so every operation has something to show."""
    ids = itertools.count(1)
    a = FibonacciHeap(ids)
    for key in DEFAULT_KEYS:
        a.insert(key)
    a.extract_min()
    # cutting 52 marks its parent 46, which still has child 57: decreasing 57 shows a cascading cut
    node = next(n for n in a.nodes() if n.key == 52)
    a.decrease_key(node, 45)
    b = FibonacciHeap(ids)
    for key in DEFAULT_OTHER:
        b.insert(key)
    return a, b


heap, other = _build()


def _reset():
    global heap, other
    heap, other = _build()


def _state():
    return {"heap": heap.to_dict(), "other": other.to_dict(), "limits": {"max_items": MAX_ITEMS}}


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


def _insert(target):
    v = _int(body().get("value"))
    if v is None:
        return _bad("value must be a whole number (absolute value up to 99999)")
    if len(target) >= MAX_ITEMS:
        return _bad(f"each heap is limited to {MAX_ITEMS} nodes")
    node = target.insert(v)
    return ok(_state(), {"id": node.id, "key": node.key})


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/insert", methods=["POST"])
def insert():
    return _insert(heap)


@bp.route("/other-insert", methods=["POST"])
def other_insert():
    return _insert(other)


@bp.route("/find-min", methods=["POST"])
def find_min():
    if heap.min is None:
        return _bad("heap is empty")
    return ok(_state(), {"id": heap.min.id, "key": heap.find_min()})


@bp.route("/extract-min", methods=["POST"])
def extract_min():
    if heap.min is None:
        return _bad("heap is empty")
    node_id = heap.min.id
    key = heap.extract_min()
    return ok(_state(), {"id": node_id, "key": key, "links": heap.last_links})


@bp.route("/decrease-key", methods=["POST"])
def decrease_key():
    data = body()
    node_id = _int(data.get("id"))
    key = _int(data.get("key"))
    if node_id is None:
        return _bad("id must be a node id")
    if key is None:
        return _bad("key must be a whole number (absolute value up to 99999)")
    node = next((n for n in heap.nodes() if n.id == node_id), None)
    if node is None:
        return _bad(f"no node with id {node_id} in heap A")
    if key > node.key:
        return _bad(f"new key {key} is larger than the current key {node.key}")
    old_key = node.key
    heap.decrease_key(node, key)
    return ok(
        _state(),
        {"id": node_id, "key": key, "old_key": old_key, "cuts": heap.last_cuts, "marked": heap.last_marked},
    )


@bp.route("/merge", methods=["POST"])
def merge():
    if len(heap) + len(other) > MAX_ITEMS:
        return _bad(f"each heap is limited to {MAX_ITEMS} nodes, so these two can't merge")
    moved = len(other)
    heap.merge(other)
    return ok(_state(), {"moved": moved, "size": len(heap)})
