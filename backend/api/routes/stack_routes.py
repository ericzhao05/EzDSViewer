from flask import Blueprint, request, jsonify
from DataStrcutures.StaticArrayStack import StaticArrayStack

bp = Blueprint('stack', __name__, url_prefix='/stack')
stack = StaticArrayStack(100)

@bp.route('/push', methods=['POST'])
def push_stack():
    try:
        data = request.json
        value = data.get('value')
        if value is not None:
            stack.push(value)
            return jsonify({"stack": stack.to_list(), "success": True})
            # 200 OK (default for successful responses)
            # 400 Bad Request (when no value is provided or the stack is empty)
            # 500 Internal Server Error (for other exceptions)
        else:
            return jsonify({"error": "No value provided", "stack": stack.to_list()}), 400
    except Exception as e:
        return jsonify({"error": str(e), "stack": stack.to_list()}), 500

@bp.route('/pop', methods=['POST'])
def pop_stack():
    try:
        if not stack.is_empty():
            stack.pop()
            return jsonify({"stack": stack.to_list(), "success": True})
        else:
            return jsonify({"error": "Stack is empty", "stack": []}), 400
    except Exception as e:
        return jsonify({"error": str(e), "stack": stack.to_list()}), 500

# Add a route to get current stack state
@bp.route('', methods=['GET'])
def get_stack():
    return jsonify({"stack": stack.to_list()})
