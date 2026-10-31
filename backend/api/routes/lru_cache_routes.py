from flask import Blueprint

from DataStrcutures.LRUCache import LRUCache
from api.routes._common import body, fail, ok

bp = Blueprint("lru_cache", __name__, url_prefix="/lru-cache")

DEFAULT_CAPACITY = 3
MAX_CAPACITY = 10
MAX_TEXT = 40
MAX_INT = 10 ** 9

cache = LRUCache(DEFAULT_CAPACITY)


def _state():
    return cache.to_dict()


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _is_key(v):
    if isinstance(v, str):
        return 0 < len(v) <= MAX_TEXT
    return _is_int(v)


def _is_value(v):
    if isinstance(v, str):
        return len(v) <= MAX_TEXT
    return _is_int(v)


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global cache
    cache = LRUCache(DEFAULT_CAPACITY)
    return ok(_state())


@bp.route("/capacity", methods=["POST"])
def set_capacity():
    """Start a fresh, empty cache with the given capacity."""
    global cache
    cap = body().get("capacity")
    if not _is_int(cap) or not 1 <= cap <= MAX_CAPACITY:
        return fail("capacity must be an integer from 1 to %d" % MAX_CAPACITY, _state())
    cache = LRUCache(cap)
    return ok(_state())


@bp.route("/put", methods=["POST"])
def put():
    data = body()
    if "key" not in data or not _is_key(data["key"]):
        return fail("key must be a non-empty string (max %d chars) or an integer" % MAX_TEXT, _state())
    if "value" not in data or not _is_value(data["value"]):
        return fail("value must be a string (max %d chars) or an integer" % MAX_TEXT, _state())
    key = data["key"]
    existed = key in cache
    evicted = None
    if not existed and len(cache) >= cache.capacity:
        k, v = cache.items()[-1]
        evicted = {"key": k, "value": v}
    cache.put(key, data["value"])
    return ok(_state(), {"updated": existed, "evicted": evicted})


@bp.route("/get", methods=["POST"])
def get():
    data = body()
    if "key" not in data or not _is_key(data["key"]):
        return fail("key must be a non-empty string or an integer", _state())
    key = data["key"]
    if key not in cache:
        return ok(_state(), {"found": False, "value": cache.get(key)})
    return ok(_state(), {"found": True, "value": cache.get(key)})
