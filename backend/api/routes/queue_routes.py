from flask import Blueprint, jsonify

bp = Blueprint('queue', __name__, url_prefix='/queue')


# Placeholder until the queue task replaces it.
@bp.route('', methods=['GET'])
def get_queue():
    return jsonify({"success": True, "state": None, "result": None})
