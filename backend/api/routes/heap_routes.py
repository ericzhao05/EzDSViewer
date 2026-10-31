import math

from flask import Blueprint

from DataStrcutures.Heap import MedianFinder, MinHeap, kth_largest, top_k_frequent
from api.routes._common import body, fail, ok

bp = Blueprint("heap", __name__, url_prefix="/heap")

MAX_ITEMS = 31
MAX_NUMS = 100
MAX_ABS = 10 ** 9
DEFAULT = [3, 9, 5, 12, 10, 8, 7]

heap = MinHeap(DEFAULT)
finder = MedianFinder()
median_count = 0


def _reset():
    global heap, finder, median_count
    heap = MinHeap(DEFAULT)
    finder = MedianFinder()
    median_count = 0


def _median():
    return finder.median() if median_count else None


def _state():
    return {
        "items": heap.to_list(),
        "size": len(heap),
        "median": {**finder.to_dict(), "count": median_count, "value": _median()},
        "limits": {"max_items": MAX_ITEMS, "max_nums": MAX_NUMS},
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


def _int_list(v, limit, allow_empty=False):
    if not isinstance(v, list) or len(v) > limit or (not v and not allow_empty):
        return None
    out = [_int(x) for x in v]
    return None if any(x is None for x in out) else out


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/push", methods=["POST"])
def push():
    v = _int(body().get("value"))
    if v is None:
        return _bad("value must be a whole number (absolute value up to 1000000000)")
    if len(heap) >= MAX_ITEMS:
        return _bad(f"heap is limited to {MAX_ITEMS} items")
    heap.push(v)
    return ok(_state(), v)


@bp.route("/pop", methods=["POST"])
def pop():
    if len(heap) == 0:
        return _bad("heap is empty")
    return ok(_state(), heap.pop())


@bp.route("/peek", methods=["POST"])
def peek():
    if len(heap) == 0:
        return _bad("heap is empty")
    return ok(_state(), heap.peek())


@bp.route("/build", methods=["POST"])
def build():
    global heap
    items = _int_list(body().get("items"), MAX_ITEMS, allow_empty=True)
    if items is None:
        return _bad(f"items must be a list of up to {MAX_ITEMS} whole numbers")
    heap = MinHeap(items)
    return ok(_state(), heap.to_list())


@bp.route("/search", methods=["POST"])
def search():
    v = _int(body().get("value"))
    if v is None:
        return _bad("value must be a whole number")
    items = heap.to_list()
    index = items.index(v) if v in items else -1
    return ok(_state(), {"index": index, "checked": index + 1 if index >= 0 else len(items)})


@bp.route("/kth-largest", methods=["POST"])
def kth():
    data = body()
    nums = _int_list(data.get("nums"), MAX_NUMS)
    k = _int(data.get("k"))
    if nums is None:
        return _bad(f"nums must be a non-empty list of up to {MAX_NUMS} whole numbers")
    if k is None or not 1 <= k <= len(nums):
        return _bad("k must be a whole number from 1 to the length of nums")
    return ok(_state(), kth_largest(nums, k))


@bp.route("/top-k-frequent", methods=["POST"])
def top_k():
    data = body()
    nums = _int_list(data.get("nums"), MAX_NUMS)
    k = _int(data.get("k"))
    if nums is None:
        return _bad(f"nums must be a non-empty list of up to {MAX_NUMS} whole numbers")
    if k is None or not 1 <= k <= len(set(nums)):
        return _bad("k must be a whole number from 1 to the number of distinct values")
    return ok(_state(), top_k_frequent(nums, k))


@bp.route("/median-add", methods=["POST"])
def median_add():
    global median_count
    v = _int(body().get("value"))
    if v is None:
        return _bad("value must be a whole number")
    if median_count >= MAX_NUMS:
        return _bad(f"median finder is limited to {MAX_NUMS} numbers")
    finder.add(v)
    median_count += 1
    return ok(_state(), _median())


@bp.route("/median", methods=["POST"])
def median():
    if median_count == 0:
        return _bad("no numbers added yet")
    return ok(_state(), _median())
