"""Serves the built frontend for the /v and /embed player pages."""

import os

from flask import Blueprint, Response, request, send_from_directory
from markupsafe import escape

from commands.parser import CommandError, parse
from commands.structures import STRUCTURES

bp = Blueprint("pages", __name__)

BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "build")

NO_BUILD = "Frontend build not found. Run npm run build in frontend/."
DEFAULT_TITLE = "EzDSViewer"
DESCRIPTION = "Step through a data structure animation."
CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
)


def _title(text):
    """Page title from the command's structure and call count; never its arguments."""
    try:
        command = parse(text)
    except CommandError:
        return DEFAULT_TITLE
    module = STRUCTURES.get(command.structure)
    if module is None:
        return DEFAULT_TITLE
    n = len(command.calls)
    return "%s: %d operation%s" % (module.CATALOG["label"], n, "" if n == 1 else "s")


def _page(frame_ancestors):
    try:
        with open(os.path.join(BUILD_DIR, "index.html"), encoding="utf-8") as f:
            html = f.read()
    except OSError:
        return Response(NO_BUILD, status=503, mimetype="text/plain")
    tags = (
        '<meta name="robots" content="noindex">'
        '<meta property="og:title" content="%s">'
        '<meta property="og:description" content="%s">'
        '<meta name="twitter:card" content="summary">'
    ) % (escape(_title(request.args.get("c", ""))), escape(DESCRIPTION))
    res = Response(html.replace("</head>", tags + "</head>", 1), mimetype="text/html")
    res.headers["Content-Security-Policy"] = CSP + ("; frame-ancestors 'none'" if frame_ancestors else "")
    return res


@bp.route("/v")
def view():
    return _page(frame_ancestors=True)


@bp.route("/embed")
def embed():
    return _page(frame_ancestors=False)


@bp.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(os.path.join(BUILD_DIR, "static"), filename)
