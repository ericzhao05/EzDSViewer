from flask import Flask


def client_for(bp):
    """Test client serving one structure's blueprint under /api, as the real app does."""
    app = Flask(__name__)
    app.register_blueprint(bp, url_prefix="/api")
    return app.test_client()
