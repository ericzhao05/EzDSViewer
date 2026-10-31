# Shared response helpers for every structure's blueprint.
# GET  /api/<slug>       -> {"success": true, "state": ...}
# POST /api/<slug>/<op>  -> {"success": true, "state": ..., "result": ...}
# Bad input              -> 400 {"success": false, "error": "...", "state": ...}
from flask import jsonify, request


def body():
    return request.get_json(silent=True) or {}


def ok(state, result=None, **extra):
    return jsonify({"success": True, "state": state, "result": result, **extra})


def fail(message, state=None, status=400):
    return jsonify({"success": False, "error": message, "state": state}), status
