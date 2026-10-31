import unittest

from DataStrcutures import BinarySearchTree as b
from api.routes import bst_routes as r
from tests.helpers import client_for


def make(vals):
    root = None
    for v in vals:
        root = b.bst_insert(root, v)
    return root


class ClassTests(unittest.TestCase):
    def test_insert_inorder_sorted_and_duplicates_ignored(self):
        root = make([5, 3, 8, 1, 4, 5, 3])
        self.assertEqual(b.inorder(root), [1, 3, 4, 5, 8])
        self.assertEqual(b.count_nodes(root), 5)

    def test_search(self):
        root = make([5, 3, 8])
        self.assertEqual(b.bst_search(root, 8).val, 8)
        self.assertIsNone(b.bst_search(root, 7))
        self.assertIsNone(b.bst_search(None, 1))
        self.assertEqual(b.search_path(root, 3), [5, 3])

    def test_delete_cases(self):
        base = [50, 30, 70, 20, 40, 60, 80, 65]
        self.assertEqual(b.delete_case(make(base), 20), "leaf")
        self.assertEqual(b.delete_case(make(base), 60), "one-child")
        self.assertEqual(b.delete_case(make(base), 50), "two-children")
        self.assertIsNone(b.delete_case(make(base), 99))
        root = b.bst_delete(make(base), 20)
        self.assertEqual(b.inorder(root), [30, 40, 50, 60, 65, 70, 80])
        root = b.bst_delete(make(base), 60)
        self.assertEqual(root.right.left.val, 65)
        root = make(base)
        self.assertEqual(b.inorder_successor(root, 50), 60)
        root = b.bst_delete(root, 50)
        self.assertEqual(root.val, 60)
        self.assertEqual(b.inorder(root), [20, 30, 40, 60, 65, 70, 80])
        self.assertTrue(b.is_valid_bst(root))
        self.assertIsNone(b.bst_delete(None, 1))
        self.assertIsNone(b.bst_delete(make([1]), 1))

    def test_delete_missing_is_noop(self):
        root = make([2, 1, 3])
        b.bst_delete(root, 9)
        self.assertEqual(b.inorder(root), [1, 2, 3])

    def test_is_valid_bounds(self):
        # 6 is in the left subtree of 5 but sits to the right of 4: locally fine, globally invalid
        bad = b.from_level_order([5, 4, 7, None, 6])
        self.assertFalse(b.is_valid_bst(bad))
        self.assertTrue(b.is_valid_bst(make([5, 4, 7])))
        self.assertTrue(b.is_valid_bst(None))
        self.assertFalse(b.is_valid_bst(b.from_level_order([2, 2, 3])))

    def test_kth_smallest(self):
        root = make([5, 3, 8, 1, 4])
        self.assertEqual([b.kth_smallest(root, k) for k in range(1, 6)], [1, 3, 4, 5, 8])

    def test_sorted_insert_degenerates(self):
        root = make(range(10))
        self.assertEqual(b.height(root), 9)
        self.assertEqual(b.height(None), -1)

    def test_lca(self):
        root = make([6, 2, 8, 0, 4, 7, 9, 3, 5])
        self.assertEqual(b.lowest_common_ancestor(root, 2, 8), 6)
        self.assertEqual(b.lowest_common_ancestor(root, 2, 4), 2)
        self.assertEqual(b.lowest_common_ancestor(root, 3, 5), 4)


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.c = client_for(r.bp)
        self.c.post("/api/bst/reset")

    def post(self, op, data=None):
        return self.c.post("/api/bst/" + op, json=data)

    def test_get_state(self):
        j = self.c.get("/api/bst").get_json()
        self.assertTrue(j["success"])
        self.assertIsNone(j["result"])
        self.assertEqual(j["state"]["inorder"], [20, 30, 40, 50, 60, 70, 80])
        self.assertEqual(j["state"]["height"], 2)
        self.assertEqual(j["state"]["tree"]["val"], 50)

    def test_insert(self):
        j = self.post("insert", {"value": 65}).get_json()
        self.assertEqual(j["result"]["path"], [50, 70, 60])
        self.assertIn(65, j["state"]["inorder"])

    def test_insert_duplicate_and_bad(self):
        self.assertEqual(self.post("insert", {"value": 50}).status_code, 400)
        for bad in [None, {}, {"value": "x"}, {"value": True}, {"value": 1.5}, {"value": 10 ** 12},
                    {"value": [1]}]:
            self.assertEqual(self.post("insert", bad).status_code, 400, bad)

    def test_nan_rejected(self):
        resp = self.c.post("/api/bst/insert", data='{"value": NaN}', content_type="application/json")
        self.assertEqual(resp.status_code, 400)
        resp = self.c.post("/api/bst/insert", data="not json", content_type="application/json")
        self.assertEqual(resp.status_code, 400)

    def test_capacity(self):
        for v in range(101, 125):
            self.assertEqual(self.post("insert", {"value": v}).status_code, 200)
        resp = self.post("insert", {"value": 999})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.get_json()["state"]["count"], r.MAX_NODES)

    def test_search(self):
        j = self.post("search", {"value": 60}).get_json()
        self.assertEqual(j["result"], {"found": True, "path": [50, 70, 60]})
        j = self.post("search", {"value": 61}).get_json()
        self.assertFalse(j["result"]["found"])
        self.assertEqual(self.post("search", {}).status_code, 400)

    def test_delete(self):
        j = self.post("delete", {"value": 50}).get_json()
        self.assertEqual(j["result"]["case"], "two-children")
        self.assertEqual(j["result"]["successor"], 60)
        self.assertEqual(j["state"]["tree"]["val"], 60)
        j = self.post("delete", {"value": 20}).get_json()
        self.assertEqual(j["result"]["case"], "leaf")
        self.assertEqual(self.post("delete", {"value": 20}).status_code, 400)
        self.assertEqual(self.post("delete", {"value": "a"}).status_code, 400)

    def test_delete_all_then_empty(self):
        for v in [20, 30, 40, 50, 60, 70, 80]:
            self.assertEqual(self.post("delete", {"value": v}).status_code, 200)
        j = self.c.get("/api/bst").get_json()["state"]
        self.assertIsNone(j["tree"])
        self.assertEqual(j["height"], -1)
        self.assertEqual(self.post("kth-smallest", {"k": 1}).status_code, 400)

    def test_kth(self):
        self.assertEqual(self.post("kth-smallest", {"k": 3}).get_json()["result"]["value"], 40)
        for bad in [{"k": 0}, {"k": 8}, {"k": "1"}, {}]:
            self.assertEqual(self.post("kth-smallest", bad).status_code, 400)

    def test_inorder_and_lca(self):
        self.assertEqual(self.post("inorder").get_json()["result"], [20, 30, 40, 50, 60, 70, 80])
        self.assertEqual(self.post("lca", {"p": 20, "q": 40}).get_json()["result"], 30)
        self.assertEqual(self.post("lca", {"p": 20, "q": 99}).status_code, 400)
        self.assertEqual(self.post("lca", {"p": 20}).status_code, 400)

    def test_build(self):
        j = self.post("build", {"values": [3, 1, 2, 3]}).get_json()
        self.assertEqual(j["state"]["inorder"], [1, 2, 3])
        self.assertEqual(j["result"], 3)
        self.assertEqual(self.post("build", {"values": []}).status_code, 200)
        self.assertEqual(self.post("build", {"values": [1, "a"]}).status_code, 400)
        self.assertEqual(self.post("build", {"values": list(range(40))}).status_code, 400)
        self.assertEqual(self.post("build", {"values": "1,2"}).status_code, 400)
        self.assertEqual(self.post("build", {}).status_code, 400)

    def test_is_valid(self):
        self.assertTrue(self.post("is-valid").get_json()["result"]["valid"])
        j = self.post("is-valid", {"values": [5, 4, 7, None, 6]}).get_json()
        self.assertFalse(j["result"]["valid"])
        self.assertTrue(self.post("is-valid", {"values": [5, 4, 7]}).get_json()["result"]["valid"])
        self.assertEqual(self.post("is-valid", {"values": [None, 1]}).status_code, 400)
        self.assertEqual(self.post("is-valid", {"values": ["a"]}).status_code, 400)
        self.assertEqual(self.post("is-valid", {"values": 3}).status_code, 400)

    def test_clear_and_reset(self):
        self.post("clear")
        self.assertEqual(self.c.get("/api/bst").get_json()["state"]["count"], 0)
        self.assertEqual(self.post("reset").get_json()["state"]["count"], 7)


if __name__ == "__main__":
    unittest.main()
