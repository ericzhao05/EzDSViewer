from flask import Blueprint

from DataStrcutures.SkipList import SkipList
from api.routes._common import body, fail, ok

bp = Blueprint("skip_list", __name__, url_prefix="/skip-list")

DEFAULT_SEED = 7
MAX_KEYS = 40
MAX_INT = 10 ** 9

skip = SkipList(seed=DEFAULT_SEED)


def _state():
    return skip.to_dict()


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and abs(v) <= MAX_INT


def _key(data):
    if "key" not in data or not _is_int(data["key"]):
        return None
    return data["key"]


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    global skip
    skip = SkipList(seed=DEFAULT_SEED)
    return ok(_state())


@bp.route("/seed", methods=["POST"])
def set_seed():
    """Start an empty list whose coin flips come from the given seed."""
    global skip
    seed = body().get("seed")
    if not _is_int(seed):
        return fail("seed must be an integer with absolute value at most %d" % MAX_INT, _state())
    skip = SkipList(seed=seed)
    return ok(_state())


@bp.route("/insert", methods=["POST"])
def insert():
    key = _key(body())
    if key is None:
        return fail("key must be an integer with absolute value at most %d" % MAX_INT, _state())
    if key not in skip and len(skip) >= MAX_KEYS:
        return fail("the list is limited to %d keys" % MAX_KEYS, _state())
    level = skip.insert(key)
    return ok(_state(), {"inserted": level is not None, "level": level})


@bp.route("/search", methods=["POST"])
def search():
    key = _key(body())
    if key is None:
        return fail("key must be an integer with absolute value at most %d" % MAX_INT, _state())
    return ok(_state(), skip.search_path(key))


@bp.route("/delete", methods=["POST"])
def delete():
    key = _key(body())
    if key is None:
        return fail("key must be an integer with absolute value at most %d" % MAX_INT, _state())
    return ok(_state(), {"deleted": skip.delete(key)})
