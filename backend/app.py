# 1. Creates the Flask application
# 2. Configures CORS to allow frontend-backend communication
# 3. Registers the routes from ds_api (where your data structure operations are defined)
# 4. Adds some utility and example endpoints
# 5. Starts the server

from flask import Flask, jsonify, request
from flask_cors import CORS

# Import your routes from the api folder
from api.ds_routes import ds_api  # a Blueprint (like a route module)
from api.pages import bp as pages_bp

app = Flask(__name__, static_folder=None)
# Make sure the CORS configuration is correct
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Register the routes with a prefix
app.register_blueprint(ds_api, url_prefix="/api")
app.register_blueprint(pages_bp)

# Add a route that prints all registered routes for debugging
@app.route('/routes')
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            "endpoint": rule.endpoint,
            "methods": list(rule.methods),
            "rule": str(rule)
        })
    return jsonify({"routes": routes})

@app.route('/api/data', methods=['GET'])
def get_data():
    # Example endpoint that returns data
    return jsonify({"message": "Data from backend"})

@app.route('/api/process', methods=['POST'])
def process_data():
    # Example endpoint that processes data sent from frontend
    data = request.json
    # Process the data
    return jsonify({"result": "Processed " + data.get("input", "")})

@app.route('/api/test', methods=['GET'])
def test():
    print("Test endpoint was called!")
    return jsonify({"message": "API is working!"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
