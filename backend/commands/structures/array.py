"""Array explorer: catalog and handlers, each recording animation frames.

A handler is ``handler(instance, recorder, *args)`` and returns the call's result.
"""

from commands.parser import CommandError
from DataStrcutures.DynamicArray import DynamicArray

MAX_SIZE = 64
MAX_TEXT = 40


def new():
    return DynamicArray()


def _grew(before, after):
    if after["capacity"] == before["capacity"]:
        return ""
    return " (array was full: capacity %d to %d, copied %d elements)" % (
        before["capacity"],
        after["capacity"],
        before["size"],
    )


def _check_room(array):
    if len(array) >= MAX_SIZE:
        raise CommandError(
            "runtime_error", "array is full (max %d elements)" % MAX_SIZE
        )


def append(array, rec, value):
    before = array.to_dict()
    _check_room(array)
    array.append(value)
    after = array.to_dict()
    i = after["size"] - 1
    rec.add(
        after,
        "Appended %s at index %d%s" % (value, i, _grew(before, after)),
        highlight=[i],
    )
    return value


def insert(array, rec, index, value):
    before = array.to_dict()
    if not 0 <= index <= len(array):
        raise CommandError("runtime_error", "index out of range")
    _check_room(array)
    array.insert(index, value)
    after = array.to_dict()
    shifted = before["size"] - index
    rec.add(
        after,
        "Inserted %s at index %d, shifted %d elements right%s"
        % (value, index, shifted, _grew(before, after)),
        highlight=[index],
    )
    return value


def pop(array, rec, index=-1):
    i = index + len(array) if index < 0 else index
    try:
        value = array.pop(index)
    except IndexError:
        raise CommandError(
            "runtime_error", "index out of range or array is empty"
        ) from None
    rec.add(array.to_dict(), "Popped %s from index %d" % (value, i))
    return value


def get(array, rec, index):
    try:
        value = array[index]
    except IndexError:
        raise CommandError("runtime_error", "index out of range") from None
    rec.add(array.to_dict(), "array[%d] is %s" % (index, value), highlight=[index])
    return value


def reset(array, rec):
    array.__init__()
    rec.add(array.to_dict(), "Array reset")
    return None


def _numbers(array):
    nums = [array[i] for i in range(len(array))]
    if any(isinstance(n, str) for n in nums):
        raise CommandError(
            "runtime_error", "this algorithm needs an array of numbers only"
        )
    return nums


def _sorted(nums, algorithm):
    if any(a > b for a, b in zip(nums, nums[1:])):
        raise CommandError(
            "runtime_error", "array must be sorted ascending for %s" % algorithm
        )


def two_sum_sorted(array, rec, target):
    nums = _numbers(array)
    _sorted(nums, "two pointers")
    state = array.to_dict()
    left, right = 0, len(nums) - 1
    while left < right:
        a, b = nums[left], nums[right]
        total = a + b
        pointers = {"left": left, "right": right}
        if total == target:
            rec.add(
                state,
                "%d + %d = %d: found target %d" % (a, b, total, target),
                highlight=[left, right],
                pointers=pointers,
            )
            return [left, right]
        side = "left" if total < target else "right"
        rec.add(
            state,
            "%d + %d = %d, too %s: move the %s pointer"
            % (a, b, total, "small" if total < target else "large", side),
            highlight=[left, right],
            pointers=pointers,
        )
        if total < target:
            left += 1
        else:
            right -= 1
    rec.add(state, "No two numbers add to %d" % target)
    return []


def binary_search(array, rec, target):
    nums = _numbers(array)
    _sorted(nums, "binary search")
    state = array.to_dict()
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        x = nums[mid]
        pointers = {"left": left, "mid": mid, "right": right}
        if x == target:
            rec.add(
                state,
                "Found %d at index %d" % (target, mid),
                highlight=[mid],
                pointers=pointers,
            )
            return mid
        if x < target:
            note = "Middle is %d at index %d: too small, search the right half"
            left = mid + 1
        else:
            note = "Middle is %d at index %d: too large, search the left half"
            right = mid - 1
        rec.add(state, note % (x, mid), highlight=[mid], pointers=pointers)
    rec.add(state, "%d is not in the array" % target)
    return -1


def max_subarray(array, rec):
    nums = _numbers(array)
    if not nums:
        raise CommandError("runtime_error", "array is empty")
    state = array.to_dict()
    best = current = nums[0]
    start = 0
    for i, num in enumerate(nums):
        if i > 0:
            if num > current + num:
                start = i
            current = max(num, current + num)
            best = max(best, current)
        rec.add(
            state,
            "At index %d: current sum %d, best %d" % (i, current, best),
            highlight=range(start, i + 1),
            pointers={"i": i},
        )
    return best


def prefix_sums(array, rec):
    nums = _numbers(array)
    state = array.to_dict()
    prefix = [0]
    rec.add(state, "prefix[0] = 0", aux={"prefix": list(prefix)})
    for i, num in enumerate(nums):
        before = prefix[-1]
        prefix.append(before + num)
        rec.add(
            state,
            "prefix[%d] = %d + %d = %d" % (i + 1, before, num, prefix[-1]),
            highlight=[i],
            aux={"prefix": list(prefix)},
        )
    return prefix


def _arg(name, type_, optional=False):
    return {"name": name, "type": type_, "optional": optional}


CATALOG = {
    "label": "Array",
    "summary": "A dynamic array that doubles its capacity when it fills up.",
    "example": 'array.append(1).append("hi").insert(0, 5).get(1).pop()',
    "limits": {"max_size": MAX_SIZE, "max_text": MAX_TEXT},
    "methods": {
        "append": {
            "args": [_arg("value", "value")],
            "complexity": "O(1) amortized",
            "summary": "Add a value at the end, doubling capacity if full.",
            "handler": append,
        },
        "insert": {
            "args": [_arg("index", "index"), _arg("value", "value")],
            "complexity": "O(n)",
            "summary": "Insert a value at an index, shifting later elements right.",
            "handler": insert,
        },
        "pop": {
            "args": [_arg("index", "index", optional=True)],
            "complexity": "O(n)",
            "summary": "Remove and return the element at an index (default last).",
            "handler": pop,
        },
        "get": {
            "args": [_arg("index", "index")],
            "complexity": "O(1)",
            "summary": "Read the element at an index.",
            "handler": get,
        },
        "reset": {
            "args": [],
            "complexity": "O(1)",
            "summary": "Clear the array back to its initial empty state.",
            "handler": reset,
        },
        "two_sum_sorted": {
            "args": [_arg("target", "target")],
            "complexity": "O(n)",
            "summary": "Find two elements of a sorted array that add up to the target.",
            "handler": two_sum_sorted,
        },
        "binary_search": {
            "args": [_arg("target", "target")],
            "complexity": "O(log n)",
            "summary": "Find a target in a sorted array by halving the search range.",
            "handler": binary_search,
        },
        "max_subarray": {
            "args": [],
            "complexity": "O(n)",
            "summary": "Largest sum of a contiguous run of elements (Kadane's algorithm).",
            "handler": max_subarray,
        },
        "prefix_sums": {
            "args": [],
            "complexity": "O(n)",
            "summary": "Build running totals so any range sum is a subtraction.",
            "handler": prefix_sums,
        },
    },
}
