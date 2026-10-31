"""Runs a parsed command against a fresh structure and collects animation frames."""

import time

from commands.parser import CommandError, format_call, parse
from commands.structures import STRUCTURES

MAX_FRAMES = 1000
MAX_SECONDS = 2


class Recorder:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.start = clock()
        self.frames = []
        self.call = 0

    def add(self, state, note, highlight=(), pointers=None, aux=None):
        if len(self.frames) >= MAX_FRAMES:
            raise CommandError(
                "too_many_frames", "too many animation frames (max %d)" % MAX_FRAMES
            )
        if self.clock() - self.start > MAX_SECONDS:
            raise CommandError(
                "timeout", "command took too long (max %d seconds)" % MAX_SECONDS
            )
        self.frames.append(
            {
                "call": self.call,
                "state": state,
                "highlight": list(highlight),
                "pointers": pointers or {},
                "aux": aux,
                "note": note,
            }
        )


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _valid(kind, v, limits):
    if kind == "value":
        if isinstance(v, str):
            return 1 <= len(v) <= limits["max_text"]
        return _is_int(v)
    return _is_int(v)


_EXPECTED = {
    "value": "an integer or a string of 1 to %d characters",
    "index": "an integer",
    "target": "an integer",
}


def _check_args(catalog, call):
    """Raises bad_argument naming the method and argument."""
    specs = catalog["methods"][call.method]["args"]
    required = sum(1 for s in specs if not s["optional"])
    if len(call.args) < required:
        missing = specs[len(call.args)]["name"]
        raise CommandError(
            "bad_argument",
            '%s is missing argument "%s"' % (call.method, missing),
            call.position,
        )
    if len(call.args) > len(specs):
        raise CommandError(
            "bad_argument",
            "%s takes at most %d arguments, got %d"
            % (call.method, len(specs), len(call.args)),
            call.position,
        )
    for spec, v in zip(specs, call.args):
        if not _valid(spec["type"], v, catalog["limits"]):
            expected = _EXPECTED[spec["type"]].replace(
                "%d", str(catalog["limits"]["max_text"])
            )
            raise CommandError(
                "bad_argument",
                '%s argument "%s" must be %s' % (call.method, spec["name"], expected),
                call.position,
            )


def _failure(text, err, structure, calls, frames, state, failed_call=None):
    return {
        "success": False,
        "error": err.message,
        "code": err.code,
        "position": err.position,
        "available": err.available,
        "failed_call": failed_call,
        "structure": structure,
        "command": text,
        "calls": calls,
        "frames": frames,
        "state": state,
        "result": None,
    }


def _unknown(text, structure):
    names = sorted(STRUCTURES)
    err = CommandError(
        "unknown_structure",
        'no explorer for "%s" yet; available: %s' % (structure, ", ".join(names)),
        0,
        names,
    )
    return _failure(text, err, None, [], [], None)


def run(text, clock=time.monotonic):
    try:
        command = parse(text)
    except CommandError as err:
        module = STRUCTURES.get(err.structure) if err.structure else None
        if module is not None and err.call_index is not None:
            return _failure(
                text, err, err.structure, [], [], module.new().to_dict(), err.call_index
            )
        if err.structure and module is None:
            return _unknown(text, err.structure)
        return _failure(text, err, None, [], [], None)

    module = STRUCTURES.get(command.structure)
    if module is None:
        return _unknown(text, command.structure)

    catalog = module.CATALOG
    instance = module.new()
    name = command.structure

    # Validate every call before running any, so bad commands show no animation.
    for index, call in enumerate(command.calls):
        try:
            if call.method not in catalog["methods"]:
                methods = list(catalog["methods"])
                raise CommandError(
                    "unknown_method",
                    '%s has no method "%s"; available: %s'
                    % (name, call.method, ", ".join(methods)),
                    call.position,
                    methods,
                )
            _check_args(catalog, call)
        except CommandError as err:
            return _failure(text, err, name, [], [], instance.to_dict(), index)

    recorder = Recorder(clock)
    done = []
    result = None
    for index, call in enumerate(command.calls):
        recorder.call = index
        handler = catalog["methods"][call.method]["handler"]
        try:
            result = handler(instance, recorder, *call.args)
        except CommandError as err:
            if err.position is None:
                err.position = call.position
            return _failure(
                text, err, name, done, recorder.frames, instance.to_dict(), index
            )
        done.append(format_call(call))

    return {
        "success": True,
        "error": None,
        "structure": name,
        "command": name + "".join("." + c for c in done),
        "calls": done,
        "frames": recorder.frames,
        "state": instance.to_dict(),
        "result": result,
    }
