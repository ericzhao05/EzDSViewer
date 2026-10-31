"""Hand-written parser for commands like ``array.append(1).pop()``.

Grammar (whitespace allowed between tokens):
    command := structure ( "." method "(" [ args ] ")" )*
    args    := arg ( "," arg )*
    arg     := int | string | list
    list    := "[" [ scalar ( "," scalar )* ] "]"      (one level only)
"""

from dataclasses import dataclass, field

MAX_COMMAND_CHARS = 2000
MAX_CALLS = 200
MAX_INT = 10**9

_STRUCT_START = "abcdefghijklmnopqrstuvwxyz"
_STRUCT_REST = _STRUCT_START + "0123456789_-"
_METHOD_START = _STRUCT_START + "_"
_METHOD_REST = _STRUCT_START + "0123456789_"
_DIGITS = "0123456789"
_WHITESPACE = " \t\r\n"


class CommandError(Exception):
    def __init__(self, code, message, position=None, available=None,
                 structure=None, call_index=None):
        super().__init__(message)
        self.structure = structure
        self.call_index = call_index
        self.code = code
        self.message = message
        self.position = position
        self.available = available


@dataclass
class Call:
    method: str
    args: list = field(default_factory=list)
    position: int = 0


@dataclass
class Command:
    structure: str
    calls: list = field(default_factory=list)


def _format_value(value):
    if isinstance(value, list):
        return "[" + ", ".join(_format_value(v) for v in value) + "]"
    if isinstance(value, str):
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return str(value)


def format_call(call):
    return "%s(%s)" % (call.method, ", ".join(_format_value(a) for a in call.args))


class _Parser:
    def __init__(self, text):
        self.text = text
        self.i = 0
        self.structure = None
        self.call_index = None

    def error(self, message, code="syntax", position=None):
        pos = self.i if position is None else position
        return CommandError(code, message, pos)

    def skip_ws(self):
        while self.i < len(self.text) and self.text[self.i] in _WHITESPACE:
            self.i += 1

    def peek(self):
        return self.text[self.i] if self.i < len(self.text) else ""

    def expect(self, ch):
        self.skip_ws()
        if self.peek() != ch:
            raise self.error("expected '%s'" % ch)
        self.i += 1

    def name(self, first, rest, what):
        if self.peek() == "" or self.peek() not in first:
            raise self.error("expected %s" % what)
        start = self.i
        self.i += 1
        while self.peek() != "" and self.peek() in rest:
            self.i += 1
        return self.text[start:self.i]

    def parse(self):
        self.skip_ws()
        structure = self.name(_STRUCT_START, _STRUCT_REST, "a structure name")
        self.structure = structure
        calls = []
        while True:
            self.skip_ws()
            if self.i >= len(self.text):
                return Command(structure, calls)
            if self.peek() != ".":
                raise self.error("expected '.' or end of command")
            self.i += 1
            self.skip_ws()
            position = self.i
            method = self.name(_METHOD_START, _METHOD_REST, "a method name")
            if len(calls) >= MAX_CALLS:
                raise self.error(
                    "too many calls (max %d)" % MAX_CALLS, "too_many_calls", position
                )
            self.expect("(")
            self.call_index = len(calls)
            args = self.args()
            calls.append(Call(method, args, position))

    def args(self):
        args = []
        self.skip_ws()
        if self.peek() == ")":
            self.i += 1
            return args
        while True:
            args.append(self.value(allow_list=True))
            self.skip_ws()
            ch = self.peek()
            if ch == ")":
                self.i += 1
                return args
            if ch != ",":
                raise self.error("expected ',' or ')'")
            self.i += 1

    def value(self, allow_list):
        self.skip_ws()
        ch = self.peek()
        if ch == "":
            raise self.error("unexpected end of command")
        if ch in "\"'":
            return self.string()
        if ch == "-" or ch in _DIGITS:
            return self.integer()
        if ch == "[" and allow_list:
            return self.list()
        raise self.error("expected an integer, string or list")

    def integer(self):
        start = self.i
        if self.peek() == "-":
            self.i += 1
        if self.peek() == "" or self.peek() not in _DIGITS:
            raise self.error("expected digits")
        while self.peek() != "" and self.peek() in _DIGITS:
            self.i += 1
        n = int(self.text[start:self.i])
        if abs(n) > MAX_INT:
            err = self.error(
                "integer out of range (max %d)" % MAX_INT, "bad_argument", start
            )
            err.structure = self.structure
            err.call_index = self.call_index
            raise err
        return n

    def string(self):
        start = self.i
        quote = self.text[self.i]
        self.i += 1
        out = []
        while True:
            ch = self.peek()
            if ch == "":
                raise self.error("unterminated string", position=start)
            self.i += 1
            if ch == quote:
                return "".join(out)
            if ch == "\\":
                esc = self.peek()
                if esc not in ("\\", '"', "'"):
                    raise self.error("invalid escape")
                out.append(esc)
                self.i += 1
            else:
                out.append(ch)

    def list(self):
        self.i += 1  # '['
        items = []
        self.skip_ws()
        if self.peek() == "]":
            self.i += 1
            return items
        while True:
            items.append(self.value(allow_list=False))
            self.skip_ws()
            ch = self.peek()
            if ch == "]":
                self.i += 1
                return items
            if ch != ",":
                raise self.error("expected ',' or ']'")
            self.i += 1


def parse(text):
    if len(text) > MAX_COMMAND_CHARS:
        raise CommandError(
            "too_long", "command too long (max %d characters)" % MAX_COMMAND_CHARS, MAX_COMMAND_CHARS
        )
    if not text.strip():
        raise CommandError("missing_command", "command is empty", 0)
    return _Parser(text).parse()
