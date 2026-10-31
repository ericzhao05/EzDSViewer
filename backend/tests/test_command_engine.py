import unittest

from commands.engine import MAX_FRAMES, Recorder, run
from commands.parser import CommandError
from commands.structures import STRUCTURES
from commands.structures.array import CATALOG

EMPTY = {"data": [None, None], "size": 0, "capacity": 2, "resizes": 0}


class AppendInsertTest(unittest.TestCase):
    def test_append_frame_and_response(self):
        r = run("array.append(1)")
        self.assertTrue(r["success"])
        self.assertIsNone(r["error"])
        self.assertEqual(r["structure"], "array")
        self.assertEqual(r["command"], "array.append(1)")
        self.assertEqual(r["calls"], ["append(1)"])
        self.assertEqual(
            r["frames"],
            [
                {
                    "call": 0,
                    "state": {"data": [1, None], "size": 1, "capacity": 2, "resizes": 0},
                    "highlight": [0],
                    "pointers": {},
                    "aux": None,
                    "note": "Appended 1 at index 0",
                }
            ],
        )
        self.assertEqual(r["state"], r["frames"][0]["state"])
        self.assertEqual(r["result"], 1)

    def test_three_appends_grow_on_third(self):
        r = run("array.append(1).append(2).append(3)")
        self.assertEqual(len(r["frames"]), 3)
        self.assertEqual(len(r["calls"]), 3)
        self.assertEqual([f["call"] for f in r["frames"]], [0, 1, 2])
        self.assertEqual(r["state"]["capacity"], 4)
        self.assertEqual(
            r["frames"][2]["note"],
            "Appended 3 at index 2 (array was full: capacity 2 to 4, copied 2 elements)",
        )
        self.assertNotIn("full", r["frames"][1]["note"])

    def test_insert(self):
        r = run("array.append(1).append(2).insert(0, 9)")
        f = r["frames"][2]
        self.assertEqual(
            f["note"],
            "Inserted 9 at index 0, shifted 2 elements right"
            " (array was full: capacity 2 to 4, copied 2 elements)",
        )
        self.assertEqual(f["highlight"], [0])
        self.assertEqual(r["state"]["data"], [9, 1, 2, None])
        self.assertEqual(r["result"], 9)

    def test_insert_out_of_range(self):
        r = run("array.insert(1, 5)")
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["error"], "index out of range")
        self.assertEqual(r["failed_call"], 0)

    def test_string_values(self):
        r = run('array.append("hi")')
        self.assertEqual(r["frames"][0]["note"], "Appended hi at index 0")
        self.assertEqual(r["result"], "hi")


class PopGetResetTest(unittest.TestCase):
    def test_pop(self):
        r = run("array.append(1).append(2).pop()")
        f = r["frames"][2]
        self.assertEqual(f["note"], "Popped 2 from index 1")
        self.assertEqual(f["highlight"], [])
        self.assertEqual(r["result"], 2)

    def test_pop_index(self):
        r = run("array.append(1).append(2).pop(0)")
        self.assertEqual(r["frames"][2]["note"], "Popped 1 from index 0")
        self.assertEqual(r["state"]["data"][:1], [2])

    def test_pop_empty(self):
        r = run("array.pop()")
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["error"], "index out of range or array is empty")

    def test_get(self):
        r = run("array.append(7).get(0)")
        self.assertEqual(r["frames"][1]["note"], "array[0] is 7")
        self.assertEqual(r["frames"][1]["highlight"], [0])
        self.assertEqual(r["result"], 7)

    def test_get_out_of_range_and_negative(self):
        for cmd in ("array.get(0)", "array.append(1).get(-1)"):
            r = run(cmd)
            self.assertEqual(r["code"], "runtime_error")
            self.assertEqual(r["error"], "index out of range")

    def test_reset(self):
        r = run("array.append(1).reset()")
        self.assertEqual(r["frames"][1]["note"], "Array reset")
        self.assertIsNone(r["result"])
        self.assertEqual(r["state"], EMPTY)

    def test_runtime_error_keeps_frames(self):
        r = run("array.append(1).pop().pop()")
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["failed_call"], 2)
        self.assertEqual(len(r["frames"]), 2)
        self.assertEqual(r["calls"], ["append(1)", "pop()"])
        self.assertEqual(r["command"], "array.append(1).pop().pop()")
        self.assertEqual(r["position"], 22)


