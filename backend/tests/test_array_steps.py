import unittest

from commands.engine import run
from DataStrcutures import DynamicArray as reference

TABLE = [
    [],
    [5],
    [1, 3, 5, 7],
    [1, 2, 2, 3, 3],
    [-5, -2, 0, 3, 8],
    [-4, -1, -3],
    [2, 4, 6, 8, 10, 12],
    [-2, 1, -3, 4, -1, 2, 1, -5, 4],
]
TARGETS = [-5, 0, 1, 4, 5, 10, 13]


def command(nums, call):
    appends = "".join(".append(%d)" % n for n in nums)
    return "array" + appends + "." + call


def is_sorted(nums):
    return all(a <= b for a, b in zip(nums, nums[1:]))


class TwoSumSortedTest(unittest.TestCase):
    def test_frames_and_result(self):
        r = run("array.append(1).append(3).append(5).append(7).two_sum_sorted(10)")
        self.assertTrue(r["success"])
        self.assertEqual(len(r["frames"]), 6)
        small = r["frames"][4]
        self.assertEqual(small["call"], 4)
        self.assertEqual(small["note"], "1 + 7 = 8, too small: move the left pointer")
        self.assertEqual(small["pointers"], {"left": 0, "right": 3})
        self.assertEqual(small["highlight"], [0, 3])
        found = r["frames"][5]
        self.assertEqual(found["note"], "3 + 7 = 10: found target 10")
        self.assertEqual(r["result"], [1, 3])

    def test_too_large_note(self):
        r = run(command([1, 3, 5, 7], "two_sum_sorted(6)"))
        self.assertEqual(
            r["frames"][4]["note"], "1 + 7 = 8, too large: move the right pointer"
        )

    def test_no_match_last_frame(self):
        r = run(command([1, 3, 5, 7], "two_sum_sorted(100)"))
        last = r["frames"][-1]
        self.assertEqual(last["note"], "No two numbers add to 100")
        self.assertEqual(last["pointers"], {})
        self.assertEqual(r["result"], [])

    def test_matches_reference(self):
        for nums in TABLE:
            if not is_sorted(nums):
                continue
            for target in TARGETS:
                r = run(command(nums, "two_sum_sorted(%d)" % target))
                self.assertEqual(
                    r["result"], reference.two_sum_sorted(nums, target), (nums, target)
                )

    def test_unsorted_is_error(self):
        r = run(command([3, 1], "two_sum_sorted(4)"))
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["error"], "array must be sorted ascending for two pointers")


class BinarySearchTest(unittest.TestCase):
    def test_frames_and_result(self):
        r = run(command([1, 3, 5, 7], "binary_search(7)"))
        notes = [f["note"] for f in r["frames"][4:]]
        self.assertEqual(
            notes,
            [
                "Middle is 3 at index 1: too small, search the right half",
                "Middle is 5 at index 2: too small, search the right half",
                "Found 7 at index 3",
            ],
        )
        first = r["frames"][4]
        self.assertEqual(first["pointers"], {"left": 0, "mid": 1, "right": 3})
        self.assertEqual(first["highlight"], [1])
        self.assertEqual(r["result"], 3)

    def test_too_large_note(self):
        r = run(command([1, 3, 5, 7], "binary_search(1)"))
        self.assertEqual(
            r["frames"][4]["note"],
            "Middle is 3 at index 1: too large, search the left half",
        )

    def test_absent_last_frame(self):
        r = run(command([1, 3, 5, 7], "binary_search(4)"))
        last = r["frames"][-1]
        self.assertEqual(last["note"], "4 is not in the array")
        self.assertEqual(last["pointers"], {})
        self.assertEqual(r["result"], -1)

    def test_matches_reference(self):
        for nums in TABLE:
            if not is_sorted(nums):
                continue
            for target in TARGETS:
                r = run(command(nums, "binary_search(%d)" % target))
                self.assertEqual(
                    r["result"], reference.binary_search(nums, target), (nums, target)
                )

    def test_unsorted_is_error(self):
        r = run(command([3, 1], "binary_search(1)"))
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["error"], "array must be sorted ascending for binary search")


class MaxSubarrayTest(unittest.TestCase):
    def test_frames(self):
        r = run(command([-2, 1, -3, 4], "max_subarray()"))
        frames = r["frames"][4:]
        self.assertEqual(len(frames), 4)
        self.assertEqual(frames[0]["note"], "At index 0: current sum -2, best -2")
        self.assertEqual(frames[0]["pointers"], {"i": 0})
        self.assertEqual(frames[0]["highlight"], [0])
        self.assertEqual(frames[1]["highlight"], [1])
        self.assertEqual(frames[3]["note"], "At index 3: current sum 4, best 4")
        self.assertEqual(frames[3]["highlight"], [3])
        self.assertEqual(r["result"], 4)

    def test_window_extends(self):
        r = run(command([4, -1, 2], "max_subarray()"))
        self.assertEqual(r["frames"][-1]["highlight"], [0, 1, 2])
        self.assertEqual(r["frames"][-1]["note"], "At index 2: current sum 5, best 5")

    def test_matches_reference(self):
        for nums in TABLE:
            if not nums:
                continue
            r = run(command(nums, "max_subarray()"))
            self.assertEqual(r["result"], reference.max_subarray(nums), nums)
            self.assertEqual(len(r["frames"]), 2 * len(nums))

    def test_empty_is_error(self):
        r = run("array.max_subarray()")
        self.assertEqual(r["code"], "runtime_error")
        self.assertEqual(r["error"], "array is empty")


class PrefixSumsTest(unittest.TestCase):
    def test_frames(self):
        r = run(command([3, -1, 2], "prefix_sums()"))
        frames = r["frames"][3:]
        self.assertEqual(len(frames), 4)
        self.assertEqual(frames[0]["note"], "prefix[0] = 0")
        self.assertEqual(frames[0]["aux"], {"prefix": [0]})
        self.assertEqual(frames[1]["note"], "prefix[1] = 0 + 3 = 3")
        self.assertEqual(frames[1]["highlight"], [0])
        self.assertEqual(frames[2]["note"], "prefix[2] = 3 + -1 = 2")
        self.assertEqual(frames[3]["aux"], {"prefix": [0, 3, 2, 4]})
        self.assertEqual(r["result"], [0, 3, 2, 4])

    def test_matches_reference(self):
        for nums in TABLE:
            r = run(command(nums, "prefix_sums()"))
            self.assertEqual(r["result"], reference.range_sum_prefix(nums), nums)
            self.assertEqual(len(r["frames"]), 2 * len(nums) + 1)


class CommonTest(unittest.TestCase):
    CALLS = ["two_sum_sorted(4)", "binary_search(3)", "max_subarray()", "prefix_sums()"]

    def test_state_unchanged(self):
        before = run("array.append(1).append(3).append(5)")["state"]
        for call in self.CALLS:
            r = run("array.append(1).append(3).append(5)." + call)
            self.assertEqual(r["state"], before, call)
            for frame in r["frames"][3:]:
                self.assertEqual(frame["state"], before, call)

    def test_strings_rejected(self):
        for call in self.CALLS:
            r = run('array.append(1).append("a").' + call)
            self.assertFalse(r["success"], call)
            self.assertEqual(r["code"], "runtime_error", call)
            self.assertEqual(
                r["error"], "this algorithm needs an array of numbers only", call
            )


if __name__ == "__main__":
    unittest.main()
