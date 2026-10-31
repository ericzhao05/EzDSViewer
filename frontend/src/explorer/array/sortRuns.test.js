import { callsBeforeLastSort } from './sortRuns';

test.each([
  ['nothing yet', [], []],
  ['no sort', ['append(1)', 'append(2)'], ['append(1)', 'append(2)']],
  ['the last call is a sort', ['append(2)', 'append(1)', 'bubble_sort()'], ['append(2)', 'append(1)']],
  ['reads and algorithms after the sort go too', ['append(1)', 'bubble_sort()', 'two_sum_sorted(3)', 'get(0)'], ['append(1)']],
  ['an edit after the sort keeps it', ['append(1)', 'bubble_sort()', 'append(0)'], ['append(1)', 'bubble_sort()', 'append(0)']],
  ['only the latest sort goes', ['append(2)', 'bubble_sort()', 'pop()', 'merge_sort()'], ['append(2)', 'bubble_sort()', 'pop()']],
  ['an unknown call counts as an edit', ['bubble_sort()', 'mystery()'], ['bubble_sort()', 'mystery()']],
])('%s', (_, calls, expected) => {
  expect(callsBeforeLastSort(calls)).toEqual(expected);
});
