from flask import Blueprint

from DataStrcutures.HashTable import (
    HashMap,
    group_anagrams,
    longest_consecutive,
    two_sum,
)
from api.routes._common import body, fail, ok

bp = Blueprint("hash_table", __name__, url_prefix="/hash-table")

INITIAL_CAPACITY = 8
MAX_ENTRIES = 64
MAX_TEXT = 40
MAX_LIST = 100
MAX_INT = 10 ** 9

_MISSING = object()


def _det_hash(key):
    """Deterministic hash so the demo looks the same after every restart."""
    if isinstance(key, int):
        return key
    h = 0
    for ch in key:
        h = (h * 31 + ord(ch)) % (2 ** 32)
    return h


def _new():
    return HashMap(INITIAL_CAPACITY, hash_fn=_det_hash)


table = _new()


def _state():
    return table.to_dict()


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _is_key(v):
    if isinstance(v, str):
        return 0 < len(v) <= MAX_TEXT
    return _is_int(v)


def _is_value(v):
    if isinstance(v, str):
        return len(v) <= MAX_TEXT
    return _is_int(v) or (
        isinstance(v, float) and v == v and abs(v) <= MAX_INT
    )


def _int_list(v):
    return isinstance(v, list) and len(v) <= MAX_LIST and all(_is_int(x) for x in v)


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global table
    table = _new()
    return ok(_state())


@bp.route("/put", methods=["POST"])
def put():
    data = body()
    if not isinstance(data, dict):
        return fail("Body must be a JSON object", _state())
    if "key" not in data or not _is_key(data["key"]):
        return fail("key must be a non-empty string (max %d chars) or an integer" % MAX_TEXT, _state())
    if "value" not in data or not _is_value(data["value"]):
        return fail("value must be a string, integer or number", _state())
    key = data["key"]
    exists = table.get(key, _MISSING) is not _MISSING
    if not exists and len(table) >= MAX_ENTRIES:
        return fail("Table is limited to %d entries" % MAX_ENTRIES, _state())
    before = table.capacity
    table.put(key, data["value"])
    return ok(_state(), {"updated": exists, "resized": table.capacity != before})


@bp.route("/get", methods=["POST"])
def get():
    data = body()
    if not isinstance(data, dict) or "key" not in data or not _is_key(data["key"]):
        return fail("key must be a non-empty string or an integer", _state())
    value = table.get(data["key"], _MISSING)
    if value is _MISSING:
        return ok(_state(), {"found": False, "value": None})
    return ok(_state(), {"found": True, "value": value})


@bp.route("/remove", methods=["POST"])
def remove():
    data = body()
    if not isinstance(data, dict) or "key" not in data or not _is_key(data["key"]):
        return fail("key must be a non-empty string or an integer", _state())
    return ok(_state(), {"removed": table.remove(data["key"])})


@bp.route("/two-sum", methods=["POST"])
def two_sum_op():
    data = body()
    if not isinstance(data, dict) or not _int_list(data.get("nums")) or not _is_int(data.get("target")):
        return fail("nums must be a list of integers (max %d) and target an integer" % MAX_LIST, _state())
    return ok(_state(), two_sum(data["nums"], data["target"]))


@bp.route("/group-anagrams", methods=["POST"])
def group_anagrams_op():
    data = body()
    words = data.get("words") if isinstance(data, dict) else None
    if not (isinstance(words, list) and len(words) <= MAX_LIST
            and all(isinstance(w, str) and len(w) <= MAX_TEXT for w in words)):
        return fail("words must be a list of strings (max %d)" % MAX_LIST, _state())
    return ok(_state(), group_anagrams(words))


@bp.route("/longest-consecutive", methods=["POST"])
def longest_consecutive_op():
    data = body()
    nums = data.get("nums") if isinstance(data, dict) else None
    if not _int_list(nums):
        return fail("nums must be a list of integers (max %d)" % MAX_LIST, _state())
    return ok(_state(), longest_consecutive(nums))
