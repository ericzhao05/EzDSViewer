import { NOTES, repeatReason, withNotes, searchNotes } from './algorithmNotes';

const MSG = 'Already ran on this array. Change the array first.';
const IDS = ['two_sum_sorted', 'binary_search', 'max_subarray', 'prefix_sums', 'bubble_sort', 'selection_sort', 'insertion_sort', 'merge_sort', 'quick_sort', 'heap_sort'];

describe('NOTES', () => {
  test('covers all ten items with needs, cost, kind and tags', () => {
    expect(Object.keys(NOTES).sort()).toEqual([...IDS].sort());
    IDS.forEach((id) => {
      const n = NOTES[id];
      expect(typeof n.needs).toBe('string');
      expect(typeof n.cost).toBe('string');
      expect(['search', 'sum', 'sort']).toContain(n.kind);
      expect(n.tags.length).toBeGreaterThan(0);
      n.tags.forEach((t) => expect(t).toBe(t.toLowerCase()));
    });
  });

  test('keeps the old texts verbatim and the right kinds', () => {
    expect(NOTES.two_sum_sorted.needs).toBe('A sorted array of numbers, and a target.');
    expect(NOTES.two_sum_sorted.cost).toBe('It looks at each value at most once.');
    expect(NOTES.binary_search.cost).toBe('Each step halves what is left, so 1,000 values take about 10 steps.');
    expect(NOTES.max_subarray.needs).toBe('At least one number. There is nothing to fill in.');
    expect(NOTES.prefix_sums.needs).toBe('Numbers only. There is nothing to fill in.');
    expect(NOTES.prefix_sums.cost).toBe('It walks the array once.');
    expect(NOTES.binary_search.kind).toBe('search');
    expect(NOTES.two_sum_sorted.kind).toBe('search');
    expect(NOTES.max_subarray.kind).toBe('sum');
    expect(NOTES.prefix_sums.kind).toBe('sum');
    expect(NOTES.heap_sort.kind).toBe('sort');
  });

  test('has the specific tags', () => {
    expect(NOTES.merge_sort.tags).toEqual(expect.arrayContaining(['sort', 'divide and conquer', 'recursion']));
    expect(NOTES.quick_sort.tags).toEqual(expect.arrayContaining(['divide and conquer', 'recursion']));
    expect(NOTES.heap_sort.tags).toEqual(expect.arrayContaining(['heap', 'priority queue']));
    expect(NOTES.two_sum_sorted.tags).toEqual(expect.arrayContaining(['pointers', 'two pointers', 'pair', 'target']));
    expect(NOTES.binary_search.tags).toEqual(expect.arrayContaining(['halving', 'log n', 'sorted', 'search', 'find']));
    expect(NOTES.max_subarray.tags).toEqual(expect.arrayContaining(['kadane', 'subarray', 'largest sum', 'dynamic programming']));
    expect(NOTES.prefix_sums.tags).toEqual(expect.arrayContaining(['running total', 'cumulative', 'range sum']));
    expect(NOTES.bubble_sort.tags).toEqual(expect.arrayContaining(['sort', 'sorting', 'ordering', 'swap', 'comparison']));
  });
});

describe('repeatReason', () => {
  test.each([
    [['append(1)', 'two_sum_sorted(1)'], 'two_sum_sorted', MSG],
    [['append(1)', 'two_sum_sorted(1)', 'get(0)'], 'two_sum_sorted', MSG],
    [['append(1)', 'two_sum_sorted(1)', 'append(2)'], 'two_sum_sorted', null],
    [['append(1)', 'two_sum_sorted(1)', 'binary_search(1)'], 'two_sum_sorted', null],
    [['append(1)', 'bubble_sort()'], 'bubble_sort', MSG],
    [['append(1)', 'bubble_sort()'], 'merge_sort', null],
    [['append(1)', 'two_sum_sorted(1)'], 'two_sum_sorted', MSG],
    [['two_sum_sorted(1)', 'get(0)', 'get(1)'], 'two_sum_sorted', MSG],
    [['two_sum_sorted(1)', 'pop()'], 'two_sum_sorted', null],
    [['two_sum_sorted(1)', 'insert(0, 1)'], 'two_sum_sorted', null],
    [['two_sum_sorted(1)', 'reset()'], 'two_sum_sorted', null],
    [['two_sum_sorted(1)', 'mystery(3)'], 'two_sum_sorted', null],
    [[], 'two_sum_sorted', null],
    [['get(0)'], 'max_subarray', null],
  ])('%j then %s', (calls, id, expected) => {
    expect(repeatReason(calls, id)).toBe(expected);
  });

  test('two sum with a different target is still blocked', () => {
    expect(repeatReason(['append(1)', 'two_sum_sorted(1)'], 'two_sum_sorted')).toBe(MSG);
  });

  test('parses text before the first parenthesis and survives odd input', () => {
    expect(repeatReason(['append("(x)")', 'bubble_sort()'], 'bubble_sort')).toBe(MSG);
    expect(repeatReason(['', 'weird'], 'bubble_sort')).toBeNull();
    expect(() => repeatReason(['(', 5, null], 'bubble_sort')).not.toThrow();
  });
});

