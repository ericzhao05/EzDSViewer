import { renderHook, act } from '@testing-library/react';
import useArrayControls from './useArrayControls';

function sessionWith(values, extra = {}) {
  const data = [...values];
  while (data.length < Math.max(2, values.length)) data.push(null);
  const calls = extra.calls || [];
  return {
    state: { data, size: values.length, capacity: data.length, resizes: 0 },
    calls,
    frames: extra.frames || [],
    loading: false,
    canUndo: calls.length > 0,
    runCall: jest.fn(),
    undo: jest.fn(),
    startOver: jest.fn(),
    goTo: jest.fn(),
    frame: extra.frame === undefined ? null : extra.frame,
  };
}

const find = (c, id) => [...c.operations, ...c.algorithms].find((o) => o.id === id);
const reasons = (c) => Object.fromEntries([...c.operations, ...c.algorithms].map((o) => [o.id, o.blockedReason]));

test('lists the four operations and four algorithms with the described fields', () => {
  const { result } = renderHook(() => useArrayControls(sessionWith([1, 2])));
  expect(result.current.operations.map((o) => o.label)).toEqual(['Append', 'Insert', 'Pop', 'Get']);
  expect(result.current.algorithms.map((o) => o.label)).toEqual(['Two sum', 'Binary search', 'Max subarray', 'Prefix sums']);
  [...result.current.operations, ...result.current.algorithms].forEach((o) => {
    expect(typeof o.summary).toBe('string');
    expect(typeof o.complexity).toBe('string');
    expect(typeof o.run).toBe('function');
    expect(Array.isArray(o.inputs)).toBe(true);
  });
});

describe('blockedReason', () => {
  test('nothing is blocked for a sorted array of numbers', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1, 3, 5])));
    Object.values(reasons(result.current)).forEach((r) => expect(r).toBeNull());
  });

  test('an unsorted array blocks two sum and binary search only', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([3, 1, 2])));
    const r = reasons(result.current);
    expect(r.two_sum_sorted).toBe('Needs a sorted array');
    expect(r.binary_search).toBe('Needs a sorted array');
    expect(r.max_subarray).toBeNull();
    expect(r.prefix_sums).toBeNull();
  });

  test('a string blocks all four algorithms', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1, 'a'])));
    const r = reasons(result.current);
    ['two_sum_sorted', 'binary_search', 'max_subarray', 'prefix_sums'].forEach((id) => {
      expect(r[id]).toBe('Needs numbers only');
    });
    expect(r.append).toBeNull();
  });

  test('an empty array blocks pop, get and max subarray', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([])));
    const r = reasons(result.current);
    expect(r.pop).toBe('Array is empty');
    expect(r.get).toBe('Array is empty');
    expect(r.max_subarray).toBe('Needs at least one value');
    expect(r.append).toBeNull();
  });

  test('64 elements blocks append and insert', () => {
    const full = Array.from({ length: 64 }, (_, i) => i);
    const { result } = renderHook(() => useArrayControls(sessionWith(full)));
    expect(reasons(result.current).append).toBe('Array is full');
    expect(reasons(result.current).insert).toBe('Array is full');
    const { result: almost } = renderHook(() => useArrayControls(sessionWith(full.slice(0, 63))));
    expect(reasons(almost.current).append).toBeNull();
  });

  test('a blocked run does nothing', () => {
    const s = sessionWith([]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => find(result.current, 'pop').run());
    act(() => find(result.current, 'max_subarray').run());
    expect(s.runCall).not.toHaveBeenCalled();
  });
});

