import math

from flask import Blueprint

from DataStrcutures.Intervals import (
    erase_overlap_intervals,
    insert_interval,
    merge_intervals,
    min_meeting_rooms,
    overlaps,
)
from api.routes._common import body, fail, ok

bp = Blueprint("intervals", __name__, url_prefix="/intervals")

MAX_ITEMS = 30
MAX_ABS = 10 ** 6
DEFAULT = [[1, 3], [2, 6], [8, 10], [15, 18]]

intervals = [list(p) for p in DEFAULT]


def _reset():
    global intervals
    intervals = [list(p) for p in DEFAULT]


def _state():
    return {
        "intervals": [list(p) for p in intervals],
        "size": len(intervals),
        "limits": {"max_items": MAX_ITEMS, "max_abs": MAX_ABS},
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


def _pair(v):
    if not isinstance(v, (list, tuple)) or len(v) != 2:
        return None
    a, b = _int(v[0]), _int(v[1])
    if a is None or b is None or a > b:
        return None
    return [a, b]


def _pairs(v):
    if not isinstance(v, list) or len(v) > MAX_ITEMS:
        return None
    out = [_pair(p) for p in v]
    return None if any(p is None for p in out) else out


PAIR_MSG = f"an interval is [start, end] of whole numbers, start <= end, absolute value up to {MAX_ABS}"


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/add", methods=["POST"])
def add():
    p = _pair(body().get("interval"))
    if p is None:
        return _bad(PAIR_MSG)
    if len(intervals) >= MAX_ITEMS:
        return _bad(f"limited to {MAX_ITEMS} intervals")
    intervals.append(p)
    return ok(_state(), p)


@bp.route("/remove", methods=["POST"])
def remove():
    i = _int(body().get("index"))
    if i is None or not 0 <= i < len(intervals):
        return _bad("index must be a whole number within the list")
    removed = intervals.pop(i)
    return ok(_state(), removed)


@bp.route("/clear", methods=["POST"])
def clear():
    intervals.clear()
    return ok(_state())


@bp.route("/build", methods=["POST"])
def build():
    global intervals
    items = _pairs(body().get("intervals"))
    if items is None:
        return _bad(f"intervals must be a list of up to {MAX_ITEMS} pairs; {PAIR_MSG}")
    intervals = items
    return ok(_state(), [list(p) for p in intervals])


@bp.route("/overlap", methods=["POST"])
def overlap():
    data = body()
    a, b = _pair(data.get("a")), _pair(data.get("b"))
    if a is None or b is None:
        return _bad(f"a and b are required; {PAIR_MSG}")
    return ok(_state(), overlaps(a, b))


@bp.route("/merge", methods=["POST"])
def merge():
    return ok(_state(), merge_intervals(intervals))


@bp.route("/insert", methods=["POST"])
def insert():
    p = _pair(body().get("interval"))
    if p is None:
        return _bad(PAIR_MSG)
    base = merge_intervals(intervals)
    return ok(_state(), {"base": base, "result": insert_interval(base, p), "new": p})


@bp.route("/non-overlapping", methods=["POST"])
def non_overlapping():
    return ok(_state(), erase_overlap_intervals(intervals))


@bp.route("/meeting-rooms", methods=["POST"])
def meeting_rooms():
    return ok(_state(), min_meeting_rooms(intervals))