describe('withNotes', () => {
  const mk = (id, extra = {}) => ({ id, label: id, summary: 's', complexity: 'O(n)', inputs: [], blockedReason: null, run: jest.fn(), ...extra });

  test('adds notes in order without mutating', () => {
    const items = [mk('bubble_sort'), mk('merge_sort')];
    const copy = items.map((i) => ({ ...i }));
    const out = withNotes(items, []);
    expect(out.map((i) => i.id)).toEqual(['bubble_sort', 'merge_sort']);
    expect(out[0]).toMatchObject(NOTES.bubble_sort);
    expect(out[0]).not.toBe(items[0]);
    expect(items[0]).toEqual(copy[0]);
    expect(items[0].needs).toBeUndefined();
  });

  test('blocks a repeat and replaces run with a no-op', () => {
    const items = [mk('bubble_sort'), mk('merge_sort')];
    const out = withNotes(items, ['append(1)', 'bubble_sort()']);
    expect(out[0].blockedReason).toBe(MSG);
    expect(out[0].run).not.toBe(items[0].run);
    out[0].run();
    expect(items[0].run).not.toHaveBeenCalled();
    expect(out[1].blockedReason).toBeNull();
    expect(out[1].run).toBe(items[1].run);
    expect(items[0].blockedReason).toBeNull();
  });

  test('keeps an existing blockedReason and its run', () => {
    const item = mk('bubble_sort', { blockedReason: 'Needs numbers only' });
    const [out] = withNotes([item], ['bubble_sort()']);
    expect(out.blockedReason).toBe('Needs numbers only');
    expect(out.run).toBe(item.run);
  });
});

describe('searchNotes', () => {
  const items = withNotes([
    { id: 'two_sum_sorted', label: 'Two sum', summary: 'Find two numbers that add up to the target.', complexity: 'O(n)', blockedReason: null, run() {} },
    { id: 'binary_search', label: 'Binary search', summary: 'Find the target by halving the search range.', complexity: 'O(log n)', blockedReason: null, run() {} },
    { id: 'merge_sort', label: 'Merge sort', summary: 'Split, sort halves, merge.', complexity: 'O(n log n)', blockedReason: null, run() {} },
    { id: 'quick_sort', label: 'Quick sort', summary: 'Partition around a pivot.', complexity: 'O(n log n), O(n²) at worst', blockedReason: null, run() {} },
  ], []);
  const ids = (r) => r.map((i) => i.id);

  test('empty or blank query returns all in order', () => {
    expect(ids(searchNotes(items, ''))).toEqual(ids(items));
    expect(ids(searchNotes(items, '   '))).toEqual(ids(items));
  });

  test('is case-insensitive and trims', () => {
    expect(ids(searchNotes(items, '  MERGE '))).toEqual(['merge_sort']);
  });

  test('every word must match somewhere', () => {
    expect(ids(searchNotes(items, 'sort recursion'))).toEqual(['merge_sort', 'quick_sort']);
    expect(ids(searchNotes(items, 'merge halving'))).toEqual([]);
  });

  test('matches tags, kind, complexity and needs', () => {
    expect(ids(searchNotes(items, 'pointers'))).toEqual(['two_sum_sorted']);
    expect(ids(searchNotes(items, 'pivot'))).toEqual(['quick_sort']);
    expect(ids(searchNotes(items, 'log n'))).toEqual(expect.arrayContaining(['binary_search', 'merge_sort']));
    expect(ids(searchNotes(items, 'sorted array of numbers'))).toEqual(expect.arrayContaining(['two_sum_sorted', 'binary_search']));
  });

  test('label matches come first, then the original order', () => {
    // "search" is in the label of binary_search, only tags of two_sum_sorted
    expect(ids(searchNotes(items, 'search'))).toEqual(['binary_search', 'two_sum_sorted']);
  });

  test('does not throw on regex characters', () => {
    ['(', '[', '*', '\\', '.*', 'O(n²)', '?', '+'].forEach((q) => expect(() => searchNotes(items, q)).not.toThrow());
    expect(ids(searchNotes(items, 'O(n²)'))).toEqual(['quick_sort']);
    expect(ids(searchNotes(items, '.*'))).toEqual([]);
  });
});
