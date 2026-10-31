import unittest

from api.routes import binary_tree_routes as routes
from DataStrcutures.BinaryTree import (
    TreeNode,
    build_tree,
    inorder,
    inorder_iterative,
    invert_tree,
    is_balanced,
    is_complete,
    is_full,
    is_perfect,
    level_order,
    lowest_common_ancestor,
    max_depth,
    postorder,
    preorder,
    to_nested,
)
from tests.helpers import client_for

SAMPLE = [1, 2, 3, 4, 5, None, 6]


class FunctionTests(unittest.TestCase):
    def setUp(self):
        self.root = build_tree(SAMPLE)

    def test_traversals(self):
        self.assertEqual(preorder(self.root), [1, 2, 4, 5, 3, 6])
        self.assertEqual(inorder(self.root), [4, 2, 5, 1, 3, 6])
        self.assertEqual(postorder(self.root), [4, 5, 2, 6, 3, 1])
        self.assertEqual(inorder_iterative(self.root), inorder(self.root))
        self.assertEqual(level_order(self.root), [[1], [2, 3], [4, 5, 6]])

    def test_empty(self):
        for fn in (preorder, inorder, postorder, inorder_iterative, level_order):
            self.assertEqual(fn(None), [])
        self.assertEqual(max_depth(None), 0)
        self.assertIsNone(invert_tree(None))
        self.assertIsNone(build_tree([]))

    def test_depth_invert(self):
        self.assertEqual(max_depth(self.root), 3)
        invert_tree(self.root)
        self.assertEqual(preorder(self.root), [1, 3, 6, 2, 5, 4])

    def test_lca(self):
        r = self.root
        self.assertIs(lowest_common_ancestor(r, r.left.left, r.left.right), r.left)
        self.assertIs(lowest_common_ancestor(r, r.left.left, r.right.right), r)
        self.assertIs(lowest_common_ancestor(r, r.left, r.left.right), r.left)

    def test_properties(self):
        self.assertFalse(is_full(self.root))
        self.assertFalse(is_complete(self.root))
        self.assertTrue(is_balanced(self.root))
        perfect = build_tree([1, 2, 3, 4, 5, 6, 7])
        self.assertTrue(is_perfect(perfect) and is_full(perfect) and is_complete(perfect))
        chain = build_tree([1, None, 2, None, 3])
        self.assertFalse(is_balanced(chain))
        self.assertEqual(to_nested(TreeNode(1))["left"], None)


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(routes.bp)
        self.c.post("/api/binary-tree/reset")

    def post(self, op, data=None):
        return self.c.post("/api/binary-tree/" + op, json=data)

    def test_get(self):
        j = self.c.get("/api/binary-tree").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"]["count"], 6)
        self.assertEqual(j["state"]["height"], 2)
        self.assertEqual(j["state"]["tree"]["val"], 1)

    def test_traversal_ops(self):
        expect = {
            "preorder": [1, 2, 4, 5, 3, 6],
            "inorder": [4, 2, 5, 1, 3, 6],
            "postorder": [4, 5, 2, 6, 3, 1],
            "inorder-iterative": [4, 2, 5, 1, 3, 6],
            "level-order": [[1], [2, 3], [4, 5, 6]],
            "max-depth": 3,
        }
        for op, want in expect.items():
            self.assertEqual(self.post(op).get_json()["result"], want, op)

    def test_build_and_reset(self):
        j = self.post("build", {"values": [5, 3, None, 1]}).get_json()
        self.assertEqual(j["state"]["count"], 3)
        self.assertEqual(self.post("build", {"values": []}).get_json()["state"]["tree"], None)
        self.assertEqual(self.post("preorder").get_json()["result"], [])
        self.assertEqual(self.post("reset").get_json()["state"]["count"], 6)

    def test_invert_persists(self):
        self.post("invert")
        self.assertEqual(self.post("preorder").get_json()["result"], [1, 3, 6, 2, 5, 4])

    def test_lca(self):
        self.assertEqual(self.post("lca", {"p": 4, "q": 5}).get_json()["result"], 2)
        self.assertEqual(self.post("lca", {"p": 4, "q": 6}).get_json()["result"], 1)

    def test_bad_input(self):
        bad = [
            ("build", None), ("build", {}), ("build", {"values": "x"}),
            ("build", {"values": [1, "a"]}), ("build", {"values": [1, True]}),
            ("build", {"values": [1, 1]}), ("build", {"values": [None, 1]}),
            ("build", {"values": [1, None, None, 2]}),
            ("build", {"values": [1.5]}), ("build", {"values": list(range(64))}),
            ("build", {"values": [10 ** 12]}),
            ("lca", None), ("lca", {"p": 1}), ("lca", {"p": 1, "q": 99}),
            ("lca", {"p": "1", "q": 2}), ("lca", {"p": True, "q": 2}),
        ]
        for op, data in bad:
            r = self.post(op, data)
            self.assertEqual(r.status_code, 400, (op, data))
            j = r.get_json()
            self.assertFalse(j["success"])
            self.assertEqual(j["state"]["count"], 6)

    def test_nan_and_malformed(self):
        for raw in ('{"values": [NaN]}', '{"p": Infinity, "q": 1}', "not json", "[1]"):
            for op in ("build", "lca"):
                r = self.c.post("/api/binary-tree/" + op, data=raw, content_type="application/json")
                self.assertEqual(r.status_code, 400, (op, raw))
        self.assertEqual(self.c.get("/api/binary-tree").get_json()["state"]["count"], 6)


if __name__ == "__main__":
    unittest.main()
