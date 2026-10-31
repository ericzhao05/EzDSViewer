import os
import tempfile
import unittest
from urllib.parse import quote

from flask import Flask

from api import pages

INDEX = '<!doctype html><html><head><title>EzDSViewer</title></head><body><div id="root"></div></body></html>'


class PagesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        with open(os.path.join(self.tmp.name, "index.html"), "w") as f:
            f.write(INDEX)
        os.mkdir(os.path.join(self.tmp.name, "static"))
        with open(os.path.join(self.tmp.name, "static", "x.js"), "w") as f:
            f.write("console.log(1)")
        self.original = pages.BUILD_DIR
        pages.BUILD_DIR = self.tmp.name
        self.addCleanup(setattr, pages, "BUILD_DIR", self.original)
        app = Flask(__name__, static_folder=None)
        app.register_blueprint(pages.bp)
        self.client = app.test_client()

    def html(self, path, **query):
        res = self.client.get(path, query_string=query)
        self.assertEqual(res.status_code, 200)
        return res.get_data(as_text=True)

    def test_view_title_noindex_and_frame_ancestors(self):
        res = self.client.get("/v", query_string={"c": "array.append(1).pop()"})
        html = res.get_data(as_text=True)
        self.assertIn('<meta property="og:title" content="Array: 2 operations">', html)
        self.assertIn('<meta name="robots" content="noindex">', html)
        self.assertIn('<meta name="twitter:card" content="summary">', html)
        self.assertIn("Step through a data structure animation.", html)
        self.assertLess(html.index("og:title"), html.index("</head>"))
        csp = res.headers["Content-Security-Policy"]
        self.assertIn("default-src 'self'; script-src 'self'", csp)
        self.assertIn("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", csp)
        self.assertIn("font-src https://fonts.gstatic.com", csp)
        self.assertTrue(csp.endswith("; frame-ancestors 'none'"))

    def test_singular_operation(self):
        self.assertIn("Array: 1 operation\"", self.html("/v", c="array.append(1)"))

    def test_embed_csp_has_no_frame_ancestors(self):
        res = self.client.get("/embed", query_string={"c": "array.append(1)"})
        csp = res.headers["Content-Security-Policy"]
        self.assertIn("connect-src 'self'", csp)
        self.assertNotIn("frame-ancestors", csp)

    def test_default_title_without_or_with_bad_command(self):
        for query in ({}, {"c": "nope.append(1)"}, {"c": "array.append("}):
            self.assertIn('og:title" content="EzDSViewer"', self.html("/v", **query))

    def test_arguments_never_appear(self):
        hostile = '"><script>alert(1)</script>'
        for c in (hostile, 'array.append("SECRETVALUE")', 'array.append("SECRETVALUE").pop()'):
            html = self.html("/embed", c=c)
            self.assertNotIn("SECRETVALUE", html)
            self.assertNotIn("alert(1)", html)
            self.assertNotIn("<script>", html)
        self.assertIn("Array: 2 operations", self.html("/v", c='array.append("SECRETVALUE").pop()'))

    def test_missing_build_is_503(self):
        pages.BUILD_DIR = os.path.join(self.tmp.name, "missing")
        for path in ("/v", "/embed"):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 503)
            self.assertIn("Frontend build not found. Run npm run build in frontend/.", res.get_data(as_text=True))

    def test_static_serves_and_cannot_escape(self):
        res = self.client.get("/static/x.js")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_data(as_text=True), "console.log(1)")
        res.close()
        for path in ("/static/../index.html", "/static/%2e%2e/index.html", "/static/" + quote("../index.html", safe="")):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 404)
            self.assertNotIn("EzDSViewer", res.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
