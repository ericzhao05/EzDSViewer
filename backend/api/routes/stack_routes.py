from flask import Blueprint

from DataStrcutures.Stack import MinStack, daily_temperatures, is_valid_parentheses
from DataStrcutures.StaticArrayStack import StaticArrayStack
from api.routes._common import body, fail, ok

bp = Blueprint("stack", __name__, url_prefix="/stack")

CAPACITY = 100
MAX_TEXT = 40
MAX_TEXT_ALGO = 200
MAX_LIST = 100
MAX_INT = 10 ** 9


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _is_value(v):
    if isinstance(v, str):
        return 0 < len(v) <= MAX_TEXT
    return _is_int(v)


stack = StaticArrayStack(CAPACITY)


def _state():
    return {"items": stack.to_list(), "capacity": stack.capacity, "size": len(stack)}


def _data():
    data = body()
    return data if isinstance(data, dict) else None


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global stack
    stack = StaticArrayStack(CAPACITY)
    return ok(_state())


@bp.route("/push", methods=["POST"])
def push():
    data = _data()
    if data is None or "value" not in data or not _is_value(data["value"]):
        return fail("value must be a non-empty string (max %d chars) or an integer" % MAX_TEXT, _state())
    if stack.is_full():
        return fail("Stack is full (capacity %d)" % CAPACITY, _state())
    stack.push(data["value"])
    return ok(_state(), data["value"])


@bp.route("/pop", methods=["POST"])
def pop():
    if stack.is_empty():
        return fail("Stack is empty", _state())
    value = stack.pop()
    return ok(_state(), value)


@bp.route("/peek", methods=["POST"])
def peek():
    if stack.is_empty():
        return fail("Stack is empty", _state())
    return ok(_state(), stack.top())


@bp.route("/valid-parentheses", methods=["POST"])
def valid_parentheses():
    data = _data()
    text = data.get("text") if data else None
    if not isinstance(text, str) or len(text) > MAX_TEXT_ALGO:
        return fail("text must be a string (max %d chars)" % MAX_TEXT_ALGO, _state())
    return ok(_state(), is_valid_parentheses(text))


def _int_list(v):
    return isinstance(v, list) and len(v) <= MAX_LIST and all(_is_int(x) for x in v)


@bp.route("/min-stack", methods=["POST"])
def min_stack():
    """Push the values one by one; report the running minimum after each push."""
    data = _data()
    values = data.get("values") if data else None
    if not _int_list(values):
        return fail("values must be a list of integers (max %d)" % MAX_LIST, _state())
    m = MinStack()
    trace = []
    for v in values:
        m.push(v)
        trace.append({"value": v, "min": m.get_min()})
    return ok(_state(), trace)


@bp.route("/daily-temperatures", methods=["POST"])
def daily_temperatures_op():
    data = _data()
    temps = data.get("temps") if data else None
    if not _int_list(temps):
        return fail("temps must be a list of integers (max %d)" % MAX_LIST, _state())
    return ok(_state(), daily_temperatures(temps))
