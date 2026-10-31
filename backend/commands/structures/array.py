"""Array explorer: catalog and handlers, each recording animation frames.

A handler is ``handler(instance, recorder, *args)`` and returns the call's result.
"""

import functools

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


class _Sorter:
    """The live array plus a frame helper, so each sort only holds its logic."""

    def __init__(self, array, rec):
        self.array, self.rec = array, rec
        self.a = array._data  # the backing list: writes change the real array
        self.n = len(array)

    def show(self, note, highlight=(), pointers=None, moves=None):
        """moves lists what this step moved, so the page can draw it: {"kind", "from", "to"}."""
        aux = {"moves": moves} if moves else None
        self.rec.add(self.array.to_dict(), note, highlight, pointers, aux)

    def swap(self, i, j):
        self.a[i], self.a[j] = self.a[j], self.a[i]


def _swapped(i, j):
    return [{"kind": "swap", "from": i, "to": j}]


def _sorting(algorithm):
    """Turns ``algorithm(sorter)`` into a handler that checks, sorts and ends on "Sorted"."""

    @functools.wraps(algorithm)
    def handler(array, rec):
        nums = _numbers(array)
        if not nums:
            raise CommandError("runtime_error", "array is empty")
        sorter = _Sorter(array, rec)
        algorithm(sorter)
        sorter.show("Sorted")
        return list(array._data[: len(nums)])

    return handler


@_sorting
def bubble_sort(s):
    a = s.a
    for end in range(s.n - 1, 0, -1):
        swapped = False
        for j in range(end):
            x, y = a[j], a[j + 1]
            moves = None
            if x > y:
                s.swap(j, j + 1)
                swapped = True
                moves = _swapped(j, j + 1)
                note = "Compare %s and %s: out of order, swap them" % (x, y)
            else:
                note = "Compare %s and %s: already in order" % (x, y)
            s.show(note, [j, j + 1], {"i": j, "j": j + 1}, moves)
        if not swapped:
            return


@_sorting
def selection_sort(s):
    a = s.a
    for i in range(s.n - 1):
        low = i
        for j in range(i + 1, s.n):
            if a[j] < a[low]:
                note = "Compare %s and %s: %s is the new smallest" % (a[j], a[low], a[j])
                low = j
            else:
                note = "Compare %s and %s: %s is still the smallest" % (a[j], a[low], a[low])
            s.show(note, [low, j], {"i": i, "min": low, "j": j})
        moves = None
        if low != i:
            s.swap(i, low)
            moves = _swapped(i, low)
            note = "%s is the smallest left: move it to index %d" % (a[i], i)
        else:
            note = "%s is the smallest left: it stays at index %d" % (a[i], i)
        s.show(note, [i, low], {"i": i, "min": low}, moves)


@_sorting
def insertion_sort(s):
    a = s.a
    for i in range(1, s.n):
        j = i
        while j > 0:
            x, y = a[j - 1], a[j]
            if x <= y:
                s.show("Compare %s and %s: in order, %s stops here" % (x, y, y),
                       [j - 1, j], {"i": i, "j": j})
                break
            s.swap(j - 1, j)
            s.show("Compare %s and %s: out of order, swap them" % (x, y),
                   [j - 1, j], {"i": i, "j": j - 1}, _swapped(j - 1, j))
            j -= 1


@_sorting
def merge_sort(s):
    a = s.a

    def merge(lo, mid, hi):
        s.show("Merge the two sorted halves", range(lo, hi), {"left": lo, "right": mid})
        left, right = lo, mid  # next unplaced element of each half
        while left < right < hi:
            x, y = a[left], a[right]
            moves = None
            if x <= y:
                note = "Compare %s and %s: %s is smaller, keep it at index %d" % (x, y, x, left)
            else:
                a[left : right + 1] = [y] + a[left:right]
                moves = [{"kind": "insert", "from": right, "to": left}]
                note = "Compare %s and %s: %s is smaller, move it to index %d" % (x, y, y, left)
                right += 1
            s.show(note, [left], {"left": left, "right": min(right, hi - 1)}, moves)
            left += 1

    def sort(lo, hi):
        if hi - lo < 2:
            return
        mid = (lo + hi) // 2
        sort(lo, mid)
        sort(mid, hi)
        merge(lo, mid, hi)

    sort(0, s.n)


@_sorting
def quick_sort(s):
    a = s.a

    def sort(lo, hi):
        if lo >= hi:
            return
        pivot = a[hi]  # always the last element, so every run is the same
        s.show("Pivot is %s" % pivot, [hi], {"pivot": hi})
        small = lo  # everything before this index is smaller than the pivot
        for j in range(lo, hi):
            moves = None
            if a[j] < pivot:
                s.swap(small, j)
                if small != j:
                    moves = _swapped(small, j)
                small += 1
                note = "%s is smaller than %s: move it to the left side" % (a[small - 1], pivot)
            else:
                note = "%s is not smaller than %s: leave it" % (a[j], pivot)
            s.show(note, [j, small], {"pivot": hi, "i": min(small, hi), "j": j}, moves)
        s.swap(small, hi)
        s.show("Put the pivot %s in its final place at index %d" % (pivot, small),
               [small], {"pivot": small}, _swapped(small, hi) if small != hi else None)
        sort(lo, small - 1)
        sort(small + 1, hi)

    sort(0, s.n - 1)


@_sorting
def heap_sort(s):
    a = s.a

    def sift_down(parent, end):
        while 2 * parent + 1 < end:
            child = 2 * parent + 1
            if child + 1 < end and a[child + 1] > a[child]:
                child += 1
            if a[child] <= a[parent]:
                return
            note = "Parent %s is smaller than child %s: swap them" % (a[parent], a[child])
            s.swap(parent, child)
            s.show(note, [parent, child], {"i": parent, "j": child}, _swapped(parent, child))
            parent = child

    for start in range(s.n // 2 - 1, -1, -1):  # build a max-heap
        sift_down(start, s.n)
    for end in range(s.n - 1, 0, -1):  # move the largest to the end, repair the heap
        s.swap(0, end)
        s.show("%s is the largest in the heap: move it to index %d" % (a[end], end),
               [0, end], {"i": 0, "j": end}, _swapped(0, end))
        sift_down(0, end)


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
        "bubble_sort": {
            "args": [],
            "complexity": "O(n^2)",
            "summary": "Repeatedly swap neighbours that are out of order until the array is sorted.",
            "handler": bubble_sort,
        },
        "selection_sort": {
            "args": [],
            "complexity": "O(n^2)",
            "summary": "Pick the smallest remaining value and move it to the front, over and over.",
            "handler": selection_sort,
        },
        "insertion_sort": {
            "args": [],
            "complexity": "O(n^2)",
            "summary": "Grow a sorted front by sliding each next value back into place.",
            "handler": insertion_sort,
        },
        "merge_sort": {
            "args": [],
            "complexity": "O(n log n)",
            "summary": "Split the array in halves, sort each, then merge them.",
            "handler": merge_sort,
        },
        "quick_sort": {
            "args": [],
            "complexity": "O(n log n) average, O(n^2) worst",
            "summary": "Split around the last element as pivot, then sort each side.",
            "handler": quick_sort,
        },
        "heap_sort": {
            "args": [],
            "complexity": "O(n log n)",
            "summary": "Build a max-heap, then repeatedly move the largest value to the end.",
            "handler": heap_sort,
        },
    },
}
