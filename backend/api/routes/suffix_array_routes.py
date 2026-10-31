from flask import Blueprint

from DataStrcutures.SuffixArray import SuffixArray
from api.routes._common import body, fail, ok

bp = Blueprint("suffix_array", __name__, url_prefix="/suffix-array")

DEFAULT_TEXT = "banana"
MAX_TEXT_LEN = 200
MAX_PATTERN_LEN = 200

sa = SuffixArray(DEFAULT_TEXT)


def _state():
    return {**sa.to_dict(), "limits": {"max_text_length": MAX_TEXT_LEN, "max_pattern_length": MAX_PATTERN_LEN}}


def _valid(v, limit):
    if not isinstance(v, str) or not 0 < len(v) <= limit:
        return False
    try:
        v.encode("utf-8")  # lone surrogates are valid JSON but not valid text
    except UnicodeEncodeError:
        return False
    return True


def _bad(msg):
    return fail(msg, _state())


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    sa.set_text(DEFAULT_TEXT)
    return ok(_state())


@bp.route("/build", methods=["POST"])
def build():
    text = body().get("text")
    if not _valid(text, MAX_TEXT_LEN):
        return _bad(f"text must be a non-empty string of at most {MAX_TEXT_LEN} characters")
    sa.set_text(text)
    return ok(_state(), {"length": len(text)})


def _pattern(data):
    p = data.get("pattern")
    return p if _valid(p, MAX_PATTERN_LEN) else None


@bp.route("/search", methods=["POST"])
def search():
    p = _pattern(body())
    if p is None:
        return _bad(f"pattern must be a non-empty string of at most {MAX_PATTERN_LEN} characters")
    lo, hi = sa.search_range(p)
    return ok(_state(), {
        "pattern": p,
        "positions": sorted(sa.sa[lo:hi]),
        "count": hi - lo,
        "range": [lo, hi],
    })


@bp.route("/count", methods=["POST"])
def count():
    p = _pattern(body())
    if p is None:
        return _bad(f"pattern must be a non-empty string of at most {MAX_PATTERN_LEN} characters")
    lo, hi = sa.search_range(p)
    return ok(_state(), {"pattern": p, "count": hi - lo, "range": [lo, hi]})


@bp.route("/longest-repeated", methods=["POST"])
def longest_repeated():
    s = sa.longest_repeated_substring()
    return ok(_state(), {"substring": s, "length": len(s)})