describe('per-operation inputs', () => {
  test('each operation has its own inputs', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    const labels = (id) => find(result.current, id).inputs.map((i) => i.label);
    expect(labels('append')).toEqual(['Value']);
    expect(labels('insert')).toEqual(['Index', 'Value']);
    expect(labels('pop')).toEqual(['Index']);
    expect(labels('get')).toEqual(['Index']);
    expect(labels('two_sum_sorted')).toEqual(['Target']);
    expect(labels('binary_search')).toEqual(['Target']);
    expect(labels('max_subarray')).toEqual([]);
  });

  test('typing in one input leaves the others alone', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    act(() => find(result.current, 'append').inputs[0].setValue('7'));
    expect(find(result.current, 'append').inputs[0].value).toBe('7');
    expect(find(result.current, 'insert').inputs[1].value).toBe('');
    expect(find(result.current, 'two_sum_sorted').inputs[0].value).toBe('');
  });

  test('run builds the call from that operation inputs', () => {
    const s = sessionWith([1, 2]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => { const [i, v] = find(result.current, 'insert').inputs; i.setValue('1'); v.setValue('x'); });
    act(() => find(result.current, 'insert').run());
    expect(s.runCall).toHaveBeenLastCalledWith('insert(1, "x")');
    act(() => find(result.current, 'pop').run());
    expect(s.runCall).toHaveBeenLastCalledWith('pop()');
    act(() => find(result.current, 'pop').inputs[0].setValue('0'));
    act(() => find(result.current, 'pop').run());
    expect(s.runCall).toHaveBeenLastCalledWith('pop(0)');
    act(() => find(result.current, 'binary_search').inputs[0].setValue('2'));
    act(() => find(result.current, 'binary_search').run());
    expect(s.runCall).toHaveBeenLastCalledWith('binary_search(2)');
  });

  test('missing input sets a message and sends nothing', () => {
    const s = sessionWith([1]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => find(result.current, 'append').run());
    expect(result.current.message).toBe('Enter a value first.');
    act(() => find(result.current, 'get').run());
    expect(result.current.message).toBe('Enter a whole-number index first.');
    act(() => find(result.current, 'two_sum_sorted').run());
    expect(result.current.message).toBe('Enter a whole-number target first.');
    expect(s.runCall).not.toHaveBeenCalled();
  });
});

describe('history', () => {
  const frames = [{ call: 0 }, { call: 1 }, { call: 1 }, { call: 1 }];
  test('lists each call with its first frame', () => {
    const s = sessionWith([1], { calls: ['append(1)', 'max_subarray()'], frames });
    const { result } = renderHook(() => useArrayControls(s));
    expect(result.current.history).toEqual([
      { index: 0, call: 'append(1)', firstFrame: 0, active: false },
      { index: 1, call: 'max_subarray()', firstFrame: 1, active: false },
    ]);
  });

  test('goToCall moves to that call first frame', () => {
    const s = sessionWith([1], { calls: ['append(1)', 'max_subarray()'], frames });
    const { result } = renderHook(() => useArrayControls(s));
    act(() => result.current.goToCall(1));
    expect(s.goTo).toHaveBeenCalledWith(1);
    act(() => result.current.goToCall(5));
    expect(s.goTo).toHaveBeenCalledTimes(1);
  });
});

test('undo, canUndo, startOver and disabled come from the session', () => {
  const s = sessionWith([1], { calls: ['append(1)'] });
  const { result } = renderHook(() => useArrayControls(s));
  expect(result.current.canUndo).toBe(true);
  expect(result.current.disabled).toBe(false);
  result.current.undo();
  expect(s.undo).toHaveBeenCalled();
  act(() => result.current.startOver());
  expect(s.startOver).toHaveBeenCalled();
});

describe('what layouts need', () => {
  const frames = [{ call: 0 }, { call: 1 }, { call: 1 }];
  const calls = ['append(1)', 'max_subarray()'];

  test('activeCall and history[i].active follow the frame on screen', () => {
    const s = sessionWith([1], { calls, frames, frame: frames[2] });
    const { result } = renderHook(() => useArrayControls(s));
    expect(result.current.activeCall).toBe(1);
    expect(result.current.history.map((h) => h.active)).toEqual([false, true]);
    const none = renderHook(() => useArrayControls(sessionWith([])));
    expect(none.result.current.activeCall).toBeNull();
  });

  test('inputs say what kind of field they need', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    const kinds = (id) => find(result.current, id).inputs.map((i) => i.kind);
    expect(kinds('append')).toEqual(['value']);
    expect(kinds('insert')).toEqual(['number', 'value']);
    expect(kinds('pop')).toEqual(['optional-number']);
    expect(kinds('get')).toEqual(['number']);
    expect(kinds('two_sum_sorted')).toEqual(['number']);
    expect(kinds('binary_search')).toEqual(['number']);
  });

  test('each item has its own message, and controls.message keeps the last one', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1])));
    expect(find(result.current, 'append').message).toBe('');
    act(() => find(result.current, 'append').run());
    expect(find(result.current, 'append').message).toBe('Enter a value first.');
    expect(find(result.current, 'get').message).toBe('');
    expect(result.current.message).toBe('Enter a value first.');
    act(() => find(result.current, 'get').run());
    expect(find(result.current, 'append').message).toBe('');
    expect(find(result.current, 'get').message).toBe('Enter a whole-number index first.');
  });

  test('runUnchecked sends even when the item is blocked', () => {
    const s = sessionWith([]);
    const { result } = renderHook(() => useArrayControls(s));
    act(() => find(result.current, 'pop').runUnchecked());
    expect(s.runCall).toHaveBeenCalledWith('pop()');
  });
});

