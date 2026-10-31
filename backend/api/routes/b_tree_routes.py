import math

from flask import Blueprint

from DataStrcutures.BTree import BPlusTree, BTree
from api.routes._common import body, fail, ok

bp = Blueprint("b_tree", __name__, url_prefix="/b-tree")

MIN_ORDER = 3
MAX_ORDER = 7
MAX_KEYS = 40
MAX_ABS = 9999
MAX_VALUE_LEN = 12
DEFAULT_ORDER = 4
DEFAULT_KEYS = [10, 20, 5, 6, 12, 30, 7, 17, 3, 25]

btree = None
bplus = None


def _default_value(key):
    return "row %d" % key


def _load(order, keys, items):
    global btree, bplus
    btree = BTree(order)
    bplus = BPlusTree(order)
    for k in keys:
        btree.insert(k)
    for k, v in items:
        bplus.insert(k, v)


def _reset():
    _load(DEFAULT_ORDER, DEFAULT_KEYS, [(k, _default_value(k)) for k in DEFAULT_KEYS])


_reset()


def _state():
    return {
        "order": btree.order,
        "btree": btree.to_dict(),
        "bplus": bplus.to_dict(),
        "limits": {
            "min_order": MIN_ORDER,
            "max_order": MAX_ORDER,
            "max_keys": MAX_KEYS,
            "max_abs": MAX_ABS,
            "max_value_len": MAX_VALUE_LEN,
        },
    }


def _bad(msg):
    return fail(msg, _state())


def _whole(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, float) and math.isfinite(v) and v == int(v):
        v = int(v)
    return v if isinstance(v, int) else None


def _key(v):
    v = _whole(v)
    return v if v is not None and abs(v) <= MAX_ABS else None


KEY_ERROR = "key must be a whole number (absolute value up to %d)" % MAX_ABS
FULL_ERROR = "each tree is limited to %d keys" % MAX_KEYS


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/build", methods=["POST"])
def build():
    raw = body().get("keys")
    if not isinstance(raw, list) or len(raw) > MAX_KEYS:
        return _bad("keys must be a list of up to %d whole numbers" % MAX_KEYS)
    keys = [_key(k) for k in raw]
    if any(k is None for k in keys):
        return _bad(KEY_ERROR)
    _load(btree.order, keys, [(k, _default_value(k)) for k in keys])
    return ok(_state(), {"btree_size": len(btree), "bplus_size": len(bplus)})


@bp.route("/set-order", methods=["POST"])
def set_order():
    order = _whole(body().get("order"))
    if order is None or not MIN_ORDER <= order <= MAX_ORDER:
        return _bad("order must be a whole number from %d to %d" % (MIN_ORDER, MAX_ORDER))
    _load(order, btree.keys(), bplus.items())
    return ok(_state(), {"order": order})


@bp.route("/insert", methods=["POST"])
def insert():
    key = _key(body().get("key"))
    if key is None:
        return _bad(KEY_ERROR)
    if len(btree) >= MAX_KEYS and key not in btree:
        return _bad(FULL_ERROR)
    inserted = btree.insert(key)
    return ok(_state(), {"key": key, "inserted": inserted, "events": btree.events})


@bp.route("/search", methods=["POST"])
def search():
    key = _key(body().get("key"))
    if key is None:
        return _bad(KEY_ERROR)
    found, path = btree.search_path(key)
    return ok(_state(), {"key": key, "found": found, "path": path})


@bp.route("/delete", methods=["POST"])
def delete():
    key = _key(body().get("key"))
    if key is None:
        return _bad(KEY_ERROR)
    if key not in btree:
        return _bad("key %d is not in the B-tree" % key)
    btree.delete(key)
    return ok(_state(), {"key": key, "events": btree.events})


@bp.route("/bplus-insert", methods=["POST"])
def bplus_insert():
    data = body()
    key = _key(data.get("key"))
    if key is None:
        return _bad(KEY_ERROR)
    value = data.get("value")
    if value is None:
        value = _default_value(key)
    elif not isinstance(value, str) or not value.strip() or len(value.strip()) > MAX_VALUE_LEN:
        return _bad("value must be text of 1 to %d characters" % MAX_VALUE_LEN)
    value = value.strip()
    if len(bplus) >= MAX_KEYS and key not in bplus:
        return _bad(FULL_ERROR)
    inserted = bplus.insert(key, value)
    return ok(_state(), {"key": key, "value": value, "inserted": inserted, "events": bplus.events})


@bp.route("/bplus-search", methods=["POST"])
def bplus_search():
    key = _key(body().get("key"))
    if key is None:
        return _bad(KEY_ERROR)
    found, path = bplus.search_path(key)
    return ok(_state(), {"key": key, "found": found, "value": bplus.search(key), "path": path})


@bp.route("/bplus-delete", methods=["POST"])
def bplus_delete():
    key = _key(body().get("key"))
    if key is None:
        return _bad(KEY_ERROR)
    if key not in bplus:
        return _bad("key %d is not in the B+ tree" % key)
    value = bplus.delete(key)
    return ok(_state(), {"key": key, "value": value, "events": bplus.events})


@bp.route("/bplus-range", methods=["POST"])
def bplus_range():
    data = body()
    low, high = _key(data.get("low")), _key(data.get("high"))
    if low is None or high is None:
        return _bad("low and high must be whole numbers (absolute value up to %d)" % MAX_ABS)
    if low > high:
        return _bad("low must not exceed high")
    trace = bplus.range_trace(low, high)
    items = [{"key": k, "value": v} for k, v in trace["items"]]
    return ok(_state(), {"low": low, "high": high, "items": items,
                         "path": trace["path"], "leaves": trace["leaves"]})
