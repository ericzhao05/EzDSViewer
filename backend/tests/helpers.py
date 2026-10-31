from flask import Blueprint, Flask


def client_for(bp):
    """Test client serving one structure's blueprint under /api, as the real app does."""
    parent = Blueprint("api_test", __name__)
    parent.register_blueprint(bp)
    app = Flask(__name__)
    app.register_blueprint(parent, url_prefix="/api")
    return app.test_client()
