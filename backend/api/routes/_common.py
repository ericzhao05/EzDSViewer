# Shared response helpers for every structure's blueprint.
# GET  /api/<slug>       -> {"success": true, "state": ...}
# POST /api/<slug>/<op>  -> {"success": true, "state": ..., "result": ...}
# Bad input              -> 400 {"success": false, "error": "...", "state": ...}
from flask import jsonify, request


def body():
    """The JSON object sent by the client; anything else counts as an empty body."""
    try:
        data = request.get_json(silent=True)
    except RecursionError:  # absurdly nested JSON
        return {}
    return data if isinstance(data, dict) else {}


def ok(state, result=None, **extra):
    return jsonify({"success": True, "state": state, "result": result, **extra})


def fail(message, state=None, status=400):
    return jsonify({"success": False, "error": message, "state": state}), status
