from flask import Blueprint

from DataStrcutures.BloomFilter import BloomFilter
from api.routes._common import body, fail, ok

bp = Blueprint("bloom_filter", __name__, url_prefix="/bloom-filter")

DEFAULT_SIZE = 32
DEFAULT_HASHES = 3
MIN_SIZE, MAX_SIZE = 8, 128
MAX_HASHES = 8
MAX_ITEM_LEN = 100
MAX_ADDS = 500

bloom = BloomFilter(DEFAULT_SIZE, DEFAULT_HASHES)
added = []  # distinct items actually added, to tell a false positive from a true hit


def _reset(size=DEFAULT_SIZE, num_hashes=DEFAULT_HASHES):
    global bloom, added
    bloom = BloomFilter(size, num_hashes)
    added = []


def _state():
    return {
        **bloom.to_dict(),
        "added": list(added),
        "limits": {
            "min_size": MIN_SIZE,
            "max_size": MAX_SIZE,
            "max_hashes": MAX_HASHES,
            "max_item_length": MAX_ITEM_LEN,
            "max_adds": MAX_ADDS,
        },
    }


def _bad(msg):
    return fail(msg, _state())


def _item(data):
    v = data.get("item")
    if isinstance(v, str) and v.strip() and len(v) <= MAX_ITEM_LEN:
        try:
            v.encode("utf-8")  # lone surrogates are valid JSON but not valid text
        except UnicodeEncodeError:
            return None
        return v
    return None


def _int_in(v, lo, hi):
    if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi:
        return v
    return None


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/configure", methods=["POST"])
def configure():
    data = body()
    size = _int_in(data.get("size"), MIN_SIZE, MAX_SIZE)
    hashes = _int_in(data.get("num_hashes"), 1, MAX_HASHES)
    if size is None:
        return _bad(f"size must be a whole number from {MIN_SIZE} to {MAX_SIZE}")
    if hashes is None:
        return _bad(f"num_hashes must be a whole number from 1 to {MAX_HASHES}")
    _reset(size, hashes)
    return ok(_state())


@bp.route("/add", methods=["POST"])
def add():
    item = _item(body())
    if item is None:
        return _bad(f"item must be a non-empty string of at most {MAX_ITEM_LEN} characters")
    if bloom.count >= MAX_ADDS:
        return _bad(f"at most {MAX_ADDS} adds allowed; reset to continue")
    positions = bloom.add(item)
    if item not in added:
        added.append(item)
    return ok(_state(), {"item": item, "positions": positions})


@bp.route("/check", methods=["POST"])
def check():
    item = _item(body())
    if item is None:
        return _bad(f"item must be a non-empty string of at most {MAX_ITEM_LEN} characters")
    positions = bloom.positions(item)
    possibly = bloom.might_contain(item)
    return ok(
        _state(),
        {
            "item": item,
            "positions": positions,
            "possibly_present": possibly,
            "actually_added": item in added,
            "false_positive": possibly and item not in added,
        },
    )