describe('sorts', () => {
  const ids = ['bubble_sort', 'selection_sort', 'insertion_sort', 'merge_sort', 'quick_sort', 'heap_sort'];
  const sr = (c) => Object.fromEntries(c.sorts.map((o) => [o.id, o.blockedReason]));
  const range = (n) => Array.from({ length: n }, (_, i) => n - i);

  test('lists six sorts with labels and complexity', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([2, 1])));
    expect(result.current.sorts.map((o) => o.id)).toEqual(ids);
    expect(result.current.sorts.map((o) => o.label)).toEqual([
      'Bubble sort', 'Selection sort', 'Insertion sort', 'Merge sort', 'Quick sort', 'Heap sort',
    ]);
    expect(result.current.sorts.map((o) => o.complexity)).toEqual([
      'O(n²)', 'O(n²)', 'O(n²)', 'O(n log n)', 'O(n log n), O(n²) at worst', 'O(n log n)',
    ]);
    result.current.sorts.forEach((o) => {
      expect(typeof o.summary).toBe('string');
      expect(o.inputs).toEqual([]);
      expect(typeof o.run).toBe('function');
    });
  });

  test('what is allowed follows the newest array, not the step on screen', () => {
    const session = sessionWith([3, 1]);
    session.latestState = { data: [1, 3], size: 2, capacity: 2, resizes: 0 };
    const { result } = renderHook(() => useArrayControls(session));
    expect(result.current.algorithms.find((a) => a.id === 'two_sum_sorted').blockedReason).toBeNull();
  });

  test('run sends the call with no arguments, built on the calls before any earlier sort', () => {
    const session = sessionWith([2, 1]);
    const { result } = renderHook(() => useArrayControls(session));
    act(() => { result.current.sorts[3].run(); });
    expect(session.runCall).toHaveBeenCalledWith('merge_sort()', []);
  });

  test('nothing is blocked for a small numeric array, sorted or not', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([3, 1, 2])));
    Object.values(sr(result.current)).forEach((r) => expect(r).toBeNull());
  });

  test('a string blocks every sort and run does nothing', () => {
    const session = sessionWith([1, 'a']);
    const { result } = renderHook(() => useArrayControls(session));
    Object.values(sr(result.current)).forEach((r) => expect(r).toBe('Needs numbers only'));
    act(() => { result.current.sorts[0].run(); });
    expect(session.runCall).not.toHaveBeenCalled();
  });

  test('an empty array blocks every sort', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([])));
    Object.values(sr(result.current)).forEach((r) => expect(r).toBe('Needs at least one value'));
  });

  test('over 40 values blocks the slow sorts only', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith(range(41))));
    const r = sr(result.current);
    ['bubble_sort', 'selection_sort', 'insertion_sort', 'quick_sort'].forEach((id) => expect(r[id]).toBe('Needs 40 values or fewer'));
    ['merge_sort', 'heap_sort'].forEach((id) => expect(r[id]).toBeNull());
  });

  test('exactly 40 values is allowed', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith(range(40))));
    Object.values(sr(result.current)).forEach((r) => expect(r).toBeNull());
  });

  test('controls.algorithms is unchanged', () => {
    const { result } = renderHook(() => useArrayControls(sessionWith([1, 2])));
    expect(result.current.algorithms.map((o) => o.id)).toEqual(['two_sum_sorted', 'binary_search', 'max_subarray', 'prefix_sums']);
  });
});
