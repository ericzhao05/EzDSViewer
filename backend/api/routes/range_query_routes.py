import math

from flask import Blueprint

from DataStrcutures.FenwickSegment import FenwickTree, SegmentTree
from api.routes._common import body, fail, ok

bp = Blueprint("range_query", __name__, url_prefix="/range-query")

DEFAULT_NUMS = [5, 2, 7, 1, 9, 3, 6, 4]
MAX_SIZE = 16
MAX_ABS = 10 ** 6

nums = []
fenwick = None
segment = None


def _build(values):
    global nums, fenwick, segment
    nums = list(values)
    fenwick = FenwickTree(len(nums))
    for i, v in enumerate(nums):
        fenwick.add(i, v)
    segment = SegmentTree(nums)


_build(DEFAULT_NUMS)


def _state():
    return {
        "nums": list(nums),
        "fenwick": fenwick.to_list(),
        "segment": segment.to_list(),
    }


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _is_value(v):
    return _is_int(v) and abs(v) <= MAX_ABS


def _index(data, key="index"):
    v = data.get(key)
    if not _is_int(v) or not 0 <= v < len(nums):
        return None
    return v


def _range(data):
    left, right = data.get("left"), data.get("right")
    if not _is_int(left) or not _is_int(right) or not 0 <= left <= right < len(nums):
        return None
    return left, right


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _build(DEFAULT_NUMS)
    return ok(_state())


@bp.route("/load", methods=["POST"])
def load():
    values = body().get("nums")
    if (
        not isinstance(values, list)
        or not 1 <= len(values) <= MAX_SIZE
        or not all(_is_value(v) for v in values)
    ):
        return fail(
            "nums must be a list of 1 to %d integers, each at most %d in size" % (MAX_SIZE, MAX_ABS),
            _state(),
        )
    _build(values)
    return ok(_state())


def _write(i, value):
    """Set nums[i] in both structures; returns the touched node indices."""
    delta = value - nums[i]
    fenwick_path = fenwick.add_path(i)
    segment_path = segment.update_path(i)
    fenwick.add(i, delta)
    segment.update(i, value)
    nums[i] = value
    return {"fenwick": fenwick_path, "segment": segment_path}


@bp.route("/set", methods=["POST"])
def set_value():
    data = body()
    i = _index(data)
    if i is None:
        return fail("index must be an integer from 0 to %d" % (len(nums) - 1), _state())
    if not _is_value(data.get("value")):
        return fail("value must be an integer with magnitude at most %d" % MAX_ABS, _state())
    touched = _write(i, data["value"])
    return ok(_state(), {"touched": touched})


@bp.route("/add", methods=["POST"])
def add_delta():
    data = body()
    i = _index(data)
    if i is None:
        return fail("index must be an integer from 0 to %d" % (len(nums) - 1), _state())
    delta = data.get("delta")
    if not _is_value(delta):
        return fail("delta must be an integer with magnitude at most %d" % MAX_ABS, _state())
    value = nums[i] + delta
    if abs(value) > MAX_ABS:
        return fail("the resulting value must stay within %d" % MAX_ABS, _state())
    touched = _write(i, value)
    return ok(_state(), {"touched": touched})


@bp.route("/prefix-sum", methods=["POST"])
def prefix_sum():
    count = body().get("count")
    if not _is_int(count) or not 0 <= count <= len(nums):
        return fail("count must be an integer from 0 to %d" % len(nums), _state())
    return ok(_state(), {"sum": fenwick.prefix_sum(count), "nodes": fenwick.prefix_path(count)})


@bp.route("/range-sum", methods=["POST"])
def range_sum():
    r = _range(body())
    if r is None:
        return fail("left and right must be integers with 0 <= left <= right <= %d" % (len(nums) - 1), _state())
    left, right = r
    return ok(
        _state(),
        {
            "sum": fenwick.range_sum(left, right),
            "nodes": fenwick.prefix_path(right + 1),
            "subtract_nodes": fenwick.prefix_path(left),
        },
    )


@bp.route("/range-min", methods=["POST"])
def range_min():
    r = _range(body())
    if r is None:
        return fail("left and right must be integers with 0 <= left <= right <= %d" % (len(nums) - 1), _state())
    left, right = r
    result = segment.query(left, right)
    if isinstance(result, float) and math.isinf(result):  # unreachable for valid ranges
        return fail("empty range", _state())
    return ok(_state(), {"min": result, "nodes": segment.query_nodes(left, right)})
