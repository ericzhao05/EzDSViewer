const SORTS = ['bubble_sort', 'selection_sort', 'insertion_sort', 'merge_sort', 'quick_sort', 'heap_sort'];
const READS_ONLY = ['get', 'two_sum_sorted', 'binary_search', 'max_subarray', 'prefix_sums'];

const methodOf = (call) => String(call).split('(')[0];

// The calls a new sort should build on, so sorts run one after another all start from the same
// unsorted array: everything from the last sort on goes, unless the array has been edited since.
// Anything unknown counts as an edit, so nothing is dropped by mistake.
export function callsBeforeLastSort(calls) {
  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const method = methodOf(calls[i]);
    if (SORTS.includes(method)) return calls.slice(0, i);
    if (!READS_ONLY.includes(method)) return calls;
  }
  return calls;
}
