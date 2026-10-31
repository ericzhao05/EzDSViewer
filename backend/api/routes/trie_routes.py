from flask import Blueprint

from DataStrcutures.Trie import Trie
from api.routes._common import body, fail, ok

bp = Blueprint("trie", __name__, url_prefix="/trie")

MAX_WORDS = 40
MAX_LEN = 16
DEFAULT = ["car", "card", "care", "cat", "dog", "do"]

trie = Trie()
words = []


def _reset():
    global trie, words
    trie = Trie()
    words = []
    for w in DEFAULT:
        trie.insert(w)
        words.append(w)


_reset()


def _state():
    return {
        "tree": trie.to_dict(),
        "words": sorted(words),
        "limits": {"max_words": MAX_WORDS, "max_length": MAX_LEN},
    }


def _bad(msg):
    return fail(msg, _state())


def _text(key, allow_empty=False):
    """Lowercased ASCII letters, or None when the field is invalid."""
    v = body().get(key)
    if not isinstance(v, str):
        return None
    v = v.strip().lower()
    if (not v and not allow_empty) or len(v) > MAX_LEN:
        return None
    if not all("a" <= c <= "z" for c in v):
        return None
    return v


def _msg(key):
    return f"{key} must be 1 to {MAX_LEN} letters (a to z)"


@bp.route("", methods=["GET"])
def get_state():
    return ok(_state())


@bp.route("/reset", methods=["POST"])
def reset():
    _reset()
    return ok(_state())


@bp.route("/insert", methods=["POST"])
def insert():
    w = _text("word")
    if w is None:
        return _bad(_msg("word"))
    if w in words:
        return ok(_state(), {"word": w, "added": False, "matched": len(w)})
    if len(words) >= MAX_WORDS:
        return _bad(f"trie is limited to {MAX_WORDS} words")
    matched = trie.matched_length(w)
    trie.insert(w)
    words.append(w)
    return ok(_state(), {"word": w, "added": True, "matched": matched})


@bp.route("/search", methods=["POST"])
def search():
    w = _text("word")
    if w is None:
        return _bad(_msg("word"))
    return ok(_state(), {"word": w, "found": trie.search(w), "matched": trie.matched_length(w)})


@bp.route("/starts-with", methods=["POST"])
def starts_with():
    p = _text("prefix")
    if p is None:
        return _bad(_msg("prefix"))
    return ok(_state(), {"prefix": p, "found": trie.starts_with(p), "matched": trie.matched_length(p)})


@bp.route("/autocomplete", methods=["POST"])
def autocomplete():
    p = _text("prefix", allow_empty=True)
    if p is None:
        return _bad(f"prefix must be up to {MAX_LEN} letters (a to z)")
    found = trie.words(p)
    return ok(_state(), {"prefix": p, "words": found, "count": len(found), "matched": trie.matched_length(p)})
