import unittest

from commands.engine import MAX_FRAMES, run

SORTS = [
    "bubble_sort",
    "selection_sort",
    "insertion_sort",
    "merge_sort",
    "quick_sort",
    "heap_sort",
]
TABLE = [
    [],
    [5],
    [2, 1],
    [1, 3, 5, 7],
    [9, 7, 5, 3, 1],
    [1, 2, 2, 3, 3],
    [4, 4, 4, 4],
    [-5, -2, 0, 3, 8],
    [-4, -1, -3],
    [3, -2, 7, 0, -9, 7, 1, 5, -2, 8],
]


def command(nums, call):
    appends = "".join(".append(%d)" % n for n in nums)
    return "array" + appends + "." + call


def run_sort(sort, nums):
    return run(command(nums, sort + "()"))


class ArraySortsTest(unittest.TestCase):
    def test_moves_describe_exactly_what_changed_between_frames(self):
        table = [[5, 3, 9, 1, 7, 2], [9, 8, 7, 6, 5, 4, 3, 2, 1], [1, 2, 3, 4], [2, 2, 1, 1, 3]]
        for sort in SORTS:
            for nums in table:
                with self.subTest(sort=sort, nums=nums):
                    frames = run(command(nums, "%s()" % sort))["frames"]
                    frames = [f for f in frames if f["call"] == len(nums)]
                    current = list(nums)
                    for frame in frames:
                        for move in (frame["aux"] or {}).get("moves", []):
                            i, j = move["from"], move["to"]
                            self.assertNotEqual(i, j)
                            if move["kind"] == "swap":
                                current[i], current[j] = current[j], current[i]
                            else:
                                self.assertEqual(move["kind"], "insert")
                                current.insert(j, current.pop(i))
                        self.assertEqual(frame["state"]["data"][: len(nums)], current)

    def test_a_sort_that_moves_something_records_arrows(self):
        for sort in SORTS:
            with self.subTest(sort=sort):
                frames = run(command([3, 2, 1], "%s()" % sort))["frames"]
                self.assertTrue(any(f["aux"] and f["aux"]["moves"] for f in frames))

    def each_case(self):
        for sort in SORTS:
            for nums in TABLE:
                yield sort, nums

    def test_catalog_has_no_argument_methods_with_metadata(self):
        from commands.structures.array import CATALOG

        for sort in SORTS:
            method = CATALOG["methods"][sort]
            self.assertEqual(method["args"], [])
            self.assertTrue(method["complexity"])
            self.assertTrue(method["summary"])
        self.assertEqual(CATALOG["methods"]["bubble_sort"]["complexity"], "O(n^2)")
        self.assertEqual(CATALOG["methods"]["merge_sort"]["complexity"], "O(n log n)")
        self.assertIn("O(n^2)", CATALOG["methods"]["quick_sort"]["complexity"])

    def test_result_and_final_state_are_sorted(self):
        for sort, nums in self.each_case():
            if not nums:
                continue
            r = run_sort(sort, nums)
            self.assertTrue(r["success"], r["error"])
            self.assertEqual(r["result"], sorted(nums))
            state = r["state"]
            self.assertEqual(state["data"][: len(nums)], sorted(nums))
            self.assertTrue(all(v is None for v in state["data"][len(nums) :]))
            plain = run(command(nums, "get(0)"))["state"]
            self.assertEqual(
                (state["size"], state["capacity"], state["resizes"]),
                (plain["size"], plain["capacity"], plain["resizes"]),
            )

    def test_empty_array_errors(self):
        for sort in SORTS:
            r = run("array." + sort + "()")
            self.assertFalse(r["success"])
            self.assertEqual(r["code"], "runtime_error")
            self.assertEqual(r["error"], "array is empty")

    def test_string_errors(self):
        for sort in SORTS:
            r = run('array.append(3).append("a").append(1).' + sort + "()")
            self.assertEqual(r["code"], "runtime_error")
            self.assertEqual(r["error"], "this algorithm needs an array of numbers only")

    def test_later_calls_see_the_sort(self):
        for sort in SORTS:
            r = run("array.append(3).append(1)." + sort + "().get(0)")
            self.assertEqual(r["result"], 1)
            r = run("array.append(3).append(1)." + sort + "().get(1)")
            self.assertEqual(r["result"], 3)

    def test_two_sum_sorted_works_after_sort(self):
        for sort in SORTS:
            r = run(command([7, 1, 5, 3], sort + "().two_sum_sorted(8)"))
            self.assertTrue(r["success"], r["error"])
            self.assertEqual(r["result"], [0, 3])

    def test_single_element_is_one_sorted_frame(self):
        for sort in SORTS:
            r = run_sort(sort, [5])
            frames = [f for f in r["frames"] if f["call"] == 1]
            self.assertEqual(len(frames), 1)
            self.assertEqual(frames[0]["note"], "Sorted")

    def test_last_frame_is_sorted_without_marks(self):
        for sort, nums in self.each_case():
            if not nums:
                continue
            last = run_sort(sort, nums)["frames"][-1]
            self.assertEqual(last["note"], "Sorted")
            self.assertEqual(last["pointers"], {})
            self.assertEqual(last["highlight"], [])
            self.assertEqual(last["state"]["data"][: len(nums)], sorted(nums))

    def test_frames_keep_size_and_values(self):
        for sort, nums in self.each_case():
            if not nums:
                continue
            frames = [f for f in run_sort(sort, nums)["frames"] if f["call"] == len(nums)]
            self.assertTrue(frames)
            ids = {id(f["state"]) for f in frames}
            self.assertEqual(len(ids), len(frames))
            for f in frames:
                s = f["state"]
                self.assertEqual(set(s), {"data", "size", "capacity", "resizes"})
                self.assertEqual(s["size"], len(nums))
                self.assertEqual(sorted(s["data"][: len(nums)]), sorted(nums))
                self.assertTrue(all(v is None for v in s["data"][len(nums) :]))
                self.assertIsInstance(f["note"], str)
                self.assertTrue(f["note"])

    def test_pointers_and_highlights_in_range(self):
        for sort, nums in self.each_case():
            if not nums:
                continue
            for f in run_sort(sort, nums)["frames"][len(nums) :]:
                for i in f["highlight"]:
                    self.assertTrue(0 <= i < len(nums), (i, f["note"]))
                for name, i in f["pointers"].items():
                    self.assertTrue(0 <= i < len(nums), (name, i, f["note"]))

    def test_animation_uses_marks(self):
        r = run_sort("bubble_sort", [5, 3])
        f = r["frames"][-2]
        self.assertEqual(f["note"], "Compare 5 and 3: out of order, swap them")
        self.assertEqual(f["pointers"], {"i": 0, "j": 1})
        self.assertEqual(f["highlight"], [0, 1])
        self.assertEqual(f["state"]["data"][:2], [3, 5])
        pivot = run_sort("quick_sort", [1, 9, 7])["frames"]
        self.assertTrue(any(f["note"] == "Pivot is 7" for f in pivot))
        notes = [f["note"] for f in run_sort("merge_sort", [2, 1, 4, 3])["frames"]]
        self.assertIn("Merge the two sorted halves", notes)

    def test_frame_limit_cases(self):
        reversed40 = list(range(40, 0, -1))
        for sort in ["bubble_sort", "selection_sort", "insertion_sort", "quick_sort"]:
            r = run_sort(sort, reversed40)
            self.assertTrue(r["success"], (sort, r["error"]))
            self.assertEqual(r["result"], sorted(reversed40))
            self.assertLessEqual(len(r["frames"]), MAX_FRAMES)
        for sort in ["merge_sort", "heap_sort"]:
            for nums in (list(range(64, 0, -1)), [(i * 37) % 64 for i in range(64)]):
                r = run_sort(sort, nums)
                self.assertTrue(r["success"], (sort, r["error"]))
                self.assertEqual(r["result"], sorted(nums))

    def test_too_many_frames_is_a_clean_failure(self):
        r = run_sort("bubble_sort", list(range(64, 0, -1)))
        self.assertFalse(r["success"])
        self.assertEqual(r["code"], "too_many_frames")

    def test_deterministic(self):
        for sort, nums in self.each_case():
            self.assertEqual(run_sort(sort, nums), run_sort(sort, nums))


if __name__ == "__main__":
    unittest.main()
