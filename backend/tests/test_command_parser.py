import unittest

from commands.parser import (
    MAX_CALLS,
    MAX_COMMAND_CHARS,
    MAX_INT,
    Call,
    Command,
    CommandError,
    format_call,
    parse,
)


def code_of(text):
    with unittest.TestCase().assertRaises(CommandError) as ctx:
        parse(text)
    return ctx.exception


class ParseTest(unittest.TestCase):
    def test_bare_structure(self):
        cmd = parse("array")
        self.assertIsInstance(cmd, Command)
        self.assertEqual(cmd.structure, "array")
        self.assertEqual(cmd.calls, [])

    def test_hyphenated_structure(self):
        cmd = parse('hash-table.put("a", 1)')
        self.assertEqual(cmd.structure, "hash-table")
        self.assertEqual(cmd.calls[0].args, ["a", 1])

    def test_position_is_method_offset(self):
        self.assertEqual(parse("stack.append(1)").calls[0].position, 6)

    def test_chain(self):
        calls = parse("array.append(1).pop()").calls
        self.assertEqual([c.method for c in calls], ["append", "pop"])
        self.assertIsInstance(calls[0], Call)
        self.assertEqual(calls[1].position, 16)

    def test_whitespace_allowed(self):
        calls = parse(" array . append( 1 ) ").calls
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args, [1])

    def test_argument_types(self):
        calls = parse("a.b(-5, \"x\", 'y', [1, \"z\"], [])").calls
        self.assertEqual(calls[0].args, [-5, "x", "y", [1, "z"], []])

    def test_escapes_in_input(self):
        self.assertEqual(parse(r'a.b("q\"q")').calls[0].args, ['q"q'])
        self.assertEqual(parse(r"a.b('it\'s')").calls[0].args, ["it's"])
        self.assertEqual(parse(r'a.b("a\\b")').calls[0].args, ["a\\b"])

    def test_round_trip(self):
        for value in ['a"b', "a\\b", "a)b", "a+b", "a%20b", "a b", "<script>", "日本語"]:
            with self.subTest(value=value):
                text = "a." + format_call(Call("f", [value], 0))
                self.assertEqual(parse(text).calls[0].args, [value])

    def test_format_call(self):
        self.assertEqual(format_call(Call("append", [1], 0)), "append(1)")
        self.assertEqual(format_call(Call("insert", [0, "a"], 0)), 'insert(0, "a")')
        self.assertEqual(format_call(Call("pop", [], 0)), "pop()")
        self.assertEqual(format_call(Call("f", [[1, "z"]], 0)), 'f([1, "z"])')

    def test_int_limit_boundary(self):
        self.assertEqual(parse("a.f(%d)" % MAX_INT).calls[0].args, [MAX_INT])
        self.assertEqual(parse("a.f(-%d)" % MAX_INT).calls[0].args, [-MAX_INT])


class ErrorTest(unittest.TestCase):
    def test_missing_command(self):
        for text in ["", "   "]:
            with self.subTest(text=text):
                self.assertEqual(code_of(text).code, "missing_command")

    def test_too_long(self):
        self.assertEqual(code_of("a" * (MAX_COMMAND_CHARS + 1)).code, "too_long")
        self.assertEqual(parse("a" * MAX_COMMAND_CHARS).structure, "a" * MAX_COMMAND_CHARS)

    def test_too_many_calls(self):
        self.assertEqual(len(parse("a" + ".f()" * MAX_CALLS).calls), MAX_CALLS)
        self.assertEqual(code_of("a" + ".f()" * (MAX_CALLS + 1)).code, "too_many_calls")

    def test_syntax_errors(self):
        bad = [
            "array.", "array.f(", "array.f(1", "array.f(1,)", "array.f(1 2)",
            'array.f("x', "array.f(1.5)", "array.f(true)", ".f()", "array f()",
            "array.f()x", "Array.f()", "array.f([[1]])", "[" * 1900,
        ]
        for text in bad:
            with self.subTest(text=text[:30]):
                err = code_of(text)
                self.assertEqual(err.code, "syntax")
                self.assertIsInstance(err.position, int)
                self.assertIsNone(err.available)

    def test_bad_argument(self):
        for text in ["array.f(1000000001)", "array.f(-1000000001)", "array.f([1000000001])"]:
            with self.subTest(text=text):
                self.assertEqual(code_of(text).code, "bad_argument")

    def test_out_of_range_integer_carries_structure_and_call_index(self):
        err = code_of("array.append(1).append(1000000001)")
        self.assertEqual((err.structure, err.call_index), ("array", 1))
        self.assertEqual(err.position, 23)
        err = code_of("array.f(1000000001)")
        self.assertEqual((err.structure, err.call_index), ("array", 0))

    def test_error_attributes(self):
        err = CommandError("syntax", "boom", 3)
        self.assertEqual((err.code, err.message, err.position, err.available), ("syntax", "boom", 3, None))


if __name__ == "__main__":
    unittest.main()
