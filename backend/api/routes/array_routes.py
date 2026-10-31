from flask import Blueprint

from DataStrcutures.DynamicArray import (
    DynamicArray,
    binary_search,
    max_subarray,
    range_sum_prefix,
    two_sum_sorted,
)
from api.routes._common import body, fail, ok

bp = Blueprint("array", __name__, url_prefix="/array")

MAX_SIZE = 64
MAX_TEXT = 40

array = DynamicArray()


def state():
    return array.to_dict()


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def is_index(v):
    return isinstance(v, int) and not isinstance(v, bool)


def clean_value(data):
    """Returns (value, error)."""
    if "value" not in data:
        return None, "value is required"
    v = data["value"]
    if isinstance(v, str):
        if v == "" or len(v) > MAX_TEXT:
            return None, "value must be 1-%d characters" % MAX_TEXT
    elif not is_number(v) or v != v or v in (float("inf"), float("-inf")):
        return None, "value must be a string or a finite number"
    return v, None


def current_numbers():
    items = array.to_dict()["data"][: len(array)]
    if not all(is_number(x) for x in items):
        return None
    return items


@bp.route("", methods=["GET"])
def get_state():
    return ok(state())


@bp.route("/reset", methods=["POST"])
def reset():
    global array
    array = DynamicArray()
    return ok(state())


@bp.route("/append", methods=["POST"])
def append():
    v, err = clean_value(body())
    if err:
        return fail(err, state())
    if len(array) >= MAX_SIZE:
        return fail("array is full (max %d elements)" % MAX_SIZE, state())
    array.append(v)
    return ok(state(), v)


@bp.route("/insert", methods=["POST"])
def insert():
    data = body()
    v, err = clean_value(data)
    if err:
        return fail(err, state())
    i = data.get("index")
    if not is_index(i):
        return fail("index must be an integer", state())
    if not 0 <= i <= len(array):
        return fail("index out of range", state())
    if len(array) >= MAX_SIZE:
        return fail("array is full (max %d elements)" % MAX_SIZE, state())
    array.insert(i, v)
    return ok(state(), v)


@bp.route("/pop", methods=["POST"])
def pop():
    data = body()
    i = data.get("index", -1)
    if i is None:
        i = -1
    if not is_index(i):
        return fail("index must be an integer", state())
    try:
        v = array.pop(i)
    except IndexError:
        return fail("index out of range or array is empty", state())
    return ok(state(), v)


@bp.route("/get", methods=["POST"])
def get_item():
    i = body().get("index")
    if not is_index(i):
        return fail("index must be an integer", state())
    try:
        v = array[i]
    except IndexError:
        return fail("index out of range", state())
    return ok(state(), v)


def numbers_or_fail():
    nums = current_numbers()
    if nums is None:
        return None, fail("this algorithm needs an array of numbers only", state())
    return nums, None


@bp.route("/two_sum_sorted", methods=["POST"])
def two_sum():
    t = body().get("target")
    if not is_number(t):
        return fail("target must be a number", state())
    nums, bad = numbers_or_fail()
    if bad:
        return bad
    if nums != sorted(nums):
        return fail("array must be sorted ascending for two pointers", state())
    return ok(state(), two_sum_sorted(nums, t))


@bp.route("/binary_search", methods=["POST"])
def bsearch():
    t = body().get("target")
    if not is_number(t):
        return fail("target must be a number", state())
    nums, bad = numbers_or_fail()
    if bad:
        return bad
    if nums != sorted(nums):
        return fail("array must be sorted ascending for binary search", state())
    return ok(state(), binary_search(nums, t))


@bp.route("/max_subarray", methods=["POST"])
def kadane():
    nums, bad = numbers_or_fail()
    if bad:
        return bad
    if not nums:
        return fail("array is empty", state())
    return ok(state(), max_subarray(nums))


@bp.route("/prefix_sums", methods=["POST"])
def prefix():
    nums, bad = numbers_or_fail()
    if bad:
        return bad
    return ok(state(), range_sum_prefix(nums))
