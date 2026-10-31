from flask import Blueprint

from DataStrcutures.Queue import (
    CircularQueue,
    Deque,
    QueueWithStacks,
    sliding_window_max,
    sliding_window_trace,
)
from api.routes._common import body, fail, ok

bp = Blueprint("queue", __name__, url_prefix="/queue")

CIRCULAR_CAPACITY = 6
MAX_ITEMS = 30
MAX_TEXT = 20
MAX_NUMS = 50
MAX_INT = 10 ** 9


def _new():
    return CircularQueue(CIRCULAR_CAPACITY), QueueWithStacks(), Deque()


circular, stacks, dq = _new()


def _state():
    return {
        "circular": circular.to_dict(),
        "stacks": stacks.to_dict(),
        "deque": dq.to_list(),
        "limits": {"max_items": MAX_ITEMS, "max_text": MAX_TEXT},
    }


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _is_value(v):
    if isinstance(v, str):
        return 0 < len(v) <= MAX_TEXT
    return _is_int(v)


def _value(data):
    """Returns (value, error) from a request body."""
    if not isinstance(data, dict) or "value" not in data or not _is_value(data["value"]):
        return None, "value must be an integer or a non-empty string (max %d chars)" % MAX_TEXT
    return data["value"], None


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global circular, stacks, dq
    circular, stacks, dq = _new()
    return ok(_state())


@bp.route("/circular-enqueue", methods=["POST"])
def circular_enqueue():
    value, err = _value(body())
    if err:
        return fail(err, _state())
    if circular.is_full():
        return fail("Queue is full (capacity %d)" % CIRCULAR_CAPACITY, _state())
    circular.enqueue(value)
    return ok(_state(), None)


@bp.route("/circular-dequeue", methods=["POST"])
def circular_dequeue():
    if len(circular) == 0:
        return fail("Cannot dequeue from an empty queue", _state())
    result = circular.dequeue()
    return ok(_state(), result)


@bp.route("/stacks-enqueue", methods=["POST"])
def stacks_enqueue():
    value, err = _value(body())
    if err:
        return fail(err, _state())
    if len(stacks) >= MAX_ITEMS:
        return fail("Queue is limited to %d items" % MAX_ITEMS, _state())
    stacks.enqueue(value)
    return ok(_state(), None)


@bp.route("/stacks-dequeue", methods=["POST"])
def stacks_dequeue():
    if len(stacks) == 0:
        return fail("Cannot dequeue from an empty queue", _state())
    result = stacks.dequeue()
    return ok(_state(), result)


def _deque_push(front):
    value, err = _value(body())
    if err:
        return fail(err, _state())
    if len(dq) >= MAX_ITEMS:
        return fail("Deque is limited to %d items" % MAX_ITEMS, _state())
    (dq.push_front if front else dq.push_back)(value)
    return ok(_state(), None)


def _deque_pop(front):
    if len(dq) == 0:
        return fail("Cannot pop from an empty deque", _state())
    result = dq.pop_front() if front else dq.pop_back()
    return ok(_state(), result)


@bp.route("/deque-push-front", methods=["POST"])
def deque_push_front():
    return _deque_push(True)


@bp.route("/deque-push-back", methods=["POST"])
def deque_push_back():
    return _deque_push(False)


@bp.route("/deque-pop-front", methods=["POST"])
def deque_pop_front():
    return _deque_pop(True)


@bp.route("/deque-pop-back", methods=["POST"])
def deque_pop_back():
    return _deque_pop(False)


@bp.route("/sliding-window-max", methods=["POST"])
def sliding_window_max_op():
    data = body()
    nums = data.get("nums") if isinstance(data, dict) else None
    k = data.get("k") if isinstance(data, dict) else None
    if not (isinstance(nums, list) and 1 <= len(nums) <= MAX_NUMS and all(_is_int(n) for n in nums)):
        return fail("nums must be a list of 1 to %d integers" % MAX_NUMS, _state())
    if not _is_int(k) or not 1 <= k <= len(nums):
        return fail("k must be an integer between 1 and the length of nums", _state())
    return ok(_state(), {
        "nums": nums,
        "k": k,
        "maxes": sliding_window_max(nums, k),
        "steps": sliding_window_trace(nums, k),
    })