class FailureTest(unittest.TestCase):
    def test_bare_structure(self):
        r = run("array")
        self.assertTrue(r["success"])
        self.assertEqual(r["frames"], [])
        self.assertEqual(r["calls"], [])
        self.assertEqual(r["state"], EMPTY)

    def test_unknown_structure(self):
        r = run("stack.push(1)")
        self.assertEqual(r["code"], "unknown_structure")
        self.assertEqual(r["error"], 'no explorer for "stack" yet; available: array')
        self.assertEqual(r["available"], ["array"])
        self.assertIsNone(r["state"])
        self.assertIsNone(r["structure"])
        self.assertEqual((r["frames"], r["calls"]), ([], []))

    def test_syntax_error(self):
        r = run("array.append(")
        self.assertEqual(r["code"], "syntax")
        self.assertIsNone(r["state"])
        self.assertEqual(r["command"], "array.append(")
        self.assertEqual((r["frames"], r["calls"]), ([], []))

    def test_missing_command(self):
        self.assertEqual(run("")["code"], "missing_command")

    def test_unknown_method(self):
        r = run("array.append(1).nope()")
        self.assertEqual(r["code"], "unknown_method")
        self.assertEqual(
            r["error"],
            'array has no method "nope"; available: append, insert, pop, get, reset,'
            " two_sum_sorted, binary_search, max_subarray, prefix_sums",
        )
        self.assertEqual(r["position"], 16)
        self.assertEqual(r["available"], list(CATALOG["methods"]))
        self.assertEqual(r["frames"], [])
        self.assertEqual(r["calls"], [])
        self.assertEqual(r["state"], EMPTY)
        self.assertEqual(r["failed_call"], 1)

    def test_bad_argument_type(self):
        r = run('array.append(1).get("a")')
        self.assertEqual(r["code"], "bad_argument")
        self.assertIn("get", r["error"])
        self.assertIn("index", r["error"])
        self.assertEqual(r["position"], 16)
        self.assertEqual(r["frames"], [])
        self.assertEqual(r["failed_call"], 1)

    def test_bad_argument_count(self):
        for cmd in ("array.append()", "array.append(1, 2)", "array.insert(1)", "array.reset(1)"):
            r = run(cmd)
            self.assertEqual(r["code"], "bad_argument", cmd)
            self.assertEqual(r["failed_call"], 0)

    def test_bad_value(self):
        for cmd in ("array.append([1])", 'array.append("")', 'array.append("%s")' % ("x" * 41)):
            self.assertEqual(run(cmd)["code"], "bad_argument", cmd)
        self.assertTrue(run('array.append("%s")' % ("x" * 40))["success"])

    def test_dunder_and_handler_are_not_methods(self):
        for cmd in ("array.__class__()", "array.handler()", "array.__init__()"):
            self.assertEqual(run(cmd)["code"], "unknown_method", cmd)

    def test_array_full(self):
        r = run("array" + ".append(1)" * 65)
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["error"], "array is full (max 64 elements)")
        self.assertEqual(r["failed_call"], 64)
        self.assertEqual(len(r["frames"]), 64)

    def test_insert_into_full_array(self):
        r = run("array" + ".append(1)" * 64 + ".insert(0, 2)")
        self.assertEqual(r["error"], "array is full (max 64 elements)")

    def test_html_value_is_plain_data(self):
        r = run('array.append("<b>x</b>")')
        self.assertTrue(r["success"])
        self.assertEqual(r["result"], "<b>x</b>")

    def test_deterministic_and_isolated(self):
        from api.routes import array_routes

        before = array_routes.array.to_dict()
        self.assertEqual(run("array.append(1).append(2)"), run("array.append(1).append(2)"))
        self.assertEqual(array_routes.array.to_dict(), before)


class TimeAndFrameLimitTest(unittest.TestCase):
    def test_timeout(self):
        ticks = iter(range(0, 1000, 3))
        r = run("array.append(1).append(2)", clock=lambda: next(ticks))
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "timeout")
        self.assertEqual(r["failed_call"], 0)

    def test_frame_limit(self):
        rec = Recorder(clock=lambda: 0)
        for _ in range(MAX_FRAMES):
            rec.add({}, "x")
        with self.assertRaises(CommandError) as ctx:
            rec.add({}, "x")
        self.assertEqual(ctx.exception.code, "too_many_frames")
        self.assertEqual(len(rec.frames), MAX_FRAMES)


class OutOfRangeIntegerTest(unittest.TestCase):
    def test_keeps_board_and_failed_call(self):
        text = "array.append(1).append(1000000001)"
        r = run(text)
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "bad_argument")
        self.assertEqual(r["structure"], "array")
        self.assertEqual(r["calls"], [])
        self.assertEqual(r["frames"], [])
        self.assertEqual(r["state"], EMPTY)
        self.assertEqual(r["failed_call"], 1)
        self.assertEqual(r["position"], text.index("1000000001"))
        self.assertEqual(r["command"], text)

    def test_unknown_structure_is_clean(self):
        r = run("nope.f(1000000001)")
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "unknown_structure")
        self.assertIsNone(r["state"])
        self.assertIsNone(r["failed_call"])


class CatalogTest(unittest.TestCase):
    def test_registry(self):
        self.assertEqual(list(STRUCTURES), ["array"])
        self.assertIs(STRUCTURES["array"].CATALOG, CATALOG)

    def test_entry_shape(self):
        for key in ("label", "summary", "example", "limits"):
            self.assertIn(key, CATALOG)
        self.assertEqual(CATALOG["limits"], {"max_size": 64, "max_text": 40})
        for name, m in CATALOG["methods"].items():
            for key in ("args", "complexity", "summary", "handler"):
                self.assertIn(key, m, name)
            for a in m["args"]:
                self.assertEqual(set(a), {"name", "type", "optional"})
                self.assertIn(a["type"], ("value", "index", "target"))

    def test_example_runs(self):
        self.assertTrue(run(CATALOG["example"])["success"])


if __name__ == "__main__":
    unittest.main()
