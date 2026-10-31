"""The public app: only the stateless command service and player pages.

app.py stays the local development app. Its routes share one copy of each structure,
so they must never be served to the public.

Run with one worker so every request shares the same rate limit counts:
gunicorn --workers 1 --threads 4 wsgi:app
"""

import threading
import time

from flask import Flask, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

from api.pages import bp as pages_bp
from api.routes.run_routes import bp as run_bp

MAX_RUNS_PER_MINUTE = 120


def create_app(clock=time.time):
    app = Flask(__name__, static_folder=None)
    # Caddy is the one proxy in front of this app; it sets the visitor's address.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    app.register_blueprint(run_bp, url_prefix="/api/run")
    app.register_blueprint(pages_bp)

    lock = threading.Lock()
    window = {"minute": None, "counts": {}}

    @app.before_request
    def limit_runs():
        if request.path != "/api/run":
            return None
        now = clock()
        minute = int(now // 60)
        with lock:
            if window["minute"] != minute:
                window["minute"] = minute
                window["counts"] = {}
            count = window["counts"].get(request.remote_addr, 0) + 1
            window["counts"][request.remote_addr] = count
        if count <= MAX_RUNS_PER_MINUTE:
            return None
        res = jsonify({"success": False, "error": "Too many requests. Please wait a minute and try again."})
        res.status_code = 429
        res.headers["Retry-After"] = str(60 - int(now % 60))
        return res

    return app


app = create_app()
