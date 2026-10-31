from flask import Blueprint, jsonify, request

from commands.engine import run

bp = Blueprint("run", __name__, url_prefix="/run")


@bp.route("", methods=["GET"])
def run_command():
    result = run(request.args.get("cmd", ""))
    return jsonify(result), 200 if result["success"] else 400
