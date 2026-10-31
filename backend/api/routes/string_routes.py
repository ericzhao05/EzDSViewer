from flask import Blueprint

from DataStrcutures.StringAlgos import (
    is_anagram,
    is_palindrome,
    longest_unique_window,
)
from api.routes._common import body, fail, ok

bp = Blueprint("string", __name__, url_prefix="/string")

MAX_LEN = 500
DEFAULT_TEXT = "abcabcbb"
_state = {"text": DEFAULT_TEXT}


def _snapshot():
    return {"text": _state["text"]}


def _text_field(data, name):
    if not isinstance(data, dict):
        return None, "request body must be a JSON object"
    value = data.get(name)
    if not isinstance(value, str):
        return None, f"'{name}' must be a string"
    if len(value) > MAX_LEN:
        return None, f"'{name}' must be at most {MAX_LEN} characters"
    return value, None


@bp.route("", methods=["GET"])
def get_string():
    return ok(_snapshot())


@bp.route("/set", methods=["POST"])
def set_text():
    value, err = _text_field(body(), "text")
    if err:
        return fail(err, _snapshot())
    _state["text"] = value
    return ok(_snapshot(), value)


@bp.route("/reset", methods=["POST"])
def reset():
    _state["text"] = DEFAULT_TEXT
    return ok(_snapshot())


@bp.route("/is_anagram", methods=["POST"])
def anagram():
    other, err = _text_field(body(), "other")
    if err:
        return fail(err, _snapshot())
    return ok(_snapshot(), is_anagram(_state["text"], other))


@bp.route("/is_palindrome", methods=["POST"])
def palindrome():
    return ok(_snapshot(), is_palindrome(_state["text"]))


@bp.route("/longest_unique_substring", methods=["POST"])
def longest_unique():
    length, start = longest_unique_window(_state["text"])
    return ok(
        _snapshot(),
        {"length": length, "start": start, "substring": _state["text"][start:start + length]},
    )
