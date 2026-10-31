"""The code shown on the back of each algorithm note must really work."""
import json
import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CODE_FILE = os.path.join(ROOT, "frontend", "src", "explorer", "array", "presets", "preset-3", "algorithmCode.json")
SORTS = ["bubble_sort", "selection_sort", "insertion_sort", "merge_sort", "quick_sort", "heap_sort"]
TABLE = [[], [1], [1, 2, 3], [3, 2, 1], [5, 3, 9, 1, 7, 2], [2, 2, 1, 1, 3], [-4, 0, -1, 8], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]]


def load(name, code):
    space = {}
    exec(code[name], space)  # our own file, in the repo
    return space[name]


# Deploys copy only backend/ to the server, where this file isn't present.
@unittest.skipUnless(os.path.exists(CODE_FILE), "frontend isn't here")
class AlgorithmCodeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(CODE_FILE) as f:
            cls.code = json.load(f)

    def test_every_sort_sorts(self):
        for name in SORTS:
            sort = load(name, self.code)
            for nums in TABLE:
                with self.subTest(sort=name, nums=nums):
                    self.assertEqual(sort(list(nums)), sorted(nums))

    def test_the_others_match_the_real_implementations(self):
        from DataStrcutures.DynamicArray import binary_search, max_subarray, range_sum_prefix, two_sum_sorted

        for nums in TABLE:
            ordered = sorted(nums)
            with self.subTest(nums=nums):
                for target in (-5, 0, 3, 8, 100):
                    self.assertEqual(load("two_sum_sorted", self.code)(ordered, target), two_sum_sorted(ordered, target))
                    self.assertEqual(load("binary_search", self.code)(ordered, target), binary_search(ordered, target))
                self.assertEqual(load("prefix_sums", self.code)(nums), range_sum_prefix(nums))
                if nums:
                    self.assertEqual(load("max_subarray", self.code)(nums), max_subarray(nums))

    def test_the_same_algorithms_the_page_runs(self):
        from commands.structures import STRUCTURES

        methods = STRUCTURES["array"].CATALOG["methods"]
        self.assertTrue(set(self.code) <= set(methods))


if __name__ == "__main__":
    unittest.main()
